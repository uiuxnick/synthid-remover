import { requireAdmin } from '@/lib/auth-helpers';
import { getAppConfig } from '@/lib/credits';
import { TEMPLATE_KEYS, TEMPLATE_VARS, getTemplates } from '@/lib/emailTemplates';
import { saveSmtp, saveTemplates, sendTestEmail } from '../actions';
import { Banner, Field, btn, btnGhost, card, input } from '../ui';

export default async function EmailPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requireAdmin();
  const [c, templates] = await Promise.all([getAppConfig(), getTemplates()]);
  return (
    <div className="space-y-8">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Email</h1>
      <Banner ok={searchParams.ok} error={searchParams.error} />

      <form action={saveSmtp} className={`${card} space-y-4`}>
        <h2 className="font-semibold">SMTP</h2>
        <p className="text-[14px] text-h-muted">Leave host empty to use SMTP_* environment variables. The password is stored encrypted and never shown.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Host"><input name="smtpHost" defaultValue={c.smtpHost ?? ''} className={input} /></Field>
          <Field label="Port"><input name="smtpPort" type="number" defaultValue={c.smtpPort ?? 587} className={input} /></Field>
          <Field label="Username"><input name="smtpUser" defaultValue={c.smtpUser ?? ''} className={input} autoComplete="off" /></Field>
          <Field label="Password" hint={c.smtpPassEnc ? 'A password is saved. Leave blank to keep it.' : undefined}>
            <input name="smtpPass" type="password" className={input} autoComplete="new-password" />
          </Field>
          <Field label="From address" hint='e.g. "Brand <hello@example.com>"'><input name="smtpFrom" defaultValue={c.smtpFrom ?? ''} className={input} /></Field>
        </div>
        <label className="flex items-center gap-2 text-[16px]"><input type="checkbox" name="smtpSecure" defaultChecked={c.smtpSecure} /> Implicit TLS (port 465). Untick for STARTTLS on 587.</label>
        <label className="flex items-center gap-2 text-[16px]"><input type="checkbox" name="clearPass" /> Remove saved password</label>
        <button className={btn}>Save SMTP</button>
      </form>

      <form action={sendTestEmail} className="flex items-center gap-3">
        <button className={btnGhost}>Send test email to me</button>
        <span className="text-[14px] text-h-muted">Uses the saved settings (or env fallback).</span>
      </form>

      <form action={saveTemplates} className="space-y-4">
        <h2 className="font-semibold">Templates</h2>
        <p className="text-[14px] text-h-muted">Variables are HTML-escaped on send. Scripts, forms, iframes and event handlers are rejected. The magic-link email has a fixed layout.</p>
        {TEMPLATE_KEYS.map((k) => (
          <div key={k} className={`${card} space-y-3`}>
            <p className="font-medium">{k} <span className="font-mono text-[14px] text-h-muted">{TEMPLATE_VARS[k].map((v) => `{{${v}}}`).join(' ')}</span></p>
            <input name={`${k}.subject`} defaultValue={templates[k].subject} className={input} aria-label={`${k} subject`} />
            <textarea name={`${k}.html`} defaultValue={templates[k].html} rows={5} className={`${input} font-mono text-[14px]`} aria-label={`${k} HTML`} />
          </div>
        ))}
        <button className={btn}>Save templates</button>
      </form>
    </div>
  );
}
