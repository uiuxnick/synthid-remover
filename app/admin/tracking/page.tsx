import { requireAdmin } from '@/lib/auth-helpers';
import { getAppConfig } from '@/lib/credits';
import { saveTracking } from '../actions';
import { Banner, Field, btn, input } from '../ui';

export default async function TrackingPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requireAdmin();
  const c = await getAppConfig();
  const ids: [string, string, string | null, string][] = [
    ['ga4MeasurementId', 'Google Analytics 4', c.ga4MeasurementId, 'G-XXXXXXXXXX'],
    ['gtmContainerId', 'Google Tag Manager', c.gtmContainerId, 'GTM-XXXXXXX'],
    ['gscVerification', 'Search Console verification', c.gscVerification, 'content value of the meta tag only'],
    ['metaPixelId', 'Meta Pixel', c.metaPixelId, '15-digit pixel ID'],
    ['clarityId', 'Microsoft Clarity', c.clarityId, 'project ID'],
    ['plausibleDomain', 'Plausible domain', c.plausibleDomain, 'example.com'],
  ];
  return (
    <form action={saveTracking} className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Tracking</h1>
      <Banner ok={searchParams.ok} error={searchParams.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        {ids.map(([name, label, value, ph]) => (
          <Field key={name} label={label}>
            <input name={name} defaultValue={value ?? ''} placeholder={ph} className={input} autoComplete="off" />
          </Field>
        ))}
      </div>
      <Field label="Custom head scripts" hint="Only <script> tags. With sanitising on: https src only, no inline event handlers or other markup.">
        <textarea name="customHeadScripts" defaultValue={c.customHeadScripts ?? ''} rows={5} className={`${input} font-mono text-[14px]`} />
      </Field>
      <Field label="Custom body scripts" hint="Scripts load after the page becomes interactive (head and body are treated the same).">
        <textarea name="customBodyScripts" defaultValue={c.customBodyScripts ?? ''} rows={5} className={`${input} font-mono text-[14px]`} />
      </Field>
      <label className="flex items-start gap-2 text-[16px]">
        <input type="checkbox" name="sanitizeScripts" defaultChecked={c.sanitizeScripts} className="mt-1" />
        <span>
          Sanitise custom scripts (recommended)
          <span className="block text-[14px] text-h-muted">
            Constrains the markup, but inline JavaScript runs with full page access. Only paste code you trust; anyone with admin access can run code on every visitor&apos;s page.
          </span>
        </span>
      </label>
      <p className="text-[14px] text-h-muted">Changes apply site-wide immediately. Add consent handling before enabling ad pixels where required by law.</p>
      <button className={btn}>Save tracking</button>
    </form>
  );
}
