import type { Metadata } from 'next';
import Link from 'next/link';
import { AuditRow } from '../components/home/AuditRow';
import { ModeTabs } from '../components/home/ModeTabs';
import { Reveal } from '../components/home/Reveal';

export const metadata: Metadata = {
  title: 'Features',
  description: 'Metadata removal, visible badge erasing, a byte-level audit, PSNR reporting and a developer API.',
  alternates: { canonical: '/features' },
};

// [name, what it does, who gets it]
const FEATURES: [string, string, string][] = [
  ['Byte audit', 'Lists every EXIF, XMP, ICC, IPTC and C2PA block found in your file, then scans the output again to confirm each one is gone.', 'Every plan'],
  ['Measured quality', 'Each run reports PSNR and MSE against your original, so you can see how much the pixels moved instead of taking our word for it.', 'Every plan'],
  ['Visible badge removal', 'Finds known corner badges and rebuilds the pixels underneath. If it is not sure of a match, it leaves the image alone.', 'Every plan'],
  ['Manual brush', 'Paint over a mark the detector missed and rebuild only that region.', 'Every plan'],
  ['Video cleanup', 'Strip titles, comments, software tags and chapters from MP4, MOV, WebM or MKV without touching the picture, or blend out a visible mark in a corner. Up to 3 minutes per clip.', 'With an account'],
  ['History', 'Signed-in runs are logged with mode, time and result, so you can check what was done to a file later.', 'With an account'],
  ['Developer API', 'Bearer-key access to the same pipeline, with per-key usage counts and a rate limit you can see in the response headers.', 'Enterprise'],
  ['Batch upload', 'Drop a folder and download one archive. This is not built yet.', 'Coming later'],
];

export default function FeaturesPage() {
  return (
    <>
      <section className="bg-h-surface pb-16 pt-14 sm:pb-20 sm:pt-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <Reveal>
            <h1 className="mx-auto max-w-[20ch] text-center text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[60px]">
              What it does, and what it leaves alone.
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mx-auto mt-6 max-w-[60ch] text-center text-[19px] leading-relaxed text-h-muted">
              The tool removes embedded metadata and visible marks from images you own, and shows its work. Nothing below is a promise about the future
              unless it says so.
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="list" className="py-16 sm:py-20">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6">
          <h2 id="list" className="sr-only">Feature list</h2>
          <ul className="space-y-1">
            {FEATURES.map(([name, body, who], i) => (
              <li key={name}>
                <Reveal delay={i * 40} className={`grid gap-x-6 gap-y-2 px-6 py-6 lg:grid-cols-12 lg:items-baseline lg:py-7 h-card`}>
                  <h3 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] lg:col-span-4 lg:text-[28px]">{name}</h3>
                  <p className="max-w-[60ch] text-[17px] leading-relaxed lg:col-span-6">{body}</p>
                  <p className="text-[15px] text-h-muted lg:col-span-2 lg:text-right">{who}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="audit" className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-6">
          <Reveal className="lg:col-span-5">
            <h2 id="audit" className="max-w-[12ch] text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[40px]">
              The audit, before and after
            </h2>
            <p className="mt-5 max-w-[44ch] text-[17px] leading-relaxed">
              This is one file from our test set. The first row is what the scan found. The second is the same file after a Balanced run.
            </p>
          </Reveal>
          <div className="space-y-4 lg:col-span-6 lg:col-start-7">
            <Reveal delay={80}><AuditRow state="arrived" /></Reveal>
            <Reveal delay={160}><AuditRow state="done" /></Reveal>
          </div>
        </div>
      </section>

      <div className="bg-h-surface"><ModeTabs /></div>

      <section aria-labelledby="start" className="px-4 py-20 sm:px-6">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-8 rounded-[28px] bg-h-accent px-8 py-14 text-h-accent-ink">
          <h2 id="start" className="text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[48px]">
            See it on
            <br />
            your file.
          </h2>
          <Link href="/#try" className="rounded-[12px] bg-white px-7 py-3.5 text-[16px] font-semibold text-[#3a22b8]">
            Try it free
          </Link>
        </div>
      </section>
    </>
  );
}
