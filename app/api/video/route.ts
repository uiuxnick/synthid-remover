import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { Readable } from 'stream';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { InsufficientCreditsError, getAppConfig, refundJobCredits, spendCredits } from '@/lib/credits';
import { rateLimit } from '@/lib/ratelimit';
import { VideoError, probeVideo, processVideo } from '@/lib/videoProcessor';
import { VIDEO_MAX_MB, VIDEO_TYPES, videoCost } from '@/lib/videoRules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;
const frac = z.coerce.number().min(0).max(1);
const query = z.object({
  mode: z.enum(['metadata-only', 'remove-mark']),
  x: frac.optional(),
  y: frac.optional(),
  w: frac.optional(),
  h: frac.optional(),
});

// ffmpeg is CPU-heavy: cap how many run at once on this instance.
let running = 0;
const MAX_CONCURRENT = 2;

const fail = (status: number, error: string, code: string) => NextResponse.json({ error, code }, { status });

/** Streams the request body to disk with a hard byte cap, hashing as it goes. Never buffers the file in memory. */
async function saveBody(body: ReadableStream<Uint8Array>, file: string): Promise<{ bytes: number; sha256: string }> {
  const hash = createHash('sha256');
  const out = createWriteStream(file, { flags: 'wx', mode: 0o600 });
  let bytes = 0;
  const reader = body.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw new VideoError(`Videos can be up to ${VIDEO_MAX_MB} MB.`, 413, 'TOO_LARGE');
      hash.update(value);
      if (!out.write(value)) await new Promise<void>((r) => out.once('drain', () => r()));
    }
  } finally {
    await new Promise<void>((r) => out.end(() => r()));
  }
  return { bytes, sha256: hash.digest('hex') };
}

/**
 * POST /api/video?mode=metadata-only|remove-mark[&x=&y=&w=&h=]   body: the raw video file.
 * Signed-in only. Order: cheap checks, save to a private temp dir, probe, charge, process, stream back.
 * Anything that fails after the charge is refunded once.
 */
export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user?.id ? session.user : null;
  if (!user) return fail(401, 'Sign in to clean videos.', 'UNAUTHENTICATED');

  const cfg = await getAppConfig();
  const rl = await rateLimit(`video:${user.id}`, Math.max(2, Math.floor(cfg.rateLimitPerMin / 5)));
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests.', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });

  const q = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) return fail(400, 'Invalid options.', 'BAD_REQUEST');
  const { mode } = q.data;
  const region = mode === 'remove-mark' ? { x: q.data.x, y: q.data.y, w: q.data.w, h: q.data.h } : undefined;
  if (region && Object.values(region).some((v) => v === undefined)) return fail(400, 'Choose the area that contains the mark.', 'NO_REGION');

  const ext = VIDEO_TYPES[(req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()];
  if (!ext) return fail(415, 'Unsupported file type. Use MP4, MOV, WebM or MKV.', 'UNSUPPORTED');
  const declared = Number(req.headers.get('content-length'));
  if (!Number.isFinite(declared) || declared <= 0) return fail(411, 'Upload size is required.', 'LENGTH_REQUIRED');
  if (declared > MAX_BYTES) return fail(413, `Videos can be up to ${VIDEO_MAX_MB} MB.`, 'TOO_LARGE');
  if (!req.body) return fail(400, 'No video in the request.', 'NO_FILE');

  if (running >= MAX_CONCURRENT) return NextResponse.json({ error: 'The video queue is busy. Try again in a minute.', code: 'BUSY' }, { status: 503, headers: { 'Retry-After': '30' } });
  running++;

  // Private per-request directory; names are ours, never taken from the upload.
  const dir = await mkdtemp(path.join(tmpdir(), 'vclean-'));
  const cleanup = () => rm(dir, { recursive: true, force: true }).catch(() => {});
  const input = path.join(dir, `in.${ext}`);
  const outExt = mode === 'remove-mark' ? 'mp4' : ext === 'mov' ? 'mp4' : ext;
  const output = path.join(dir, `out.${outExt}`);

  let jobId: string | null = null;
  let charged = 0;
  try {
    const saved = await saveBody(req.body, input);
    const info = await probeVideo(input); // validates container, length and resolution before any charge
    const cost = videoCost(mode, info.durationS);

    const job = await prisma.imageJob.create({
      data: {
        userId: user.id,
        mediaType: 'video',
        originalHash: saved.sha256,
        mode: mode === 'metadata-only' ? 'METADATA_ONLY' : 'BALANCED',
        status: 'PROCESSING',
        creditsCharged: cost,
        inputBytes: saved.bytes,
        durationMs: Math.round(info.durationS * 1000),
      },
    });
    jobId = job.id;

    try {
      await spendCredits(user.id, cost, job.id, `video ${mode}`);
      charged = cost;
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        await prisma.imageJob.delete({ where: { id: job.id } }).catch(() => {});
        jobId = null;
        running--;
        await cleanup();
        return fail(402, `This video needs ${cost} credit${cost === 1 ? '' : 's'}. Top up on the Billing page.`, 'INSUFFICIENT_CREDITS');
      }
      throw e;
    }

    const result = await processVideo({ input, output, mode, region: region as { x: number; y: number; w: number; h: number } | undefined, outExt });

    await prisma.imageJob
      .update({ where: { id: job.id }, data: { status: 'COMPLETED', processingTimeMs: result.ms, outputBytes: result.outBytes } })
      .catch((e) => console.error('video job update failed', e));

    const report = {
      jobId: job.id,
      mode,
      creditsCharged: cost,
      durationS: Number(info.durationS.toFixed(2)),
      width: info.width,
      height: info.height,
      inBytes: result.inBytes,
      outBytes: result.outBytes,
      ms: result.ms,
      reencoded: result.reencoded,
      tagsFound: result.before.tags,
      tagsLeft: result.after.tags,
      extraStreamsDropped: result.before.extraStreams,
    };

    const file = createReadStream(output);
    file.once('close', () => { running--; void cleanup(); });
    file.once('error', () => { running--; void cleanup(); });
    return new Response(Readable.toWeb(file) as ReadableStream, {
      headers: {
        'Content-Type': outExt === 'mp4' ? 'video/mp4' : outExt === 'webm' ? 'video/webm' : 'video/x-matroska',
        'Content-Length': String(result.outBytes),
        'Content-Disposition': `attachment; filename="cleaned.${outExt}"`,
        'Cache-Control': 'no-store',
        'X-Video-Report': encodeURIComponent(JSON.stringify(report)),
      },
    });
  } catch (e) {
    running--;
    await cleanup();
    if (jobId && charged) {
      await refundJobCredits(user.id, charged, jobId).catch((err) => console.error('video refund failed', err));
      await prisma.imageJob
        .update({ where: { id: jobId }, data: { status: 'FAILED', creditsCharged: 0, errorMessage: String((e as Error)?.message).slice(0, 300) } })
        .catch(() => {});
    } else if (jobId) {
      await prisma.imageJob.delete({ where: { id: jobId } }).catch(() => {});
    }
    if (e instanceof VideoError) return fail(e.status, e.message, e.code);
    console.error('[video]', e);
    return fail(500, 'Could not process this video. You have not been charged.', 'PROCESSING_FAILED');
  }
}
