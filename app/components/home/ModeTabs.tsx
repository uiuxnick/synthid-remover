'use client';

import { useState } from 'react';
import { MODES } from './sample';

const NAMES = Object.keys(MODES) as (keyof typeof MODES)[];

export function ModeTabs() {
  const [tab, setTab] = useState<keyof typeof MODES>('Balanced');
  const m = MODES[tab];
  const bands: [string, string, string][] = [
    ['5 types', 'Metadata blocks removed', 'EXIF, XMP, C2PA, ICC and IPTC are listed before and after.'],
    ['Optional', 'Visible corner badges', 'On by default. Switch it off to leave the pixels you drew alone.'],
    [m.psnr, 'Quality against the original', tab === 'Metadata only' ? m.note : `PSNR on our 1200 × 655 test photo. ${m.note}`],
    [m.ms, 'Time on the same photo', 'Measured by the pipeline, shown in the results panel.'],
  ];

  return (
    <section aria-labelledby="modes" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-[1100px]">
        <div className="text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-h-accent">Modes</p>
          <h2 id="modes" className="mx-auto mt-3 max-w-[20ch] text-[34px] font-bold leading-[1.1] tracking-[-0.025em] sm:text-[44px]">Pick how much changes</h2>
          <p className="mx-auto mt-4 max-w-[58ch] text-[18px] leading-relaxed text-h-muted">Each mode trades speed and pixel changes differently. These are measured results on one test photo.</p>
        </div>

        <div className="mt-14 flex flex-col gap-4 lg:flex-row lg:gap-10">
          <div role="tablist" aria-label="Processing mode" className="flex gap-1.5 overflow-x-auto lg:w-[150px] lg:shrink-0 lg:flex-col">
            {NAMES.map((n) => (
              <button
                key={n}
                role="tab"
                aria-selected={tab === n}
                onClick={() => setTab(n)}
                className={`h-16 min-w-[110px] flex-1 px-3 text-left text-[16px] lg:flex-none ${
                  tab === n ? 'bg-h-accent text-h-accent-ink' : 'bg-h-frag hover:bg-h-surface2'
                } rounded-[10px] transition-colors`}
              >
                {n}
              </button>
            ))}
          </div>
          <ul role="tabpanel" className="flex-1 space-y-1">
            {bands.map(([value, title, note], i) => (
              <li
                key={title}
                className={`grid items-center gap-x-6 gap-y-1 rounded-[14px] px-5 py-4 sm:grid-cols-[140px_1fr] bg-h-frag`}
              >
                <span className="text-[20px] font-medium tabular-nums">{value}</span>
                <span>
                  <span className="block text-[18px] font-medium">{title}</span>
                  <span className="block text-[14px] text-h-muted">{note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
