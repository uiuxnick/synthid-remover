import nodemailer, { type Transporter } from 'nodemailer';
import { decryptSecret } from '@/lib/crypto';
import { getAppConfig } from '@/lib/credits';

export interface MailSettings {
  host: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
  secure: boolean;
}

/** Admin-saved SMTP settings win; env vars are the bootstrap fallback. */
export async function resolveMailSettings(): Promise<MailSettings> {
  const cfg = await getAppConfig();
  if (cfg.smtpHost && cfg.smtpFrom) {
    return {
      host: cfg.smtpHost,
      port: cfg.smtpPort ?? 587,
      user: cfg.smtpUser ?? undefined,
      pass: cfg.smtpPassEnc ? decryptSecret(cfg.smtpPassEnc) : undefined,
      from: cfg.smtpFrom,
      secure: cfg.smtpSecure,
    };
  }
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) throw new Error('SMTP is not configured (admin settings or SMTP_* env vars)');
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from,
    secure: process.env.SMTP_SECURE === 'true',
  };
}

export function createTransport(s: MailSettings): Transporter {
  return nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.secure, // true = implicit TLS (465); false = STARTTLS upgrade
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
  });
}

export async function sendMail(opts: { to: string; subject: string; html: string; text: string }) {
  const settings = await resolveMailSettings();
  await createTransport(settings).sendMail({ from: settings.from, ...opts });
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
