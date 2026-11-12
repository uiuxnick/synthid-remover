'use client';

import dynamic from 'next/dynamic';

const Workspace = dynamic(() => import('./Workspace').then((m) => m.Workspace), {
  ssr: false,
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-h-surface " />,
});

export function WorkspaceClient() {
  return <Workspace mode="full" />;
}
