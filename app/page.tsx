import Link from 'next/link';
import { Check, Lock, FileSearch, Sparkles, Upload, ScanSearch, Download } from 'lucide-react';
import { HeroTool } from './components/HeroTool';
import { PricingTable } from './components/PricingTable';
import { JsonLd } from './components/JsonLd';
import { Reveal } from './components/home/Reveal';
import { ModeTabs } from './components/home/ModeTabs';
import { FaqTiles } from './components/home/FaqTiles';
import { SAMPLE } from './components/home/sample';
import { FAQ } from '@/lib/faq';
import { SITE } from '@/lib/site';

const eyebrow = 'text-[13px] font-semibold uppercase tracking-[0.08em] text-h-accent';
const h2 = 'mx-auto mt-3 max-w-[20ch] text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[44px]';
const lead = 'mx-auto mt-4 max-w-[58ch] text-[18px] leading-relaxed text-h-muted';

// Measured on a sample file with this repo's own pipeline (see components/home/sample.ts).
const REPORT: [string, string, string, string][] = [
  ['EXIF data', 'Camera, software and author tags', 'Found', 'Removed'],
  ['ICC profile', 'Embedded colour profile', 'Found', 'Removed'],
  ['Corner badge', 'Visible mark in the image', 'Present', 'Erased'],
  ['C2PA, XMP, IPTC', 'Content Credentials and captions', 'None', 'None'],
];

const STEPS = [
  [Upload, 'Drop in your image', 'JPG, PNG, WEBP or AVIF. The free trial runs in your browser, so the file never leaves your device.'],
  [ScanSearch, 'We scan and clean it', 'Every metadata block is listed, then removed. Known corner badges are erased and the pixels rebuilt.'],
  [Download, 'Download with proof', `You get the clean file plus a report: what was found, what changed, and the quality score (${SAMPLE.psnr} on our sample).`],
] as const;

