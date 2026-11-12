import { spawn } from 'child_process';
import { stat } from 'fs/promises';
import {
  VIDEO_MAX_PIXELS,
  VIDEO_MAX_SECONDS,
  isAllowedContainer,
  toPixelRegion,
  userTags,
  type FracRegion,
  type VideoMode,
} from '@/lib/videoRules';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

export class VideoError extends Error {
  constructor(message: string, public status = 400, public code = 'BAD_VIDEO') {
    super(message);
  }
}

/**
 * Runs a binary with an argument array (never a shell string), a hard timeout and capped stderr.
 * `-protocol_whitelist file` is passed by callers so a crafted container cannot make ffmpeg fetch
 * URLs or read other local files.
 */
function run(bin: string, args: string[], timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new VideoError('Processing took too long and was stopped.', 504, 'TIMEOUT'));
    }, timeoutMs);
    child.stdout.on('data', (d) => (out.length < 2_000_000 ? (out += d) : null));
    child.stderr.on('data', (d) => (err.length < 20_000 ? (err += d) : null));
    child.on('error', (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(e.code === 'ENOENT' ? new VideoError('Video processing is not available on this server.', 503, 'NO_FFMPEG') : e);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`${bin} exited with ${code}: ${err.slice(-600)}`));
    });
  });
}

export interface VideoInfo {
  container: string;
  durationS: number;
  width: number;
  height: number;
  videoCodec: string;
  hasAudio: boolean;
  /** User-facing metadata keys found on the container and on each stream. */
  tags: string[];
  /** Streams other than video/audio (subtitles, data, attachments), which are dropped on output. */
  extraStreams: number;
}

export async function probeVideo(path: string): Promise<VideoInfo> {
  let json: any;
  try {
    json = JSON.parse(
      await run(FFPROBE, ['-v', 'error', '-protocol_whitelist', 'file', '-show_format', '-show_streams', '-of', 'json', path], 20_000)
    );
  } catch (e) {
    if (e instanceof VideoError) throw e;
    throw new VideoError('This file could not be read as a video.');
  }
  const format = json?.format ?? {};
  const streams: any[] = json?.streams ?? [];
  if (!isAllowedContainer(String(format.format_name ?? ''))) {
    throw new VideoError('Unsupported container. Use MP4, MOV, WebM or MKV.', 415, 'UNSUPPORTED');
  }
  const v = streams.find((s) => s.codec_type === 'video' && s.disposition?.attached_pic !== 1);
  if (!v) throw new VideoError('No video track found in this file.');
  const durationS = Number(format.duration ?? v.duration ?? 0);
  if (!Number.isFinite(durationS) || durationS <= 0) throw new VideoError('Could not read the video length.');
  if (durationS > VIDEO_MAX_SECONDS) {
    throw new VideoError(`Videos can be up to ${VIDEO_MAX_SECONDS} seconds long.`, 413, 'TOO_LONG');
  }
  const width = Number(v.width);
  const height = Number(v.height);
  if (!width || !height || width * height > VIDEO_MAX_PIXELS) throw new VideoError('Videos can be up to 4K resolution.', 413, 'TOO_LARGE');

  const tags = new Set<string>(userTags(format.tags));
  for (const s of streams) for (const t of userTags(s.tags)) tags.add(t);
  return {
    container: String(format.format_name),
    durationS,
    width,
    height,
    videoCodec: String(v.codec_name ?? 'unknown'),
    hasAudio: streams.some((s) => s.codec_type === 'audio'),
    tags: Array.from(tags).sort(),
    extraStreams: streams.filter((s) => s.codec_type !== 'video' && s.codec_type !== 'audio').length,
  };
}

// Drops container + stream metadata and chapters, and stops ffmpeg writing its own encoder tags.
const STRIP = ['-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact'];

export interface VideoResult {
  mode: VideoMode;
  before: VideoInfo;
  after: VideoInfo;
  inBytes: number;
  outBytes: number;
  ms: number;
  reencoded: boolean;
}

/**
 * metadata-only: stream copy, so picture and sound are bit-for-bit the same and only the wrapper changes.
 * remove-mark:   re-encodes the picture with ffmpeg's delogo over the chosen region; audio is kept.
 * Only the video and audio tracks are mapped, which also drops data/subtitle/attachment streams.
 */
export async function processVideo(args: {
  input: string;
  output: string;
  mode: VideoMode;
  region?: FracRegion;
  outExt: 'mp4' | 'webm' | 'mkv';
}): Promise<VideoResult> {
  const started = Date.now();
  const before = await probeVideo(args.input);
  const base = ['-y', '-v', 'error', '-protocol_whitelist', 'file', '-i', args.input, '-map', '0:v:0', '-map', '0:a?'];
  const tail = args.outExt === 'mp4' ? ['-movflags', '+faststart', args.output] : [args.output];

  let ffArgs: string[];
  if (args.mode === 'metadata-only') {
    ffArgs = [...base, ...STRIP, '-c', 'copy', ...tail];
  } else {
    if (!args.region) throw new VideoError('Choose the area that contains the mark.');
    const r = toPixelRegion(args.region, before.width, before.height);
    ffArgs = [
      ...base,
      ...STRIP,
      '-vf', `delogo=x=${r.x}:y=${r.y}:w=${r.w}:h=${r.h}`,
      '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k',
      // ffmpeg stamps an `encoder` tag on streams it encodes, and x264 writes its settings into an SEI
      // message inside the bitstream. Blank the tag and drop the SEI so the output names no software.
      '-metadata:s:v', 'encoder=', '-metadata:s:a', 'encoder=',
      '-bsf:v', 'filter_units=remove_types=6',
      ...tail,
    ];
  }
  // Generous but bounded: stream copy is near-instant; re-encode gets ~20x realtime headroom.
  await run(FFMPEG, ffArgs, args.mode === 'metadata-only' ? 60_000 : Math.max(120_000, before.durationS * 20_000));

  const after = await probeVideo(args.output);
  const [inStat, outStat] = await Promise.all([stat(args.input), stat(args.output)]);
  return { mode: args.mode, before, after, inBytes: inStat.size, outBytes: outStat.size, ms: Date.now() - started, reencoded: args.mode !== 'metadata-only' };
}
