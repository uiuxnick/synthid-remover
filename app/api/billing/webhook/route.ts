import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
  applySubscriptionCharge,
  endSubscription,
  fulfillTopup,
  markPaymentFailed,
} from '@/lib/billing';
import { verifyWebhookSignature } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/**
 * Razorpay webhook. Reads the RAW body (signature is over exact bytes), verifies HMAC, then records
 * the event id first, then handles it. If the handler throws, the id is deleted so Razorpay's
 * retry reprocesses it; a duplicate delivery hits the PK and is acknowledged. Handlers are
 * themselves idempotent, so a crash between steps cannot double-grant credits.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const eventId = req.headers.get('x-razorpay-event-id');

  let valid = false;
  try {
    valid = !!signature && verifyWebhookSignature(raw, signature);
  } catch {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
  }
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  if (!eventId) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

  let evt: any;
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad JSON' }, { status: 400 });
  }
  const event: string = evt?.event ?? '';

  try {
    await prisma.webhookEvent.create({ data: { id: eventId, event, payload: evt as Prisma.InputJsonValue } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw e;
  }

  try {
    const payment = evt?.payload?.payment?.entity;
    const sub = evt?.payload?.subscription?.entity;

    switch (event) {
      case 'payment.captured':
        // Subscription payments also emit this; they are handled by subscription.charged.
        if (payment?.order_id && !payment?.invoice_id) {
          await fulfillTopup(payment.order_id, payment.id);
        }
        break;
      case 'subscription.charged':
        if (sub?.id && payment?.id) {
          await applySubscriptionCharge({
            subscriptionId: sub.id,
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: payment.amount,
            periodStart: sub.current_start,
            periodEnd: sub.current_end,
          });
        }
        break;
      case 'subscription.cancelled':
        if (sub?.id) await endSubscription(sub.id, 'CANCELLED');
        break;
      case 'subscription.completed':
        if (sub?.id) await endSubscription(sub.id, 'COMPLETED');
        break;
      case 'subscription.halted':
        if (sub?.id) await endSubscription(sub.id, 'HALTED');
        break;
      case 'payment.failed':
        if (payment?.order_id) await markPaymentFailed(payment.order_id, payment.error_description);
        break;
      default:
        break; // acknowledged, nothing to do
    }
  } catch (e) {
    console.error('webhook handler', event, e);
    // Roll back the idempotency record so Razorpay's retry reprocesses this event.
    await prisma.webhookEvent.delete({ where: { id: eventId } }).catch(() => {});
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
