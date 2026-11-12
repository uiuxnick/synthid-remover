import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/db';

export const KEY_PREFIX = 'sr_live_';

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex');

/** 256 bits of randomness, so a plain SHA-256 is sufficient (no need for a slow KDF). Shown once. */
export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = `${KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 4), keyHash: hashKey(key) };
}

export function bearerToken(req: Request): string | null {
  const m = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '');
  return m && m[1].startsWith(KEY_PREFIX) && m[1].length < 100 ? m[1] : null;
}

/** Resolves an active key to its (non-banned) owner, or null. Also bumps usage stats. */
export async function authenticateApiKey(req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const rec = await prisma.apiKey.findUnique({
    where: { keyHash: hashKey(token) },
    include: { user: { select: { id: true, role: true, tier: true, isBanned: true, email: true, name: true } } },
  });
  if (!rec || !rec.isActive || rec.user.isBanned) return null;
  // API access is an Enterprise feature (admins may test it).
  if (rec.user.tier !== 'ENTERPRISE' && rec.user.role !== 'ADMIN') return null;
  void prisma.apiKey
    .update({ where: { id: rec.id }, data: { lastUsedAt: new Date(), usageCount: { increment: 1 } } })
    .catch(() => {});
  return { keyId: rec.id, user: rec.user };
}
