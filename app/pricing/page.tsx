import type { Metadata } from 'next';
import { PricingTable } from '../components/PricingTable';
import { FaqTiles } from '../components/home/FaqTiles';
import { Reveal } from '../components/home/Reveal';
import { JsonLd } from '../components/JsonLd';
import { PLANS } from '@/lib/plans';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple credit-based pricing: start free, upgrade to Pro Creator, or talk to us about API volume.',
  alternates: { canonical: '/pricing' },
};

const CREDITS: [string, string][] = [
  ['One credit, one image', 'Any mode, any size up to the upload limit. The manual brush costs one credit per run too.'],
  ['Failed runs cost nothing', 'If processing errors out, the credit goes straight back and the refund shows in your history.'],
  ['Credits do not expire', 'Top up with a credit pack from the Billing page whenever you run low. Cancelling a plan keeps what you have left.'],
];

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: SITE.name,
          offers: PLANS.filter((p) => p.monthly !== null).map((p) => ({
            '@type': 'Offer',
            name: p.name,
            price: String(p.monthly),
            priceCurrency: 'INR',
          })),
        }}
      />
      <section className="bg-h-surface pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <Reveal>
            <h1 className="mx-auto max-w-[20ch] text-center text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[60px]">
              Pay for the images you clean.
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mx-auto mt-6 max-w-[60ch] text-center text-[19px] leading-relaxed text-h-muted">Start free, subscribe if you clean images every week, or buy a pack of credits and use them whenever.</p>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-[1100px]">
          <PricingTable />
        </div>
      </section>

      <section aria-labelledby="credits" className="bg-h-surface py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-4 sm:px-6 lg:grid-cols-12 lg:gap-6">
          <h2 id="credits" className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[40px] lg:col-span-4">How credits work</h2>
          <ul className="space-y-1 lg:col-span-8">
            {CREDITS.map(([title, body], i) => (
              <li key={title} className={`px-6 py-6 h-card`}>
                <h3 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h3>
                <p className="mt-2 max-w-[60ch] text-[17px] leading-relaxed">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FaqTiles />
    </>
  );
}
