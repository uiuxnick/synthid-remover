'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, type Plan } from '@/lib/plans';
import { CheckoutButton } from '../CheckoutButton';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const btn = 'inline-block rounded-[10px] bg-h-accent px-6 py-3 text-center text-[15px] font-medium text-h-accent-ink';

function Stage({ plan, annual, setAnnual }: { plan: Plan; annual: boolean; setAnnual: (v: boolean) => void }) {
  const price = plan.monthly === null ? 'Custom' : plan.monthly === 0 ? '₹0' : inr(annual && plan.annual ? Math.round(plan.annual / 12) : plan.monthly);
  const period =
    plan.monthly === null ? 'volume pricing' : plan.monthly === 0 ? 'forever' : annual ? `per month, billed ${inr(plan.annual!)} a year` : 'per month';
  const included = plan.features.filter((f) => f.included).map((f) => f.label.toLowerCase());
  return (
    <div className="h-fade">
      <p className="text-[clamp(56px,9vw,140px)] font-semibold leading-none tracking-[-0.04em] tabular-nums">{price}</p>
      <p className="mt-2 text-[18px] text-h-muted">{period}</p>
      {plan.id === 'pro' && (
        <div className="mt-4 flex gap-4 text-[15px]" role="group" aria-label="Billing period">
          {[
            [false, 'Monthly'],
            [true, 'Annual, save about 17%'],
          ].map(([v, label]) => (
            <button key={String(v)} type="button" aria-pressed={annual === v} onClick={() => setAnnual(v as boolean)} className={annual === v ? 'font-semibold' : 'text-h-muted'}>
              {label as string}
            </button>
          ))}
        </div>
      )}
      <p className="mt-6 max-w-[44ch] text-[18px] leading-relaxed">
        {plan.blurb} {plan.credits}. Includes {included.slice(0, 4).join(', ')}.
      </p>
      <div className="mt-8">
        {plan.id === 'pro' ? (
          <CheckoutButton request={{ type: 'subscription', interval: annual ? 'annual' : 'monthly' }} label={plan.cta} returnTo="/" className={btn} />
        ) : (
          <Link href={plan.href} className={btn}>
            {plan.cta}
          </Link>
        )}
      </div>
    </div>
  );
}

export function PricingIndex() {
  const [sel, setSel] = useState(1); // the middle plan opens first
  const [annual, setAnnual] = useState(true);

  return (
    <section aria-labelledby="pricing" className="bg-h-surface py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8">
        <h2 id="pricing" className="sr-only">Pricing</h2>
        <div className="grid gap-x-6 lg:grid-cols-12">
          <ul className="space-y-1 lg:col-span-6">
            {PLANS.map((p, i) => (
              <li key={p.id}>
                <button
                  type="button"
                  aria-pressed={sel === i}
                  aria-expanded={sel === i}
                  onClick={() => setSel(i)}
                  className={`flex items-center gap-4 text-left text-[clamp(32px,5vw,72px)] font-semibold leading-[1.1] tracking-[-0.03em] transition-colors ${sel === i ? 'text-h-ink' : 'text-h-muted hover:text-h-ink'}`}
                >
                  <span aria-hidden className={`inline-block h-[0.3em] w-[0.3em] shrink-0 rounded-full ${sel === i ? 'bg-h-ink' : 'bg-transparent'}`} />
                  {p.name}
                </button>
                {/* Phone: the stage opens directly beneath the selected name. */}
                {sel === i && (
                  <div className="my-6 lg:hidden">
                    <Stage plan={p} annual={annual} setAnnual={setAnnual} />
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden lg:col-span-5 lg:col-start-8 lg:block" aria-live="polite">
            <Stage key={PLANS[sel].id} plan={PLANS[sel]} annual={annual} setAnnual={setAnnual} />
          </div>
        </div>
      </div>
    </section>
  );
}
