'use client';

import React, { useEffect, useState } from 'react';
import type { PublicStats } from '@/app/api/stats/route';

function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (target <= 0) return setV(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-h-line bg-h-surface p-5  ">
      <p className=" text-[13px]   text-h-muted">{label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-h-muted">{sub}</p>}
    </div>
  );
}

/** Shows real aggregates when the API has data; otherwise honest static targets, never invented numbers. */
export function Stats() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const images = useCountUp(stats?.imagesCleaned ?? 0);
  const hasData = !!stats?.live && stats.imagesCleaned > 0;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {hasData ? (
        <Tile label="Images cleaned" value={images.toLocaleString()} sub="completed jobs, updated every minute" />
      ) : (
        <Tile label="Metadata removal" value="100%" sub="EXIF, XMP and C2PA blocks, verified by audit" />
      )}
      {hasData && stats?.avgPsnr ? (
        <Tile label="Average PSNR" value={`${stats.avgPsnr} dB`} sub="measured against the original" />
      ) : (
        <Tile label="Fidelity target" value="≥ 38 dB" sub="PSNR in Balanced mode" />
      )}
      <Tile label="Metadata-only mode" value="Lossless" sub="bit-for-bit identical pixels" />
    </div>
  );
}
