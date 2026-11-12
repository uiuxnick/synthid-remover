import type { LedgerReason, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const APP_CONFIG_ID = 'singleton';

/** Reads the singleton config, creating it with schema defaults on first use. */
export async function getAppConfig() {
  return prisma.appConfig.upsert({
    where: { id: APP_CONFIG_ID },
    create: { id: APP_CONFIG_ID },
    update: {},
  });
}

/**
 * Atomically adds credits and writes a ledger row. Must run inside a transaction
 * so the balance change and its audit entry commit together.
 */
export async function grantCredits(
  tx: Prisma.TransactionClient,
  args: { userId: string; amount: number; reason: LedgerReason; refId?: string; note?: string }
): Promise<number> {
  if (!Number.isInteger(args.amount) || args.amount <= 0) {
    throw new Error('grantCredits: amount must be a positive integer');
  }
  const user = await tx.user.update({
    where: { id: args.userId },
    data: { creditsBalance: { increment: args.amount } },
    select: { creditsBalance: true },
  });
  await tx.creditLedger.create({
    data: {
      userId: args.userId,
      delta: args.amount,
      balanceAfter: user.creditsBalance,
      reason: args.reason,
      refId: args.refId,
      note: args.note,
    },
  });
  return user.creditsBalance;
}

/** Idempotent: a user receives the signup bonus at most once. */
export async function grantSignupBonus(userId: string): Promise<void> {
  const config = await getAppConfig();
  if (config.freeCreditsOnSignup <= 0) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.creditLedger.findFirst({
      where: { userId, reason: 'SIGNUP_BONUS' },
      select: { id: true },
    });
    if (existing) return;
    await grantCredits(tx, {
      userId,
      amount: config.freeCreditsOnSignup,
      reason: 'SIGNUP_BONUS',
    });
  });
}

export class InsufficientCreditsError extends Error {
  constructor() {
    super('Insufficient credits');
  }
}

/**
 * Atomically deducts credits. The conditional updateMany makes the check-and-decrement a single
 * statement, so concurrent requests can never push the balance below zero (the DB CHECK is a backstop).
 */
export async function spendCredits(
  userId: string,
  amount: number,
  refId?: string,
  note?: string
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('spendCredits: amount must be a positive integer');
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.user.updateMany({
      where: { id: userId, creditsBalance: { gte: amount }, isBanned: false },
      data: { creditsBalance: { decrement: amount } },
    });
    if (count === 0) throw new InsufficientCreditsError();
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { creditsBalance: true } });
    await tx.creditLedger.create({
      data: { userId, delta: -amount, balanceAfter: user.creditsBalance, reason: 'JOB', refId, note },
    });
    return user.creditsBalance;
  });
}

/** Idempotent per refId: a failed job is refunded at most once. */
export async function refundJobCredits(userId: string, amount: number, jobId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const done = await tx.creditLedger.findFirst({
      where: { userId, reason: 'JOB_REFUND', refId: jobId },
      select: { id: true },
    });
    if (done) return;
    await grantCredits(tx, { userId, amount, reason: 'JOB_REFUND', refId: jobId });
  });
}
