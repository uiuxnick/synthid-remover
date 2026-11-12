import { createHash } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Upstash-backed limits when UPSTASH_REDIS_REST_* are set; otherwise a per-process in-memory
 * fallback. The fallback is fine for dev and a single instance, but it is NOT shared across
 * serverless instances, so production should configure Upstash.
 */
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;

let warned = false;
function warnOnce() {
  if (!warned && process.env.NODE_ENV === 'production') {
    warned = true;
    console.warn('[ratelimit] UPSTASH_REDIS_REST_* not set: using per-instance in-memory limits');
  }
}

const limiters = new Map<number, Ratelimit>();
const mem = new Map<string, { count: number; reset: number }>();

function memHit(key: string, windowMs: number): { count: number; reset: number } {
  const now = Date.now();
  if (mem.size > 10_000) for (const [k, v] of Array.from(mem.entries())) if (v.reset < now) mem.delete(k);
  let e = mem.get(key);
  if (!e || e.reset < now) {
    e = { count: 0, reset: now + windowMs };
    mem.set(key, e);
  }
  e.count++;
  return e;
}

export interface LimitResult { ok: boolean; retryAfter: number }

/** Sliding window of `perMin` requests per minute for `key`. Fails open if Redis is unreachable. */
export async function rateLimit(key: string, perMin: number): Promise<LimitResult> {
  if (redis) {
    try {
      let l = limiters.get(perMin);
      if (!l) {
        l = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(perMin, '1 m'), prefix: 'rl', analytics: false });
        limiters.set(perMin, l);
      }
      const r = await l.limit(key);
      return { ok: r.success, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
    } catch (e) {
      console.error('[ratelimit] redis error, failing open', e instanceof Error ? e.message : e);
      return { ok: true, retryAfter: 0 };
    }
  }
  warnOnce();
  const e = memHit(`rl:${key}`, 60_000);
  return { ok: e.count <= perMin, retryAfter: Math.max(1, Math.ceil((e.reset - Date.now()) / 1000)) };
}

/** Client IP. Assumes a trusted proxy (Vercel, Cloudflare, nginx) sets x-forwarded-for / x-real-ip. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  return (xff?.split(',')[0] ?? req.headers.get('x-real-ip') ?? 'unknown').trim();
}

const ipHash = (ip: string) =>
  createHash('sha256').update(`${process.env.AUTH_SECRET ?? ''}:${ip}`).digest('hex').slice(0, 32);

const TRIAL_WINDOW_S = 30 * 24 * 3600;

/**
 * Server-side anonymous trial: at most `max` runs per IP per 30 days. Only a hash of the IP is stored.
 * This is a speed bump (shared NATs and IP rotation exist), not identity proof; real usage needs an account.
 */
export async function consumeAnonTrial(ip: string, max: number): Promise<boolean> {
  const key = `trial:${ipHash(ip)}`;
  if (redis) {
    try {
      const n = await redis.incr(key);
      if (n === 1) await redis.expire(key, TRIAL_WINDOW_S);
      return n <= max;
    } catch (e) {
      console.error('[trial] redis error, failing open', e instanceof Error ? e.message : e);
      return true;
    }
  }
  warnOnce();
  return memHit(key, TRIAL_WINDOW_S * 1000).count <= max;
}

/** Test helper. */
export function __resetMemoryLimits() {
  mem.clear();
}
