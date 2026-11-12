import { NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/apikeys';
import { getAppConfig } from '@/lib/credits';
import { clientIp, rateLimit } from '@/lib/ratelimit';

const err = (status: number, code: string, message: string, headers?: Record<string, string>) =>
  NextResponse.json({ error: { code, message } }, { status, headers });

export const apiError = err;

/** Shared gate for every /api/v1 route: IP throttle (pre-auth), key auth, then per-key limit. */
export async function gate(req: Request) {
  const cfg = await getAppConfig();
  // Pre-auth IP limit stops key-guessing floods before touching the database.
  const ipRl = await rateLimit(`v1ip:${clientIp(req)}`, cfg.rateLimitPerMin * 2);
  if (!ipRl.ok) return { res: err(429, 'rate_limited', 'Too many requests.', { 'Retry-After': String(ipRl.retryAfter) }) };

  const ctx = await authenticateApiKey(req);
  if (!ctx) return { res: err(401, 'unauthorized', 'Missing, invalid or inactive API key (Enterprise plan required).') };

  const rl = await rateLimit(`v1key:${ctx.keyId}`, cfg.rateLimitPerMin);
  if (!rl.ok) return { res: err(429, 'rate_limited', 'Rate limit exceeded.', { 'Retry-After': String(rl.retryAfter) }) };
  return { ctx };
}
