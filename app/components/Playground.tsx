'use client';

import dynamic from 'next/dynamic';

// Heavy image-processing bundle is loaded only on the client and off the critical path (LCP).
const Workspace = dynamic(() => import('./Workspace').then((m) => m.Workspace), {
  ssr: false,
  loading: () => (
    <div className="h-96 animate-pulse rounded-xl border border-h-line bg-h-surface  " />
  ),
});

export function Playground() {
  return <Workspace mode="trial" />;
}
