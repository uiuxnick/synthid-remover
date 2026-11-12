'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { SAMPLE } from './sample';

const STAGES = [
  { name: 'Drop', clause: 'First, drop in an image you own.' },
  { name: 'Scan', clause: 'Then, we scan every block.' },
  { name: 'Clean', clause: 'Next, we clean what we find.' },
  { name: 'Check', clause: 'Last, check the proof.' },
] as const;

const frag = 'w-full max-w-[440px] rounded-md border border-h-line bg-h-frag p-5 text-h-ink';
const chip = 'rounded-[6px] bg-h-surface2 px-2 py-0.5 text-[13px]';

function Fragment({ stage }: { stage: number }) {
  if (stage === 0)
    return (
      <div data-ui className={frag}>
        <div className="flex h-44 flex-col items-center justify-center rounded-md border border-dashed border-h-line text-center">
          <p className="text-[15px] font-medium">Drop an image here</p>
          <p className="mt-1 text-[13px] text-h-muted">JPG, PNG, WEBP, AVIF or HEIC</p>
        </div>
      </div>
    );
  if (stage === 1)
    return (
      <div data-ui className={frag}>
        <p className="mb-3 text-[15px] font-medium">{SAMPLE.name}</p>
        <ul className="space-y-2 text-[14px]">
          {[
            ['EXIF', 'Found'],
            ['ICC profile', 'Found'],
            ['XMP', 'None'],
            ['C2PA', 'None'],
            ['IPTC', 'None'],
          ].map(([k, v]) => (
            <li key={k} className="flex items-center justify-between rounded-[6px] bg-h-surface px-3 py-2">
              <span>{k}</span>
              <span className={v === 'Found' ? 'font-semibold' : 'text-h-muted'}>{v}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  if (stage === 2)
    return (
      <div data-ui className={frag}>
        <div className="relative mb-3 aspect-[1200/655] overflow-hidden rounded-[6px]">
          <Image src="/hero-watermarked.jpg" alt="Original image with a corner badge" fill sizes="440px" className="object-cover" />
        </div>
        <ul className="space-y-1.5 text-[14px]">
          <li>EXIF and ICC blocks removed</li>
          <li>{SAMPLE.badge} (validated match)</li>
          <li className="text-h-muted">Pixels re-encoded in Balanced mode</li>
        </ul>
      </div>
    );
  return (
    <div data-ui className={frag}>
      <div className="relative mb-3 aspect-[1200/655] overflow-hidden rounded-[6px]">
        <Image src="/hero-cleaned.jpg" alt="Cleaned image" fill sizes="440px" className="object-cover" />
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={chip}>Re-scan: clean</span>
        <span className={chip}>{SAMPLE.psnr} PSNR</span>
        <span className={chip}>MSE {SAMPLE.mse}</span>
        <span className={chip}>{SAMPLE.ms}</span>
      </div>
    </div>
  );
}

export function StageSlider() {
  const [stage, setStage] = useState(0);
  const id = useId();
  const pct = (stage / (STAGES.length - 1)) * 100;

  return (
    <section aria-labelledby={`${id}-h`} className="bg-h-surface">
      <div className="mx-auto flex min-h-[88svh] max-w-[1440px] flex-col">
        <div className="grid flex-1 lg:grid-cols-2">
          {/* The clause is the heading; its fragment sits in the opposite field. */}
          <div className="order-2 px-4 pb-8 pt-10 sm:px-8 lg:order-1 lg:pt-20">
            <h2
              id={`${id}-h`}
              aria-live="polite"
              className="h-fade max-w-[14ch] text-[9vw] font-semibold leading-[1.02] tracking-[-0.03em] sm:text-[clamp(40px,4.6vw,76px)] lg:text-[clamp(40px,4.6vw,76px)]"
            >
              {STAGES[stage].clause}
            </h2>
          </div>
          <div className="order-1 flex min-h-[46svh] items-center justify-center bg-h-surface2 px-4 py-10 sm:px-8 lg:order-2">
            <div key={stage} className="h-fade w-full max-w-[440px] animate-[fadeIn_0.2s_ease]">
              <Fragment stage={stage} />
            </div>
          </div>
        </div>
        <div className="px-4 pb-8 pt-6 sm:px-8">
          <div className="relative">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 bg-h-ink/20" />
            <div className="pointer-events-none absolute left-0 top-1/2 h-2 -translate-y-1/2 bg-h-ink" style={{ width: `${pct}%` }} />
            <input
              className="h-range relative"
              type="range"
              min={0}
              max={STAGES.length - 1}
              step={1}
              value={stage}
              onChange={(e) => setStage(Number(e.target.value))}
              aria-label="How it works: choose a stage"
              aria-valuetext={STAGES[stage].name}
            />
          </div>
          <ol className="mt-2 grid grid-cols-2 gap-y-2 text-[15px] sm:grid-cols-4 sm:text-[16px]">
            {STAGES.map((s, i) => (
              <li key={s.name} className={i === stage ? 'text-h-ink' : 'text-h-muted'}>
                <button type="button" onClick={() => setStage(i)} className="py-1 text-left">
                  {s.name}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
