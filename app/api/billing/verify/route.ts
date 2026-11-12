import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { fulfillTopup } from '@/lib/billing';
import { verifyOrderSignature, verifySubscriptionSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

const bodySchema = z.union([
  z.object({
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
  z.object({
    razorpay_subscription_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
]);

/**
 * Called by the browser after Checkout succeeds. The signature proves Razorpay (not the client)
 * issued this payment; the webhook is the redundant path if the tab closes before we get here.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const b = parsed.data;

  if ('razorpay_order_id' in b) {
    const txn = await prisma.transaction.findUnique({
      where: { razorpayOrderId: b.razorpay_order_id },
      select: { userId: true },
    });
    if (!txn || txn.userId !== session.user.id) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!verifyOrderSignature(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature)) {
      return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
    }
    await fulfillTopup(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature);
    return NextResponse.json({ ok: true });
  }

  const sub = await prisma.subscription.findUnique({
    where: { razorpaySubscriptionId: b.razorpay_subscription_id },
    select: { userId: true },
  });
  if (!sub || sub.userId !== session.user.id) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  if (!verifySubscriptionSignature(b.razorpay_payment_id, b.razorpay_subscription_id, b.razorpay_signature)) {
    return NextResponse.json({ error: 'Signature mismatch' }, { status: 400 });
  }
  // Amount is unknown here; the subscription.charged webhook carries it. Mark authenticated so the
  // UI can show "activating" until that webhook lands.
  await prisma.subscription.updateMany({
    where: { razorpaySubscriptionId: b.razorpay_subscription_id, status: 'CREATED' },
    data: { status: 'AUTHENTICATED' },
  });
  return NextResponse.json({ ok: true, pending: true });
}
