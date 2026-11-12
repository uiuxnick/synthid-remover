import { requireAdmin } from '@/lib/auth-helpers';
import { getAppConfig } from '@/lib/credits';
import { saveSettings } from '../actions';
import { Banner, Field, btn, card, input } from '../ui';

export default async function SettingsPage({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  await requireAdmin();
  const c = await getAppConfig();
  const n = (name: string, label: string, value: number | string, hint?: string, step: string = '1') => (
    <Field label={label} hint={hint}>
      <input name={name} type="number" step={step} required defaultValue={value} className={input} />
    </Field>
  );
  return (
    <form action={saveSettings} className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Pricing &amp; engine</h1>
      <Banner ok={searchParams.ok} error={searchParams.error} />

      <section className={`${card} space-y-4`}>
        <h2 className="font-semibold">Credits &amp; pricing (₹)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {n('freeCreditsOnSignup', 'Free credits on signup', c.freeCreditsOnSignup)}
          {n('lowCreditThreshold', 'Low-credit warning below', c.lowCreditThreshold)}
          {n('creditPackSize', 'Credits per pack', c.creditPackSize)}
          {n('creditPackRupees', 'Pack price (₹)', c.creditPackPricePaise / 100, undefined, '0.01')}
          {n('proMonthlyRupees', 'Pro monthly (₹)', c.proMonthlyPaise / 100, 'Display only; the charge comes from the Razorpay plan', '0.01')}
          {n('proAnnualRupees', 'Pro annual (₹)', c.proAnnualPaise / 100, undefined, '0.01')}
          {n('proMonthlyCredits', 'Pro credits per month', c.proMonthlyCredits, 'Annual plan grants 12× up front')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Razorpay plan ID (monthly)"><input name="razorpayPlanProMonthly" defaultValue={c.razorpayPlanProMonthly ?? ''} className={input} placeholder="plan_..." /></Field>
          <Field label="Razorpay plan ID (annual)"><input name="razorpayPlanProAnnual" defaultValue={c.razorpayPlanProAnnual ?? ''} className={input} placeholder="plan_..." /></Field>
        </div>
        <p className="text-[14px] text-h-muted">Credit-pack prices apply to new orders immediately. Subscription prices are set in the Razorpay dashboard; keep these in sync.</p>
      </section>

      <section className={`${card} space-y-4`}>
        <h2 className="font-semibold">Engine</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {n('defaultPsnrCutoff', 'Default PSNR cutoff (dB)', c.defaultPsnrCutoff, 'Stored; not yet read by the pipeline', '0.1')}
          {n('maxUploadMb', 'Max upload (MB)', c.maxUploadMb, 'Enforced on /api/process')}
          {n('maxBatchSize', 'Max batch size', c.maxBatchSize, 'Applies once batch upload ships')}
          {n('rateLimitPerMin', 'Rate limit (requests/min)', c.rateLimitPerMin, 'Enforced from Phase 5')}
          {n('anonTrialRuns', 'Anonymous trial runs', c.anonTrialRuns, 'Server-enforced from Phase 5')}
        </div>
      </section>
      <button className={btn}>Save settings</button>
    </form>
  );
}
