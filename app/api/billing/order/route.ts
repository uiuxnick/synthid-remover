import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { getAppConfig } from '@/lib/credits';
import { MAX_PACKS } from '@/lib/billing';
import { rateLimit } from '@/lib/ratelimit';
import { createOrder, createSubscription, RazorpayConfigError } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

const bodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('topup'), packs: z.number().int().min(1).max(MAX_PACKS) }),
  z.object({ type: z.literal('subscription'), interval: z.enum(['monthly', 'annual']) }),
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const userId = session.user.id;
  if (!(await rateLimit(`billing:${userId}`, 10)).ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  try {
    const cfg = await getAppConfig();
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) throw new RazorpayConfigError('Razorpay is not configured');

    if (parsed.data.type === 'topup') {
      // Price and credits come from AppConfig, never from the client.
      const amount = cfg.creditPackPricePaise * parsed.data.packs;
      const credits = cfg.creditPackSize * parsed.data.packs;
      const order = await createOrder({
        amount,
        receipt: `topup_${userId.slice(-8)}_${Date.now()}`,
        notes: { userId, kind: 'TOPUP' },
      });
      await prisma.transaction.create({
        data: {
          userId,
          kind: 'TOPUP',
          razorpayOrderId: order.id,
          amount,
          currency: 'INR',
          creditsGranted: credits,
        },
      });
      return NextResponse.json({ keyId, kind: 'order', orderId: order.id, amount, currency: 'INR', credits });
    }

    const annual = parsed.data.interval === 'annual';
    const planId = annual ? cfg.razorpayPlanProAnnual : cfg.razorpayPlanProMonthly;
    if (!planId) return NextResponse.json({ error: 'This plan is not available yet' }, { status: 503 });

    const active = await prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'AUTHENTICATED'] } },
      select: { id: true },
    });
    if (active) return NextResponse.json({ error: 'You already have an active subscription' }, { status: 409 });

    // total_count is the number of billing cycles Razorpay will charge (up to 10 years of cycles).
    const sub = await createSubscription({
      planId,
      totalCount: annual ? 10 : 120,
      notes: { userId, interval: parsed.data.interval },
    });
    await prisma.subscription.create({
      data: { userId, razorpaySubscriptionId: sub.id, planId },
    });
    return NextResponse.json({ keyId, kind: 'subscription', subscriptionId: sub.id });
  } catch (e) {
    if (e instanceof RazorpayConfigError) {
      return NextResponse.json({ error: 'Payments are not available right now' }, { status: 503 });
    }
    console.error('billing/order', e);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
