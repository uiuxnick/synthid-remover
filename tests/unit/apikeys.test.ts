import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({ prisma: {} }));
import { KEY_PREFIX, bearerToken, generateApiKey, hashKey } from '@/lib/apikeys';

const req = (auth?: string) => new Request('http://x', { headers: auth ? { authorization: auth } : {} });

describe('api keys', () => {
  it('generates unique prefixed keys whose hash matches', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key.startsWith(KEY_PREFIX)).toBe(true);
    expect(a.key).not.toBe(b.key);
    expect(a.keyHash).toBe(hashKey(a.key));
    expect(a.keyHash).not.toContain(a.key);
    expect(a.prefix.length).toBeLessThan(a.key.length);
  });
  it('parses only well-formed bearer tokens', () => {
    const { key } = generateApiKey();
    expect(bearerToken(req(`Bearer ${key}`))).toBe(key);
    expect(bearerToken(req(`bearer ${key}`))).toBe(key);
    expect(bearerToken(req('Bearer something_else'))).toBeNull();
    expect(bearerToken(req(key))).toBeNull();
    expect(bearerToken(req())).toBeNull();
    expect(bearerToken(req(`Bearer ${KEY_PREFIX}${'a'.repeat(200)}`))).toBeNull();
  });
});
