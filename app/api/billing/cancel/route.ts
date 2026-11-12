import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { cancelSubscription } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/** Cancels at period end; the subscription.cancelled webhook flips the tier when it actually ends. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const sub = await prisma.subscription.findFirst({
    where: { userId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });
  if (!sub) return NextResponse.json({ error: 'No active subscription' }, { status: 404 });

  try {
    await cancelSubscription(sub.razorpaySubscriptionId, true);
    await prisma.subscription.update({ where: { id: sub.id }, data: { cancelAtPeriodEnd: true } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('billing/cancel', e);
    return NextResponse.json({ error: 'Could not cancel. Try again or contact support.' }, { status: 502 });
  }
}
