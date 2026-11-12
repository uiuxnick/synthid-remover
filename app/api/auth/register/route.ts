import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { getAppConfig, grantCredits } from '@/lib/credits';
import { sendWelcome } from '@/lib/emailTemplates';
import { registerSchema } from '@/lib/validation';
import { clientIp, rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Per-IP throttle blunts signup spam and signup-bonus farming.
  const rl = await rateLimit(`register:${clientIp(req)}`, 5);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Too many attempts. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input.', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  try {
    const [passwordHash, config] = await Promise.all([bcrypt.hash(password, 12), getAppConfig()]);

    const userId = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash } });
      if (config.freeCreditsOnSignup > 0) {
        await grantCredits(tx, {
          userId: user.id,
          amount: config.freeCreditsOnSignup,
          reason: 'SIGNUP_BONUS',
        });
      }
      return user.id;
    });
    await sendWelcome(userId);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    // Unique violation on email. The unique index (not a pre-check) is what makes this race-safe.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }
    console.error('[register] failed', err);
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 });
  }
}
