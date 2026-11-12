/**
 * Display-only plan data for Phase 2. Phase 3 replaces the prices with values from AppConfig and
 * wires the CTAs to Razorpay checkout. Amounts are in INR (whole rupees).
 */
export type PlanId = 'free' | 'pro' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  blurb: string;
  monthly: number | null; // null = contact sales
  annual: number | null; // per year
  credits: string;
  features: { label: string; included: boolean }[];
  cta: string;
  href: string;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    blurb: 'Try the engine and clean the occasional image.',
    monthly: 0,
    annual: 0,
    credits: '3 credits on signup',
    features: [
      { label: 'Single-image workspace', included: true },
      { label: 'Metadata + visible-mark cleanup', included: true },
      { label: 'Byte audit report', included: true },
      { label: 'Batch upload + ZIP (coming soon)', included: false },
      { label: 'Developer API', included: false },
      { label: 'Priority processing', included: false },
    ],
    cta: 'Start free',
    href: '/register',
  },
  {
    id: 'pro',
    name: 'Pro Creator',
    blurb: 'For creators who clean images every week.',
    monthly: 799,
    annual: 7990,
    credits: '500 credits / month',
    features: [
      { label: 'Single-image workspace', included: true },
      { label: 'Metadata + visible-mark cleanup', included: true },
      { label: 'Byte audit report', included: true },
      { label: 'Batch upload + ZIP (coming soon)', included: true },
      { label: 'Manual inpainting brush', included: true },
      { label: 'Developer API', included: false },
    ],
    cta: 'Choose Pro',
    href: '/register?plan=pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise / API',
    blurb: 'Volume pricing, API keys and support.',
    monthly: null,
    annual: null,
    credits: 'Custom volume',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Developer API + keys', included: true },
      { label: 'Higher rate limits', included: true },
      { label: 'Priority processing', included: true },
      { label: 'Invoicing and SLA', included: true },
      { label: 'Dedicated support', included: true },
    ],
    cta: 'Contact sales',
    href: 'mailto:support@example.com?subject=Enterprise%20plan',
  },
];
