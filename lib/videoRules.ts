/**
 * Pure rules for video jobs: limits, pricing and region maths. No Node APIs, so the browser UI and
 * the server share exactly the same numbers.
 */
export const VIDEO_MAX_MB = 200;
export const VIDEO_MAX_SECONDS = 180;
export const VIDEO_MAX_PIXELS = 3840 * 2160;

export type VideoMode = 'metadata-only' | 'remove-mark';

/** Upload content types we accept, mapped to the temp-file extension we choose (never the user's name). */
export const VIDEO_TYPES: Record<string, 'mp4' | 'mov' | 'webm' | 'mkv'> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
};

/** Containers ffprobe must report. Playlists (hls, concat) and image sequences are refused. */
export function isAllowedContainer(formatName: string): boolean {
  const names = formatName.split(',').map((s) => s.trim());
  return names.some((n) => n === 'mp4' || n === 'mov' || n === 'matroska' || n === 'webm');
}

/** Metadata-only is a fast stream copy: 1 credit. Mark removal re-encodes: 1 credit per started 10 seconds. */
export function videoCost(mode: VideoMode, durationSeconds: number): number {
  if (mode === 'metadata-only') return 1;
  return Math.max(1, Math.ceil(durationSeconds / 10));
}

export interface FracRegion { x: number; y: number; w: number; h: number } // fractions of the frame, 0..1
export interface PxRegion { x: number; y: number; w: number; h: number }

/**
 * Converts a fractional region to whole pixels that ffmpeg's delogo accepts: it must sit fully
 * inside the frame with at least a 1px border on every side.
 */
export function toPixelRegion(r: FracRegion, width: number, height: number): PxRegion {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const w = clamp(Math.round(r.w * width), 4, width - 2);
  const h = clamp(Math.round(r.h * height), 4, height - 2);
  const x = clamp(Math.round(r.x * width), 1, width - w - 1);
  const y = clamp(Math.round(r.y * height), 1, height - h - 1);
  return { x, y, w, h };
}

/** Container plumbing that every MP4/WebM has; not user metadata, so it is not reported as "found". */
const STRUCTURAL = new Set(['major_brand', 'minor_version', 'compatible_brands', 'handler_name', 'vendor_id', 'language', 'duration']);

export function userTags(tags: Record<string, unknown> | undefined): string[] {
  return Object.keys(tags ?? {})
    .map((k) => k.toLowerCase())
    .filter((k) => !STRUCTURAL.has(k));
}
