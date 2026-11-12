import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { getAppConfig } from '@/lib/credits';
import { CheckoutButton } from '@/app/components/CheckoutButton';
import { CancelSubscriptionButton } from '@/app/components/CancelSubscriptionButton';

export const metadata = { title: 'Billing', robots: { index: false } };

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmt = (d: Date) => d.toISOString().slice(0, 10);

export default async function BillingPage() {
  const user = await requireUser();
  const [cfg, me, sub, txns] = await Promise.all([
    getAppConfig(),
    prisma.user.findUnique({ where: { id: user.id }, select: { creditsBalance: true, tier: true } }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: { in: ['ACTIVE', 'AUTHENTICATED'] } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
  ]);

  const packLabel = `${cfg.creditPackSize} credits`;
  const btn = 'w-full rounded-[10px] bg-h-accent px-4 py-2.5 text-[16px] font-semibold text-h-accent-ink disabled:opacity-60  ';

  return (
    <div className="space-y-8">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Billing</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[14px] bg-h-surface p-6 ">
          <p className=" text-[13px]   text-h-muted">Balance</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{me?.creditsBalance ?? 0} credits</p>
          <p className="mt-1 text-[16px] text-h-muted">Plan: {me?.tier ?? 'FREE'}. One credit cleans one image; failed jobs are refunded.</p>
        </div>

        <div className="rounded-[14px] bg-h-surface p-6 ">
          <p className=" text-[13px]   text-h-muted">Subscription</p>
          {sub ? (
            <div className="mt-2 space-y-1 text-[16px]">
              <p className="font-medium">Pro Creator · {sub.status.toLowerCase()}</p>
              {sub.status === 'AUTHENTICATED' && <p className="text-h-muted">Activating. Credits arrive when the first charge confirms.</p>}
              {sub.currentPeriodEnd && (
                <p className="text-h-muted">
                  {sub.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {fmt(sub.currentPeriodEnd)}
                </p>
              )}
              {!sub.cancelAtPeriodEnd && sub.status === 'ACTIVE' && <CancelSubscriptionButton />}
            </div>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <CheckoutButton
                request={{ type: 'subscription', interval: 'monthly' }}
                label={`Pro · ${inr(cfg.proMonthlyPaise)}/mo`}
                className={btn}
              />
              <CheckoutButton
                request={{ type: 'subscription', interval: 'annual' }}
                label={`Pro · ${inr(cfg.proAnnualPaise)}/yr`}
                className={btn}
              />
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-3 font-semibold">Buy credits</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 5].map((n) => (
            <div key={n} className="rounded-[14px] bg-h-surface p-6 ">
              <p className="text-xl font-semibold tabular-nums">{cfg.creditPackSize * n} credits</p>
              <p className="mb-4 text-[16px] text-h-muted">{inr(cfg.creditPackPricePaise * n)}</p>
              <CheckoutButton request={{ type: 'topup', packs: n }} label={`Buy ${n === 1 ? packLabel : `${cfg.creditPackSize * n} credits`}`} className={btn} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Payment history</h2>
        <div className="overflow-x-auto rounded-[14px] bg-h-surface ">
          <table className="w-full text-left text-[16px]">
            <thead className="bg-h-surface text-[14px]   text-h-muted ">
              <tr>{['Date', 'Type', 'Amount', 'Credits', 'Status', 'Reference'].map((h) => <th key={h} className="p-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-h-line ">
              {txns.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-h-muted">No payments yet.</td></tr>}
              {txns.map((t) => (
                <tr key={t.id}>
                  <td className="p-3  text-[14px]">{fmt(t.createdAt)}</td>
                  <td className="p-3">{t.kind === 'TOPUP' ? 'Credit pack' : 'Subscription'}</td>
                  <td className="p-3 tabular-nums">{inr(t.amount)}</td>
                  <td className="p-3 tabular-nums">{t.status === 'SUCCESS' ? `+${t.creditsGranted}` : '—'}</td>
                  <td className="p-3 text-[14px] ">{t.status.charAt(0) + t.status.slice(1).toLowerCase()}</td>
                  <td className="p-3  text-[14px] text-h-muted">{t.razorpayPaymentId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
