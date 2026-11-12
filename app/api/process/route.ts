import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAppConfig } from '@/lib/credits';
import { CleanError, cleanAnonymous, cleanForUser, parseCleanForm } from '@/lib/cleanJob';
import { clientIp, consumeAnonTrial, rateLimit } from '@/lib/ratelimit';

export const dynamic = 'force-dynamic';

const tooMany = (retryAfter: number, message: string, code: string) =>
  NextResponse.json({ error: message, code }, { status: 429, headers: { 'Retry-After': String(retryAfter) } });

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user?.id ? session.user : null;
  const ip = clientIp(req);

  try {
    const cfg = await getAppConfig();
    const rl = await rateLimit(user ? `u:${user.id}` : `ip:${ip}`, cfg.rateLimitPerMin);
    if (!rl.ok) return tooMany(rl.retryAfter, 'Too many requests. Slow down.', 'RATE_LIMITED');

    const parsed = parseCleanForm(await req.formData());

    let result: { buffer: Buffer; telemetry: any; jobId?: string };
    if (user) {
      result = await cleanForUser({ user: { id: user.id, email: user.email, name: user.name }, req: parsed });
    } else {
      // Anonymous landing-page trial, enforced per IP on the server.
      if (!(await consumeAnonTrial(ip, cfg.anonTrialRuns))) {
        return NextResponse.json(
          { error: 'Free trial used up. Create an account to continue.', code: 'TRIAL_EXHAUSTED' },
          { status: 403 }
        );
      }
      result = await cleanAnonymous(parsed);
    }

    return NextResponse.json({
      success: true,
      filename: parsed.file.name,
      format: parsed.format,
      base64Image: `data:image/${parsed.format};base64,${result.buffer.toString('base64')}`,
      telemetry: result.telemetry,
      jobId: result.jobId ?? null,
    });
  } catch (error: any) {
    if (error instanceof CleanError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('Processing Error:', error);
    return NextResponse.json({ error: 'Failed to process image.' }, { status: 500 });
  }
}
