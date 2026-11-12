'use client';

import { useState } from 'react';
import { AuditRow } from './AuditRow';
import { Reveal } from './Reveal';

/** One file shown three times: as it arrives, with its actions revealed, and finished. The middle one is live. */
export function Showcase() {
  const [done, setDone] = useState(false);
  const rows = [
    { word: 'Arrives', node: <AuditRow state="arrived" /> },
    { word: done ? 'Cleaned' : 'Your move', node: <AuditRow state={done ? 'done' : 'hover'} onClean={() => setDone(true)} /> },
    { word: 'Finished', node: <AuditRow state="done" /> },
  ];
  return (
    <section aria-labelledby="states" className="py-24 sm:py-32">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:grid lg:grid-cols-12 lg:gap-x-6">
        <Reveal className="lg:col-start-4 lg:col-span-6">
          <h2 id="states" className="text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]">
            Every change, itemised
          </h2>
        </Reveal>
        <div className="mt-12 space-y-12 lg:col-span-12 lg:mt-24 lg:space-y-14">
          {rows.map((r, i) => (
            <Reveal key={r.word} delay={i * 80} className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-6">
              <p className="mb-2.5 text-[17px] text-h-muted lg:col-span-3 lg:mb-0 lg:text-right lg:text-[22px]">{r.word}</p>
              <div className="lg:col-span-6 overflow-hidden">{r.node}</div>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 text-[13px] text-h-muted lg:col-start-4 lg:col-span-6">
          Sample file. The figures come from this tool&apos;s own pipeline on a test image.
        </p>
      </div>
    </section>
  );
}
