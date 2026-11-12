import { createHash } from 'crypto';
import { prisma } from '@/lib/db';
import { InsufficientCreditsError, getAppConfig, refundJobCredits, spendCredits } from '@/lib/credits';
import { sendTemplated } from '@/lib/emailTemplates';
import { processImagePipeline, type DisruptionMode } from '@/lib/imageProcessor';

export const JOB_COST = 1;

export class CleanError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
  }
}

const MODES = { 'metadata-only': 'METADATA_ONLY', balanced: 'BALANCED', aggressive: 'AGGRESSIVE' } as const;
const FORMATS = ['png', 'jpeg', 'webp'] as const;
type Format = (typeof FORMATS)[number];

export interface CleanRequest {
  file: File;
  stripMetadata: boolean;
  disruptSignals: boolean;
  removeVisibleBadge: boolean;
  format: Format;
  mode: DisruptionMode;
  strength: number;
}

/** Parses and validates untrusted form fields (never interpolate raw strings into data URLs). */
export function parseCleanForm(fd: FormData, modeField: 'disruptionMode' | 'mode' = 'disruptionMode'): CleanRequest {
  const file = fd.get('file');
  if (!(file instanceof File)) throw new CleanError('No image file provided.', 400, 'NO_FILE');
  const format = String(fd.get('format') ?? 'png') as Format;
  if (!FORMATS.includes(format)) throw new CleanError('format must be png, jpeg or webp.', 400, 'BAD_FORMAT');
  const mode = String(fd.get(modeField) ?? 'balanced') as DisruptionMode;
  if (!(mode in MODES)) throw new CleanError('mode must be metadata-only, balanced or aggressive.', 400, 'BAD_MODE');
  const raw = parseInt(String(fd.get('disruptionStrength') ?? '75'), 10);
  return {
    file,
    format,
    mode,
    strength: Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : 75,
    stripMetadata: fd.get('stripMetadata') !== 'false',
    disruptSignals: fd.get('disruptSignals') !== 'false',
    removeVisibleBadge: fd.get('removeVisibleBadge') !== 'false',
  };
}

export async function assertUploadSize(file: File) {
  const cfg = await getAppConfig();
  if (file.size > cfg.maxUploadMb * 1024 * 1024) {
    throw new CleanError(`File exceeds the ${cfg.maxUploadMb} MB limit.`, 413, 'TOO_LARGE');
  }
  return cfg;
}

function run(buf: Buffer, r: CleanRequest) {
  return processImagePipeline(buf, {
    stripMetadata: r.stripMetadata,
    disruptSignals: r.disruptSignals,
    disruptionMode: r.mode,
    disruptionStrength: r.strength,
    removeVisibleBadge: r.removeVisibleBadge,
    targetFormat: r.format,
    quality: 95,
  });
}

/** Anonymous trial run: no job row, no charge. The caller enforces the trial limit. */
export async function cleanAnonymous(r: CleanRequest) {
  await assertUploadSize(r.file);
  return run(Buffer.from(await r.file.arrayBuffer()), r);
}

/**
 * Charged run shared by the dashboard (/api/process) and the public API (/api/v1/clean).
 * Order matters: validate, record job, atomically deduct, process, finalise. Any failure after the
 * deduction refunds exactly once.
 */
export async function cleanForUser(args: {
  user: { id: string; email?: string | null; name?: string | null };
  apiKeyId?: string;
  req: CleanRequest;
}) {
  const { user, req: r } = args;
  const cfg = await assertUploadSize(r.file);
  const input = Buffer.from(await r.file.arrayBuffer());

  const job = await prisma.imageJob.create({
    data: {
      userId: user.id,
      apiKeyId: args.apiKeyId,
      originalHash: createHash('sha256').update(input).digest('hex'),
      mode: MODES[r.mode],
      status: 'PROCESSING',
      creditsCharged: JOB_COST,
      inputBytes: input.length,
    },
  });

  let charged = false;
  try {
    let balance: number;
    try {
      balance = await spendCredits(user.id, JOB_COST, job.id);
      charged = true;
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        // A rejected request is not a job: drop the placeholder row so history and failure stats stay clean.
        await prisma.imageJob.delete({ where: { id: job.id } }).catch(() => {});
        throw new CleanError('You are out of credits.', 402, 'INSUFFICIENT_CREDITS');
      }
      throw e;
    }
    if (balance === cfg.lowCreditThreshold - JOB_COST && user.email) {
      void sendTemplated('lowCredit', user.email, {
        name: user.name ?? 'there',
        balance: String(balance),
        billingUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/billing`,
      });
    }

    const { buffer, telemetry } = await run(input, r);
    await prisma.imageJob
      .update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          processingTimeMs: telemetry.executionTimeMs,
          badgeDetected: !!telemetry.badgeDetails?.applied,
          outputBytes: buffer.length,
        },
      })
      .catch((e) => console.error('job update failed', e));
    return { buffer, telemetry, jobId: job.id };
  } catch (e) {
    if (charged) {
      await refundJobCredits(user.id, JOB_COST, job.id).catch((err) => console.error('refund failed', err));
      await prisma.imageJob
        .update({
          where: { id: job.id },
          data: { status: 'FAILED', creditsCharged: 0, errorMessage: String((e as Error)?.message).slice(0, 300) },
        })
        .catch(() => {});
    }
    throw e;
  }
}
