'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { signOut } from '@/auth';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/ratelimit';
import { passwordSchema, profileSchema } from '@/lib/validation';

export interface FormState {
  ok?: string;
  error?: string;
  /** Per-field messages, keyed by input name. */
  fields?: Record<string, string>;
}

export async function updateProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: fd.get('name'), phone: fd.get('phone') });
  if (!parsed.success) {
    const f = parsed.error.flatten().fieldErrors;
    return { error: 'Check the highlighted fields.', fields: { name: f.name?.[0] ?? '', phone: f.phone?.[0] ?? '' } };
  }
  await prisma.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath('/dashboard', 'layout');
  return { ok: 'Profile saved.' };
}

export async function changePassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit(`pw:${user.id}`, 5)).ok) return { error: 'Too many attempts. Wait a minute and try again.' };

  const next = passwordSchema.safeParse(fd.get('next'));
  if (!next.success) return { error: 'Check the highlighted fields.', fields: { next: next.error.issues[0].message } };
  if (fd.get('next') !== fd.get('confirm')) return { error: 'Check the highlighted fields.', fields: { confirm: 'The two passwords do not match.' } };

  const db = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!db) return { error: 'Account not found.' };
  // Accounts created with Google or an email link have no password yet and may set one without a current password.
  if (db.passwordHash) {
    const ok = await bcrypt.compare(String(fd.get('current') ?? ''), db.passwordHash);
    if (!ok) return { error: 'Check the highlighted fields.', fields: { current: 'That is not your current password.' } };
  }
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next.data, 12) } });
  return { ok: 'Password updated.' };
}

export async function deleteAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, role: true, _count: { select: { transactions: true } } },
  });
  if (!db) return { error: 'Account not found.' };
  if (String(fd.get('confirm') ?? '').trim().toLowerCase() !== db.email.toLowerCase()) {
    return { error: 'Check the highlighted fields.', fields: { confirm: 'Type your email address exactly to confirm.' } };
  }
  if (db.role === 'ADMIN') return { error: 'Admin accounts cannot be deleted here. Ask another admin to change your role first.' };
  // Payment records must be kept for accounting, so accounts with payments are closed by support.
  if (db._count.transactions > 0) return { error: 'This account has payment records. Contact support to close it.' };

  await prisma.user.delete({ where: { id: user.id } }); // cascades to keys, jobs' user link, ledger, sessions
  await signOut({ redirectTo: '/' });
  return { ok: 'Account deleted.' };
}
