'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PLANS, type Plan } from '@/lib/plans';
import { CheckoutButton } from './CheckoutButton';

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function price(plan: Plan, annual: boolean): { main: string; sub: string } {
  if (plan.monthly === null) return { main: 'Custom', sub: 'volume pricing' };
  if (plan.monthly === 0) return { main: '₹0', sub: 'forever' };
  if (annual && plan.annual) return { main: inr(Math.round(plan.annual / 12)), sub: `per month, billed ${inr(plan.annual)}/yr` };
  return { main: inr(plan.monthly), sub: 'per month' };
}

export function PricingTable() {
  const [annual, setAnnual] = useState(true);

  return (
    <div>
      <div className="mx-auto mb-10 flex w-fit items-center gap-1 rounded-full border border-h-line p-1 text-sm " role="group" aria-label="Billing period">
        {[
          [false, 'Monthly'],
          [true, 'Annual · save ~17%'],
        ].map(([val, label]) => (
          <button
            key={String(val)}
            onClick={() => setAnnual(val as boolean)}
            aria-pressed={annual === val}
            className={`rounded-full px-4 py-1.5 transition-colors ${
              annual === val ? 'bg-h-accent text-h-accent-ink  ' : 'text-h-muted'
            }`}
          >
            {label as string}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const p = price(plan, annual);
          return (
            <div
              key={plan.id}
              className={`h-card flex flex-col p-7 ${plan.highlight ? 'ring-2 ring-h-accent' : ''}`}
            >
              <h3 className="font-semibold">{plan.name}</h3>
              <p className="mt-1 text-sm text-h-muted">{plan.blurb}</p>
              <p className="mt-6 text-4xl font-semibold tabular-nums tracking-tight">{p.main}</p>
              <p className="text-xs text-h-muted">{p.sub}</p>
              <p className="mt-3 text-sm font-medium">{plan.credits}</p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f.label} className={`flex items-center gap-2 ${f.included ? '' : 'text-h-muted'}`}>
                    {f.included ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                    {f.label}
                  </li>
                ))}
              </ul>
              {plan.id === 'pro' ? (
                <CheckoutButton
                  request={{ type: 'subscription', interval: annual ? 'annual' : 'monthly' }}
                  label={plan.cta}
                  returnTo="/pricing"
                  className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                  plan.highlight
                    ? 'bg-h-accent text-h-accent-ink  '
                    : 'border border-h-line '
                }`}
                />
              ) : (
                <Link href={plan.href} className={`mt-8 rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                  plan.highlight
                    ? 'bg-h-accent text-h-accent-ink  '
                    : 'border border-h-line '
                }`}>
                  {plan.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
