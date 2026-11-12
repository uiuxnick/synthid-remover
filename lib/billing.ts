import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getAppConfig, grantCredits } from '@/lib/credits';
import { sendTemplated } from '@/lib/emailTemplates';

interface Receipt { userId: string; amount: number; credits: number }

async function sendReceipt(r: Receipt | null, paymentId: string): Promise<boolean> {
  if (!r) return false;
  const u = await prisma.user.findUnique({ where: { id: r.userId }, select: { email: true, name: true } });
  if (u?.email) {
    await sendTemplated('receipt', u.email, {
      name: u.name ?? 'there',
      amount: `₹${(r.amount / 100).toLocaleString('en-IN')}`,
      credits: String(r.credits),
      paymentId,
    });
  }
  return true;
}

/** Max credit packs per order, a sanity bound on amount. */
export const MAX_PACKS = 20;

/**
 * Marks a pending top-up order paid and grants credits exactly once.
 * The PENDING -> SUCCESS claim is a single conditional update, so checkout verify and the webhook
 * can race safely: only the winner grants credits.
 */
export async function fulfillTopup(orderId: string, paymentId: string, signature?: string): Promise<boolean> {
  const receipt = await prisma.$transaction(async (tx): Promise<Receipt | null> => {
    const txn = await tx.transaction.findUnique({ where: { razorpayOrderId: orderId } });
    if (!txn || txn.kind !== 'TOPUP') return null;
    const claim = await tx.transaction.updateMany({
      where: { id: txn.id, status: 'PENDING' },
      data: { status: 'SUCCESS', razorpayPaymentId: paymentId, razorpaySignature: signature },
    });
    if (claim.count === 0) return null; // already fulfilled
    await grantCredits(tx, {
      userId: txn.userId,
      amount: txn.creditsGranted,
      reason: 'PURCHASE',
      refId: txn.id,
    });
    return { userId: txn.userId, amount: txn.amount, credits: txn.creditsGranted };
  });
  return sendReceipt(receipt, paymentId);
}

/** Subscription charge (first payment or renewal). Idempotent on razorpayPaymentId. */
export async function applySubscriptionCharge(args: {
  subscriptionId: string; // razorpay sub id
  paymentId: string;
  orderId?: string | null;
  amount: number;
  periodStart?: number | null; // unix seconds
  periodEnd?: number | null;
  signature?: string;
}): Promise<boolean> {
  try {
    const receipt = await prisma.$transaction(async (tx): Promise<Receipt | null> => {
      const sub = await tx.subscription.findUnique({ where: { razorpaySubscriptionId: args.subscriptionId } });
      if (!sub) return null;
      if (await tx.transaction.findUnique({ where: { razorpayPaymentId: args.paymentId }, select: { id: true } })) {
        return null;
      }
      const cfg = await getAppConfig();
      const annual = !!cfg.razorpayPlanProAnnual && sub.planId === cfg.razorpayPlanProAnnual;
      const credits = cfg.proMonthlyCredits * (annual ? 12 : 1);

      const created = await tx.transaction.create({
        data: {
          userId: sub.userId,
          subscriptionId: sub.id,
          kind: 'SUBSCRIPTION',
          razorpayOrderId: args.orderId || `sub:${args.paymentId}`,
          razorpayPaymentId: args.paymentId,
          razorpaySignature: args.signature,
          amount: args.amount,
          creditsGranted: credits,
          status: 'SUCCESS',
        },
      });
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: args.periodStart ? new Date(args.periodStart * 1000) : undefined,
          currentPeriodEnd: args.periodEnd ? new Date(args.periodEnd * 1000) : undefined,
        },
      });
      await tx.user.update({ where: { id: sub.userId }, data: { tier: 'PRO' } });
      await grantCredits(tx, {
        userId: sub.userId,
        amount: credits,
        reason: 'SUBSCRIPTION_RENEWAL',
        refId: created.id,
      });
      return { userId: sub.userId, amount: args.amount, credits };
    });
    return await sendReceipt(receipt, args.paymentId);
  } catch (e) {
    // Lost a race on the unique razorpayPaymentId: the other writer already granted.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return false;
    throw e;
  }
}

/** Subscription ended (cancelled / completed / expired / halted): drop tier, keep remaining credits. */
export async function endSubscription(razorpaySubscriptionId: string, status: 'CANCELLED' | 'COMPLETED' | 'EXPIRED' | 'HALTED') {
  await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.findUnique({ where: { razorpaySubscriptionId } });
    if (!sub) return;
    await tx.subscription.update({ where: { id: sub.id }, data: { status } });
    const stillActive = await tx.subscription.count({
      where: { userId: sub.userId, status: 'ACTIVE', id: { not: sub.id } },
    });
    if (!stillActive) await tx.user.update({ where: { id: sub.userId }, data: { tier: 'FREE' } });
  });
}

export async function markPaymentFailed(orderId: string, reason?: string) {
  await prisma.transaction.updateMany({
    where: { razorpayOrderId: orderId, status: 'PENDING' },
    data: { status: 'FAILED', failureReason: reason?.slice(0, 300) },
  });
}
