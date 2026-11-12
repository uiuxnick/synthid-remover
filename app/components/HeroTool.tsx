'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Film, ImageIcon } from 'lucide-react';
import { Playground } from './Playground';

const VideoWorkspace = dynamic(() => import('./VideoWorkspace').then((m) => m.VideoWorkspace), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-[14px] bg-h-surface" />,
});

type Tab = 'image' | 'video';

/** The homepage tool: images run free in the browser; video runs on the server, so it needs an account. */
export function HeroTool() {
  const [tab, setTab] = useState<Tab>('image');
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    if (tab !== 'video' || signedIn !== null) return;
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSignedIn(!!s?.user))
      .catch(() => setSignedIn(false));
  }, [tab, signedIn]);

  const tabBtn = (t: Tab, label: string, Icon: typeof Film) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => setTab(t)}
      className={`flex items-center gap-2 rounded-[10px] px-4 py-2 text-[15px] font-medium transition-colors ${
        tab === t ? 'bg-h-frag text-h-ink shadow-sm' : 'text-h-muted hover:text-h-ink'
      }`}
    >
      <Icon aria-hidden className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <div>
      <div role="tablist" aria-label="What to clean" className="mx-auto mb-4 flex w-fit gap-1 rounded-[12px] bg-h-surface2 p-1">
        {tabBtn('image', 'Image', ImageIcon)}
        {tabBtn('video', 'Video', Film)}
      </div>

      <div role="tabpanel">
        {tab === 'image' ? (
          <Playground />
        ) : signedIn === null ? (
          <div className="h-72 animate-pulse rounded-[14px] bg-h-surface" />
        ) : signedIn ? (
          <VideoWorkspace embedded />
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed border-h-line bg-h-surface p-8 text-center">
            <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-h-accent text-h-accent-ink">
              <Film aria-hidden className="h-6 w-6" />
            </span>
            <p className="text-[22px] font-semibold tracking-[-0.01em]">Sign in to clean a video</p>
            <p className="mt-2 max-w-[46ch] text-[15px] text-h-muted">
              Video is processed on our servers, so it needs an account. Strip metadata from MP4, MOV, WebM or MKV, or blend out a visible mark.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/register?callbackUrl=/dashboard/video" className="rounded-[10px] bg-h-accent px-6 py-3 text-[16px] font-semibold text-h-accent-ink">
                Create free account
              </Link>
              <Link href="/login?callbackUrl=/dashboard/video" className="rounded-[10px] bg-h-frag px-6 py-3 text-[16px] font-semibold">
                Log in
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
