'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Download, Film, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { VIDEO_MAX_MB, VIDEO_MAX_SECONDS, VIDEO_TYPES, videoCost, type VideoMode } from '@/lib/videoRules';

interface Report {
  mode: VideoMode;
  creditsCharged: number;
  durationS: number;
  width: number;
  height: number;
  inBytes: number;
  outBytes: number;
  ms: number;
  reencoded: boolean;
  tagsFound: string[];
  tagsLeft: string[];
  extraStreamsDropped: number;
}

const CORNERS = ['Bottom right', 'Bottom left', 'Top right', 'Top left'] as const;
type Corner = (typeof CORNERS)[number];
const mb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

export function VideoWorkspace({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<VideoMode>('metadata-only');
  const [corner, setCorner] = useState<Corner>('Bottom right');
  const [boxW, setBoxW] = useState(18); // percent of frame width
  const [boxH, setBoxH] = useState(12); // percent of frame height
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; ext: string; report: Report } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Release object URLs when they are replaced or the page is left.
  useEffect(() => () => { if (src) URL.revokeObjectURL(src); }, [src]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!VIDEO_TYPES[f.type]) return toast.error('Unsupported file', { description: 'Use an MP4, MOV, WebM or MKV video.' });
    if (f.size > VIDEO_MAX_MB * 1024 * 1024) return toast.error('File is too large', { description: `Videos can be up to ${VIDEO_MAX_MB} MB.` });
    setResult(null);
    setDuration(0);
    setFile(f);
    setSrc(URL.createObjectURL(f));
  };

  // The mark region as fractions of the frame, with a 2% margin from the chosen corner.
  const region = (() => {
    const w = boxW / 100;
    const h = boxH / 100;
    const m = 0.02;
    return {
      w,
      h,
      x: corner.endsWith('right') ? 1 - w - m : m,
      y: corner.startsWith('Bottom') ? 1 - h - m : m,
    };
  })();

  const tooLong = duration > VIDEO_MAX_SECONDS;
  const cost = duration ? videoCost(mode, duration) : null;

  const run = async () => {
    if (!file || busy) return;
    setBusy(true);
    try {
      const q = new URLSearchParams({ mode });
      if (mode === 'remove-mark') for (const [k, v] of Object.entries(region)) q.set(k, v.toFixed(4));
      const res = await fetch(`/api/video?${q}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type } });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Could not process this video.');
      }
      const report = JSON.parse(decodeURIComponent(res.headers.get('X-Video-Report') ?? '{}')) as Report;
      const blob = await res.blob();
      const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('matroska') ? 'mkv' : 'mp4';
      setResult({ url: URL.createObjectURL(blob), ext, report });
      toast.success('Video cleaned', { description: `${report.creditsCharged} credit${report.creditsCharged === 1 ? '' : 's'} used.` });
      router.refresh(); // credit balance in the sidebar
    } catch (e: any) {
      toast.error('Video not processed', { description: e.message });
    } finally {
      setBusy(false);
    }
  };

  const seg = (active: boolean) =>
    `rounded-[10px] px-4 py-2.5 text-[15px] font-medium transition-colors ${active ? 'bg-h-accent text-h-accent-ink' : 'bg-h-surface hover:bg-h-surface2'}`;

  return (
    <div className="space-y-6">
      <div className={embedded ? 'sr-only' : ''}>
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Clean a video</h1>
        <p className="mt-2 max-w-[62ch] text-[16px] text-h-muted">
          Remove embedded metadata, or blend out a visible mark in a corner. For videos you own. Up to {VIDEO_MAX_MB} MB and {VIDEO_MAX_SECONDS / 60} minutes.
        </p>
      </div>

      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => input.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
          className={`flex min-h-[280px] cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? 'border-h-accent bg-h-surface2' : 'border-h-line bg-h-surface hover:border-h-accent hover:bg-h-surface2'
          }`}
        >
          <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] bg-h-accent text-h-accent-ink">
            <Upload aria-hidden className="h-6 w-6" />
          </span>
          <p className="text-[22px] font-semibold tracking-[-0.01em]">Drop a video here, or click to choose one</p>
          <p className="mt-2 text-[15px] text-h-muted">MP4, MOV, WebM or MKV</p>
          <p className="mt-6 text-[14px] text-h-muted">Processed on our servers. Not stored after you download.</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-[14px] bg-black">
              <video
                key={result ? result.url : src ?? ''}
                src={result ? result.url : src ?? undefined}
                controls
                playsInline
                onLoadedMetadata={(e) => !result && setDuration(e.currentTarget.duration)}
                className="aspect-video w-full"
              />
              {mode === 'remove-mark' && !result && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute border-2 border-h-accent bg-h-accent/25"
                  style={{ left: `${region.x * 100}%`, top: `${region.y * 100}%`, width: `${region.w * 100}%`, height: `${region.h * 100}%` }}
                />
              )}
            </div>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-h-muted">
              <Film aria-hidden className="h-4 w-4" />
              <span className="min-w-0 truncate text-h-ink">{result ? `cleaned.${result.ext}` : file.name}</span>
              <span>{mb(result ? result.report.outBytes : file.size)}</span>
              {duration > 0 && <span>{duration.toFixed(1)} s</span>}
              <button type="button" className="ml-auto underline underline-offset-4" onClick={() => { setFile(null); setSrc(null); setResult(null); }}>
                Choose another video
              </button>
            </p>
          </div>

          <div className="space-y-5">
            {result ? (
              <div className="h-card space-y-4 p-6">
                <p className="flex items-center gap-2 text-[18px] font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-h-ok/15 text-h-ok"><Check aria-hidden className="h-4 w-4" /></span>
                  Cleaned
                </p>
                <dl className="space-y-3 text-[15px]">
                  <div>
                    <dt className="text-h-muted">Metadata found</dt>
                    <dd className="font-medium">{result.report.tagsFound.length ? result.report.tagsFound.join(', ') : 'None'}</dd>
                  </div>
                  <div>
                    <dt className="text-h-muted">Metadata left</dt>
                    <dd className="font-medium">{result.report.tagsLeft.length ? result.report.tagsLeft.join(', ') : 'None'}</dd>
                  </div>
                  <div>
                    <dt className="text-h-muted">Picture and sound</dt>
                    <dd className="font-medium">{result.report.reencoded ? 'Re-encoded with the marked area blended out' : 'Untouched (stream copy)'}</dd>
                  </div>
                  <div>
                    <dt className="text-h-muted">Size and time</dt>
                    <dd className="font-medium tabular-nums">{mb(result.report.inBytes)} to {mb(result.report.outBytes)} in {(result.report.ms / 1000).toFixed(1)} s</dd>
                  </div>
                </dl>
                <a href={result.url} download={`cleaned.${result.ext}`} className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-h-accent text-[16px] font-semibold text-h-accent-ink">
                  <Download aria-hidden className="h-4 w-4" /> Download video
                </a>
              </div>
            ) : (
              <>
                <fieldset>
                  <legend className="text-[14px] font-medium">What to do</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button type="button" aria-pressed={mode === 'metadata-only'} onClick={() => setMode('metadata-only')} className={seg(mode === 'metadata-only')}>Metadata only</button>
                    <button type="button" aria-pressed={mode === 'remove-mark'} onClick={() => setMode('remove-mark')} className={seg(mode === 'remove-mark')}>Remove a mark</button>
                  </div>
                  <p className="mt-2 text-[14px] text-h-muted">
                    {mode === 'metadata-only'
                      ? 'Strips titles, comments, software tags, chapters and extra data tracks. Picture and sound are copied untouched.'
                      : 'Blends out the area shown on the video for the whole clip. The video is re-encoded, so expect a small quality change.'}
                  </p>
                </fieldset>

                {mode === 'remove-mark' && (
                  <fieldset className="space-y-4">
                    <legend className="text-[14px] font-medium">Where is the mark?</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {CORNERS.map((c) => (
                        <button key={c} type="button" aria-pressed={corner === c} onClick={() => setCorner(c)} className={seg(corner === c)}>{c}</button>
                      ))}
                    </div>
                    <label className="block text-[14px]">
                      <span className="flex justify-between"><span className="font-medium">Width</span><span className="tabular-nums text-h-muted">{boxW}%</span></span>
                      <input type="range" min={5} max={45} value={boxW} onChange={(e) => setBoxW(Number(e.target.value))} className="mt-1 w-full accent-[var(--h-accent)]" />
                    </label>
                    <label className="block text-[14px]">
                      <span className="flex justify-between"><span className="font-medium">Height</span><span className="tabular-nums text-h-muted">{boxH}%</span></span>
                      <input type="range" min={4} max={40} value={boxH} onChange={(e) => setBoxH(Number(e.target.value))} className="mt-1 w-full accent-[var(--h-accent)]" />
                    </label>
                  </fieldset>
                )}

                {tooLong && <p role="alert" className="text-[15px] text-h-danger">This video is longer than {VIDEO_MAX_SECONDS / 60} minutes. Trim it and try again.</p>}

                <button
                  type="button"
                  onClick={run}
                  disabled={busy || tooLong || !duration}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-h-accent text-[16px] font-semibold text-h-accent-ink transition-transform active:scale-[0.99] disabled:opacity-60"
                >
                  {busy ? (<><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Processing…</>) : cost ? `Clean video · ${cost} credit${cost === 1 ? '' : 's'}` : 'Reading video…'}
                </button>
                <p className="text-[14px] text-h-muted">Metadata only costs 1 credit. Removing a mark costs 1 credit per 10 seconds. Failed runs are refunded.</p>
              </>
            )}
          </div>
        </div>
      )}
      <input ref={input} type="file" accept={Object.keys(VIDEO_TYPES).join(',')} className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}
