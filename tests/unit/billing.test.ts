import { beforeEach, describe, expect, it, vi } from 'vitest';

/** Minimal in-memory Prisma double: enough to prove credits are granted exactly once. */
const state = vi.hoisted(() => ({
  txn: null as any,
  balance: 0,
  ledger: [] as any[],
}));

vi.mock('@/lib/emailTemplates', () => ({ sendTemplated: vi.fn() }));
vi.mock('@/lib/credits', () => ({
  getAppConfig: vi.fn(),
  grantCredits: vi.fn(async (_tx: unknown, a: { amount: number; userId: string; reason: string }) => {
    state.balance += a.amount;
    state.ledger.push(a);
    return state.balance;
  }),
}));
vi.mock('@/lib/db', () => {
  const tx = {
    transaction: {
      findUnique: vi.fn(async () => state.txn),
      updateMany: vi.fn(async ({ where, data }: any) => {
        if (state.txn && state.txn.id === where.id && state.txn.status === where.status) {
          Object.assign(state.txn, data);
          return { count: 1 };
        }
        return { count: 0 };
      }),
    },
  };
  return {
    prisma: {
      $transaction: async (cb: any) => cb(tx),
      user: { findUnique: vi.fn(async () => ({ email: 'u@example.com', name: 'U' })) },
    },
  };
});

import { fulfillTopup } from '@/lib/billing';

beforeEach(() => {
  state.balance = 0;
  state.ledger = [];
  state.txn = { id: 't1', userId: 'u1', kind: 'TOPUP', status: 'PENDING', amount: 9900, creditsGranted: 50 };
});

describe('fulfillTopup idempotency', () => {
  it('grants credits once even if checkout verify and webhook both fire', async () => {
    const [a, b] = await Promise.all([fulfillTopup('order_1', 'pay_1'), fulfillTopup('order_1', 'pay_1')]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    expect(state.balance).toBe(50);
    expect(state.ledger).toHaveLength(1);
    expect(state.txn.status).toBe('SUCCESS');
    expect(state.txn.razorpayPaymentId).toBe('pay_1');
  });
  it('ignores unknown orders', async () => {
    state.txn = null;
    expect(await fulfillTopup('nope', 'pay_x')).toBe(false);
    expect(state.balance).toBe(0);
  });
  it('does not grant for an already failed order', async () => {
    state.txn.status = 'FAILED';
    expect(await fulfillTopup('order_1', 'pay_1')).toBe(false);
    expect(state.balance).toBe(0);
  });
});
