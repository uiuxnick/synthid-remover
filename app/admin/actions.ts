'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { APP_CONFIG_ID, getAppConfig, grantCredits } from '@/lib/credits';
import { encryptSecret } from '@/lib/crypto';
import { createTransport, resolveMailSettings } from '@/lib/mailer';
import { ID_PATTERNS, parseScripts } from '@/lib/tracking';
import { DEFAULT_TEMPLATES, TEMPLATE_KEYS, type TemplateKey } from '@/lib/emailTemplates';
import { Prisma } from '@prisma/client';

class UserError extends Error {}

/**
 * Every action calls requireAdmin() FIRST (DB role check) and never trusts the client.
 * redirect() throws, so it must stay outside the try/catch.
 */
async function run(path: string, fn: () => Promise<string>): Promise<never> {
  let kind = 'ok';
  let msg = '';
  try {
    msg = await fn();
  } catch (e) {
    kind = 'error';
    msg = e instanceof UserError ? e.message : 'Something went wrong. Check server logs.';
    if (!(e instanceof UserError)) console.error('[admin]', e);
  }
  revalidatePath('/', 'layout');
  redirect(`${path}?${kind}=${encodeURIComponent(msg)}`);
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const optional = (fd: FormData, k: string) => str(fd, k) || null;
const bool = (fd: FormData, k: string) => fd.get(k) === 'on';

async function patchConfig(adminId: string, data: Prisma.AppConfigUpdateInput) {
  await getAppConfig();
  await prisma.appConfig.update({ where: { id: APP_CONFIG_ID }, data: { ...data, updatedBy: adminId } });
}

// ─────────────────────────── Tracking ───────────────────────────
export async function saveTracking(fd: FormData) {
  const admin = await requireAdmin();
  await run('/admin/tracking', async () => {
    const data: Record<string, string | null> = {};
    for (const k of Object.keys(ID_PATTERNS) as (keyof typeof ID_PATTERNS)[]) {
      const v = optional(fd, k);
      if (v && !ID_PATTERNS[k].test(v)) throw new UserError(`Invalid value for ${k}`);
      data[k] = v;
    }
    const sanitize = bool(fd, 'sanitizeScripts');
    const head = str(fd, 'customHeadScripts');
    const body = str(fd, 'customBodyScripts');
    for (const [label, html] of [['Head', head], ['Body', body]] as const) {
      const r = parseScripts(html, sanitize);
      if (r.error) throw new UserError(`${label} scripts: ${r.error}`);
    }
    await patchConfig(admin.id, {
      ...data,
      customHeadScripts: head || null,
      customBodyScripts: body || null,
      sanitizeScripts: sanitize,
    });
    return 'Tracking saved';
  });
}

// ─────────────────────────── Email ───────────────────────────
const smtpSchema = z.object({
  smtpHost: z.string().max(253).regex(/^[A-Za-z0-9.-]+$/, 'Invalid host'),
  smtpPort: z.coerce.number().int().min(1).max(65535),
  smtpFrom: z.string().min(3).max(200).regex(/^[^<>\r\n]*(<[^<>\s@]+@[^<>\s@]+>|[^<>\s@]+@[^<>\s@]+)$/, 'Invalid from address'),
});

export async function saveSmtp(fd: FormData) {
  const admin = await requireAdmin();
  await run('/admin/email', async () => {
    const host = str(fd, 'smtpHost');
    if (!host) {
      // Clearing the host reverts to SMTP_* env vars.
      await patchConfig(admin.id, { smtpHost: null, smtpPort: null, smtpUser: null, smtpPassEnc: null, smtpFrom: null });
      return 'SMTP cleared; falling back to environment variables';
    }
    const p = smtpSchema.safeParse({ smtpHost: host, smtpPort: str(fd, 'smtpPort'), smtpFrom: str(fd, 'smtpFrom') });
    if (!p.success) throw new UserError(p.error.issues[0].message);
    const pass = String(fd.get('smtpPass') ?? '');
    const data: Prisma.AppConfigUpdateInput = {
      ...p.data,
      smtpUser: optional(fd, 'smtpUser'),
      smtpSecure: bool(fd, 'smtpSecure'),
    };
    if (bool(fd, 'clearPass')) data.smtpPassEnc = null;
    else if (pass) {
      try {
        data.smtpPassEnc = encryptSecret(pass);
      } catch {
        throw new UserError('APP_ENCRYPTION_KEY is missing or invalid; cannot store the SMTP password');
      }
    } // blank password = keep existing
    await patchConfig(admin.id, data);
    return 'SMTP saved';
  });
}

export async function sendTestEmail() {
  const admin = await requireAdmin();
  await run('/admin/email', async () => {
    const me = await prisma.user.findUnique({ where: { id: admin.id }, select: { email: true } });
    if (!me?.email) throw new UserError('Your account has no email address');
    try {
      const settings = await resolveMailSettings();
      const t = createTransport(settings);
      await t.verify();
      await t.sendMail({
        from: settings.from,
        to: me.email,
        subject: 'SMTP test',
        text: 'Your SMTP settings work.',
        html: '<p>Your SMTP settings work.</p>',
      });
    } catch (e) {
      throw new UserError(`SMTP test failed: ${e instanceof Error ? e.message.slice(0, 200) : 'unknown error'}`);
    }
    return `Test email sent to ${me.email}`;
  });
}

const UNSAFE_EMAIL = /<\s*(script|iframe|object|embed|form)|\son\w+\s*=|javascript:/i;

export async function saveTemplates(fd: FormData) {
  const admin = await requireAdmin();
  await run('/admin/email', async () => {
    const out: Partial<Record<TemplateKey, { subject: string; html: string }>> = {};
    for (const k of TEMPLATE_KEYS) {
      const subject = str(fd, `${k}.subject`).replace(/[\r\n]+/g, ' ');
      const html = str(fd, `${k}.html`);
      if (html.length > 10_000 || subject.length > 200) throw new UserError(`${k}: template too long`);
      if (UNSAFE_EMAIL.test(html)) throw new UserError(`${k}: scripts, forms, iframes and event handlers are not allowed`);
      const d = DEFAULT_TEMPLATES[k];
      if (subject !== d.subject || html !== d.html) out[k] = { subject: subject || d.subject, html: html || d.html };
    }
    await patchConfig(admin.id, { emailTemplates: Object.keys(out).length ? (out as Prisma.InputJsonValue) : Prisma.DbNull });
    return 'Templates saved';
  });
}

// ─────────────────────────── Pricing & engine ───────────────────────────
const settingsSchema = z.object({
  freeCreditsOnSignup: z.coerce.number().int().min(0).max(1000),
  lowCreditThreshold: z.coerce.number().int().min(0).max(1000),
  creditPackSize: z.coerce.number().int().min(1).max(100000),
  creditPackRupees: z.coerce.number().min(1).max(1_000_000),
  proMonthlyRupees: z.coerce.number().min(1).max(1_000_000),
  proAnnualRupees: z.coerce.number().min(1).max(10_000_000),
  proMonthlyCredits: z.coerce.number().int().min(1).max(1_000_000),
  defaultPsnrCutoff: z.coerce.number().min(20).max(60),
  maxUploadMb: z.coerce.number().int().min(1).max(100),
  maxBatchSize: z.coerce.number().int().min(1).max(200),
  rateLimitPerMin: z.coerce.number().int().min(1).max(10000),
  anonTrialRuns: z.coerce.number().int().min(0).max(50),
});
const PLAN_ID = /^plan_[A-Za-z0-9]{8,30}$/;

export async function saveSettings(fd: FormData) {
  const admin = await requireAdmin();
  await run('/admin/settings', async () => {
    const p = settingsSchema.safeParse(Object.fromEntries(fd));
    if (!p.success) throw new UserError(`${p.error.issues[0].path.join('.')}: ${p.error.issues[0].message}`);
    const { creditPackRupees, proMonthlyRupees, proAnnualRupees, ...rest } = p.data;
    const monthly = optional(fd, 'razorpayPlanProMonthly');
    const annual = optional(fd, 'razorpayPlanProAnnual');
    for (const id of [monthly, annual]) if (id && !PLAN_ID.test(id)) throw new UserError('Razorpay plan IDs look like plan_XXXXXXXXXXXXXX');
    await patchConfig(admin.id, {
      ...rest,
      creditPackPricePaise: Math.round(creditPackRupees * 100),
      proMonthlyPaise: Math.round(proMonthlyRupees * 100),
      proAnnualPaise: Math.round(proAnnualRupees * 100),
      razorpayPlanProMonthly: monthly,
      razorpayPlanProAnnual: annual,
    });
    return 'Settings saved';
  });
}

// ─────────────────────────── Users ───────────────────────────
const usersPath = () => '/admin/users';

export async function adjustCredits(fd: FormData) {
  const admin = await requireAdmin();
  await run(usersPath(), async () => {
    const userId = str(fd, 'userId');
    const delta = Number(str(fd, 'delta'));
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 100_000) throw new UserError('Enter a non-zero whole number (max 100,000)');
    const note = (str(fd, 'note') || 'Admin adjustment').slice(0, 200);
    await prisma.$transaction(async (tx) => {
      if (delta > 0) {
        await grantCredits(tx, { userId, amount: delta, reason: 'ADMIN_GRANT', refId: admin.id, note });
        return;
      }
      const { count } = await tx.user.updateMany({
        where: { id: userId, creditsBalance: { gte: -delta } },
        data: { creditsBalance: { decrement: -delta } },
      });
      if (count === 0) throw new UserError('User does not have that many credits');
      const u = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { creditsBalance: true } });
      await tx.creditLedger.create({
        data: { userId, delta, balanceAfter: u.creditsBalance, reason: 'ADMIN_REVOKE', refId: admin.id, note },
      });
    });
    return `Credits adjusted by ${delta}`;
  });
}

export async function setBan(fd: FormData) {
  const admin = await requireAdmin();
  await run(usersPath(), async () => {
    const userId = str(fd, 'userId');
    if (userId === admin.id) throw new UserError('You cannot ban yourself');
    await prisma.user.update({ where: { id: userId }, data: { isBanned: str(fd, 'ban') === '1' } });
    return str(fd, 'ban') === '1' ? 'User banned (sessions end on next request)' : 'User unbanned';
  });
}

export async function setRoleTier(fd: FormData) {
  const admin = await requireAdmin();
  await run(usersPath(), async () => {
    const userId = str(fd, 'userId');
    const role = z.enum(['USER', 'ADMIN']).parse(str(fd, 'role'));
    const tier = z.enum(['FREE', 'PRO', 'ENTERPRISE']).parse(str(fd, 'tier'));
    if (userId === admin.id && role !== 'ADMIN') throw new UserError('You cannot remove your own admin role');
    await prisma.user.update({ where: { id: userId }, data: { role, tier } });
    return 'User updated';
  });
}