export default function LandingPage() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'SoftwareApplication',
              name: SITE.name,
              applicationCategory: 'MultimediaApplication',
              operatingSystem: 'Web',
              description: SITE.description,
              url: SITE.url,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
            },
          ],
        }}
      />

      {/* HERO: headline, one sentence, and the working tool. */}
      <section className="bg-h-surface px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-[1100px] text-center">
          <Reveal>
            <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-h-surface2 px-4 py-1.5 text-[14px] font-medium text-h-accent">
              <Lock aria-hidden className="h-3.5 w-3.5" /> Free trial runs in your browser
            </p>
            <h1 className="mx-auto mt-6 max-w-[27ch] text-[40px] font-bold leading-[1.06] tracking-[-0.03em] sm:text-[64px]">
              Clean metadata and watermarks from images and videos
            </h1>
            <p className="mx-auto mt-6 max-w-[60ch] text-[18px] leading-relaxed text-h-muted sm:text-[20px]">
              Strip EXIF, XMP and C2PA data, erase visible AI badges, and get a report showing exactly what changed. For media you own.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            <div id="try" data-ui className="h-card mx-auto max-w-[920px] scroll-mt-24 p-3 text-left sm:p-5">
              <HeroTool />
            </div>
            <p className="mt-5 text-[15px] text-h-muted">Two free images, no sign-up. Video needs a free account.</p>
          </Reveal>
        </div>
      </section>

      {/* WHAT IS IN THE FILE */}
      <section aria-labelledby="inside" className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1100px] text-center">
          <Reveal>
            <p className={eyebrow}>What is hidden inside</p>
            <h2 id="inside" className={h2}>Two things travel with your image</h2>
            <p className={lead}>Cropping or re-saving does not reliably remove either one. This tool handles both in a single pass.</p>
          </Reveal>
          <div className="mt-12 grid gap-5 text-left md:grid-cols-2">
            {[
              [FileSearch, 'Metadata in the file', 'EXIF, XMP, ICC, IPTC and C2PA Content Credentials are stored beside the pixels. They can name the software, the author and the date, and they follow the file wherever it is shared.'],
              [Sparkles, 'A visible mark in the picture', 'Some generators stamp a small badge in a corner. We detect known badges and rebuild the pixels underneath. If the match is not certain, the image is left alone.'],
            ].map(([Icon, title, body], i) => (
              <Reveal key={title as string} delay={i * 80} className="h-card p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-h-surface2 text-h-accent">
                  <Icon aria-hidden className="h-5 w-5" />
                </span>
                <h3 className="mt-5 text-[22px] font-semibold tracking-[-0.01em]">{title as string}</h3>
                <p className="mt-2 text-[16px] leading-relaxed text-h-muted">{body as string}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* BEFORE / AFTER REPORT */}
      <section aria-labelledby="report" className="bg-h-surface px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1100px] text-center">
          <Reveal>
            <p className={eyebrow}>Before and after</p>
            <h2 id="report" className={h2}>See what was in the file, and what is left</h2>
            <p className={lead}>Every run produces this report. The numbers below are from a real sample file.</p>
          </Reveal>
          <Reveal delay={100} className="h-card mx-auto mt-12 max-w-[900px] overflow-hidden text-left">
            <div className="flex items-center gap-2 border-b border-h-line px-5 py-3.5">
              <span aria-hidden className="flex gap-1.5">
                <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              </span>
              <span className="ml-2 text-[14px] text-h-muted">Audit report · {SAMPLE.name}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[15px]">
                <thead className="text-left text-[13px] uppercase tracking-[0.06em] text-h-muted">
                  <tr>
                    <th className="px-5 py-3 font-medium">Item</th>
                    <th className="px-5 py-3 font-medium">What it is</th>
                    <th className="px-5 py-3 font-medium">Original</th>
                    <th className="px-5 py-3 font-medium">After cleaning</th>
                  </tr>
                </thead>
                <tbody>
                  {REPORT.map(([item, what, before, after]) => (
                    <tr key={item} className="border-t border-h-line">
                      <td className="px-5 py-4 font-semibold">{item}</td>
                      <td className="px-5 py-4 text-h-muted">{what}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[13px] font-medium ${before === 'None' ? 'bg-h-surface2 text-h-muted' : 'bg-h-danger/10 text-h-danger'}`}>{before}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${after === 'None' ? 'bg-h-surface2 text-h-muted' : 'bg-h-ok/10 text-h-ok'}`}>
                          {after !== 'None' && <Check aria-hidden className="h-3.5 w-3.5" />}
                          {after}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-h-line px-5 py-3.5 text-[14px] text-h-muted">
              Quality against the original: {SAMPLE.psnr} PSNR · Processed in {SAMPLE.ms} · {SAMPLE.dims} px
            </p>
          </Reveal>
        </div>
      </section>

      {/* THREE STEPS */}
      <section aria-labelledby="steps" className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1100px] text-center">
          <Reveal>
            <p className={eyebrow}>How it works</p>
            <h2 id="steps" className={h2}>Three steps to a clean file</h2>
          </Reveal>
          <ol className="mt-12 grid gap-5 text-left md:grid-cols-3">
            {STEPS.map(([Icon, title, body], i) => (
              <li key={title}>
                <Reveal delay={i * 80} className="h-card h-full p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-h-accent text-h-accent-ink">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-[15px] font-semibold text-h-muted">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-[20px] font-semibold tracking-[-0.01em]">{title}</h3>
                  <p className="mt-2 text-[16px] leading-relaxed text-h-muted">{body}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="bg-h-surface">
        <ModeTabs />
      </div>

      {/* PRICING */}
      <section aria-labelledby="pricing" className="px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-[1100px] text-center">
          <Reveal>
            <p className={eyebrow}>Pricing</p>
            <h2 id="pricing" className={h2}>Start free. Pay when you need more.</h2>
            <p className={lead}>One credit cleans one image. Failed runs are refunded automatically.</p>
          </Reveal>
          <div className="mt-12 text-left">
            <PricingTable />
          </div>
        </div>
      </section>

      <div className="bg-h-surface">
        <FaqTiles />
      </div>

      {/* CLOSE */}
      <section aria-labelledby="close" className="px-4 py-20 sm:px-6 sm:py-28">
        <Reveal className="mx-auto max-w-[1100px] rounded-[28px] bg-h-accent px-6 py-16 text-center text-h-accent-ink sm:py-20">
          <h2 id="close" className="mx-auto max-w-[24ch] text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[48px]">
            Clean your first image free
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[18px] opacity-90">No card needed. Free credits are added the moment you sign up.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/register" className="rounded-[12px] bg-white px-7 py-3.5 text-[16px] font-semibold text-[#3a22b8] transition-transform active:scale-[0.98]">
              Create free account
            </Link>
            <a href="#try" className="rounded-[12px] border border-white/40 px-7 py-3.5 text-[16px] font-semibold">
              Try without signing up
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
