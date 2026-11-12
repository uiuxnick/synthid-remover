import { escapeHtml, sendMail } from '@/lib/mailer';
import { getAppConfig } from '@/lib/credits';

export const TEMPLATE_KEYS = ['welcome', 'receipt', 'lowCredit'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];
export interface Template { subject: string; html: string }

export const TEMPLATE_VARS: Record<TemplateKey, string[]> = {
  welcome: ['name', 'credits', 'appUrl'],
  receipt: ['name', 'amount', 'credits', 'paymentId'],
  lowCredit: ['name', 'balance', 'billingUrl'],
};

export const DEFAULT_TEMPLATES: Record<TemplateKey, Template> = {
  welcome: {
    subject: 'Welcome. Your {{credits}} free credits are ready',
    html: '<p>Hi {{name}},</p><p>Your account is ready with {{credits}} free credits.</p><p><a href="{{appUrl}}/dashboard/workspace">Open the workspace</a></p>',
  },
  receipt: {
    subject: 'Payment received: {{credits}} credits added',
    html: '<p>Hi {{name}},</p><p>We received your payment of {{amount}}. {{credits}} credits were added to your account.</p><p>Reference: {{paymentId}}</p>',
  },
  lowCredit: {
    subject: 'You are running low on credits',
    html: '<p>Hi {{name}},</p><p>You have {{balance}} credits left. <a href="{{billingUrl}}">Top up here</a>.</p>',
  },
};

export async function getTemplates(): Promise<Record<TemplateKey, Template>> {
  const cfg = await getAppConfig();
  const saved = (cfg.emailTemplates ?? {}) as Partial<Record<TemplateKey, Partial<Template>>>;
  const out = { ...DEFAULT_TEMPLATES };
  for (const k of TEMPLATE_KEYS) {
    out[k] = { subject: saved[k]?.subject || DEFAULT_TEMPLATES[k].subject, html: saved[k]?.html || DEFAULT_TEMPLATES[k].html };
  }
  return out;
}

/** Substitutes {{vars}}; values are HTML-escaped in the body and stripped of newlines in the subject. */
export function fill(t: Template, vars: Record<string, string>) {
  const sub = (s: string, esc: (v: string) => string) =>
    s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => esc(vars[k] ?? ''));
  const html = sub(t.html, escapeHtml);
  return {
    subject: sub(t.subject, (v) => v.replace(/[\r\n]+/g, ' ')),
    html,
    text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  };
}

/** Never throws: a mail failure must not break signup or payment fulfilment. */
export async function sendTemplated(key: TemplateKey, to: string, vars: Record<string, string>) {
  try {
    const t = (await getTemplates())[key];
    await sendMail({ to, ...fill(t, vars) });
  } catch (e) {
    console.error(`email "${key}" not sent:`, e instanceof Error ? e.message : e);
  }
}

export async function sendWelcome(userId: string) {
  try {
    const { prisma } = await import('@/lib/db');
    const [u, cfg] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } }),
      getAppConfig(),
    ]);
    if (!u?.email) return;
    await sendTemplated('welcome', u.email, {
      name: u.name ?? 'there',
      credits: String(cfg.freeCreditsOnSignup),
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    });
  } catch (e) {
    console.error('welcome email failed', e instanceof Error ? e.message : e);
  }
}
