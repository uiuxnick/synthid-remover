import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  alternates: { canonical: '/terms' },
};

// DRAFT: have counsel review before launch. Fill SITE.company / SITE.contactEmail.
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-[820px] space-y-5 px-4 pb-24 pt-14 text-[17px] leading-relaxed sm:px-6 sm:pt-24 [&>*]:max-w-[68ch] [&>h1]:max-w-none">
      <h1 className="text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[56px]">Terms of Service</h1>
      <p className="text-h-muted">Last updated: 12 November 2026</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">1. Agreement</h2>
      <p>By using {SITE.name} (the &quot;Service&quot;), operated by {SITE.company}, you agree to these Terms.</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">2. Permitted use</h2>
      <p>
        You may process only images that you created or have the right to modify. You must not use the Service to misrepresent how an image was made, to deceive others about its origin, to infringe anyone&apos;s rights, or to violate applicable law, platform rules or disclosure requirements for AI-generated content.
      </p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">3. Accounts and credits</h2>
      <p>
        You are responsible for your account and API keys. Credits are consumed per processed image, are non-transferable, and are refunded automatically when a job fails. We may suspend accounts that breach these Terms.
      </p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">4. Payments</h2>
      <p>
        Payments are processed by Razorpay. Subscriptions renew until cancelled; cancellation takes effect at the end of the paid period. Credit top-ups are non-refundable once used, except where required by law.
      </p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">5. Your content</h2>
      <p>You retain all rights to your images. You grant us a limited licence to process them solely to provide the Service.</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">6. Disclaimer and liability</h2>
      <p>
        The Service is provided &quot;as is&quot;. We do not guarantee that output will pass or fail any third-party detection or verification system. To the extent permitted by law, our liability is limited to the amount you paid in the prior 12 months.
      </p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">7. Contact</h2>
      <p>{SITE.contactEmail}</p>
    </article>
  );
}
