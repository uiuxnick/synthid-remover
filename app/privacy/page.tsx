import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

// DRAFT: have counsel review before launch; update once storage (R2/S3) and analytics are live.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-[820px] space-y-5 px-4 pb-24 pt-14 text-[17px] leading-relaxed sm:px-6 sm:pt-24 [&>*]:max-w-[68ch] [&>h1]:max-w-none">
      <h1 className="text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[56px]">Privacy Policy</h1>
      <p className="text-h-muted">Last updated: 12 November 2026</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Account data: name, email, hashed password (bcrypt) or Google profile identifiers.</li>
        <li>Billing data: Razorpay order and payment IDs and amounts. We never see or store card numbers.</li>
        <li>Job data: a SHA-256 hash of each upload, mode, quality metrics (PSNR, MSE), timing and status.</li>
        <li>Usage and analytics data, according to the tracking tools enabled on the site.</li>
      </ul>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Your images</h2>
      <p>
        The landing-page trial processes images in your browser; they are not uploaded. Signed-in processing may run on our servers: images are handled in memory, and any stored output is deleted when its download link expires.
      </p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Sharing</h2>
      <p>We share data only with processors needed to run the Service (hosting, database, email delivery, Razorpay) and when required by law.</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Your rights</h2>
      <p>You can request access, correction or deletion of your account data at {SITE.contactEmail}.</p>

      <h2 className="pt-6 text-[26px] font-semibold leading-tight tracking-[-0.02em]">Operator</h2>
      <p>{SITE.company}</p>
    </article>
  );
}
