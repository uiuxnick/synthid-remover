import { beforeEach, describe, expect, it } from 'vitest';
import { __resetMemoryLimits, consumeAnonTrial, rateLimit } from '@/lib/ratelimit';

beforeEach(() => __resetMemoryLimits());

describe('rate limit (in-memory fallback)', () => {
  it('allows up to the limit then blocks with a retry hint', async () => {
    for (let i = 0; i < 3; i++) expect((await rateLimit('k', 3)).ok).toBe(true);
    const blocked = await rateLimit('k', 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
  it('keys are independent', async () => {
    await rateLimit('a', 1);
    expect((await rateLimit('a', 1)).ok).toBe(false);
    expect((await rateLimit('b', 1)).ok).toBe(true);
  });
});

describe('anonymous trial', () => {
  it('permits exactly `max` runs per IP', async () => {
    expect(await consumeAnonTrial('1.2.3.4', 2)).toBe(true);
    expect(await consumeAnonTrial('1.2.3.4', 2)).toBe(true);
    expect(await consumeAnonTrial('1.2.3.4', 2)).toBe(false);
    expect(await consumeAnonTrial('5.6.7.8', 2)).toBe(true);
  });
  it('max 0 blocks everyone', async () => {
    expect(await consumeAnonTrial('9.9.9.9', 0)).toBe(false);
  });
});
