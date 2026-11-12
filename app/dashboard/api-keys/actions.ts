'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { generateApiKey } from '@/lib/apikeys';

const MAX_ACTIVE_KEYS = 5;

export type CreateKeyState = { key?: string; error?: string };

export async function createApiKey(_prev: CreateKeyState, fd: FormData): Promise<CreateKeyState> {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({ where: { id: sessionUser.id }, select: { tier: true, role: true, isBanned: true } });
  if (!user || user.isBanned || (user.tier !== 'ENTERPRISE' && user.role !== 'ADMIN')) {
    return { error: 'API keys are available on the Enterprise plan.' };
  }
  const name = String(fd.get('name') ?? '').trim().slice(0, 60);
  if (!name) return { error: 'Give the key a name.' };
  const active = await prisma.apiKey.count({ where: { userId: sessionUser.id, isActive: true } });
  if (active >= MAX_ACTIVE_KEYS) return { error: `You can have at most ${MAX_ACTIVE_KEYS} active keys.` };

  const { key, prefix, keyHash } = generateApiKey();
  await prisma.apiKey.create({ data: { userId: sessionUser.id, name, prefix, keyHash } });
  revalidatePath('/dashboard/api-keys');
  return { key }; // the only time the plaintext exists
}

export async function revokeApiKey(fd: FormData) {
  const user = await requireUser();
  // updateMany scoped by userId: cannot revoke someone else's key by guessing an id.
  await prisma.apiKey.updateMany({
    where: { id: String(fd.get('id') ?? ''), userId: user.id },
    data: { isActive: false, revokedAt: new Date() },
  });
  revalidatePath('/dashboard/api-keys');
}
