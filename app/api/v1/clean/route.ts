import { NextResponse } from 'next/server';
import { CleanError, cleanForUser, parseCleanForm } from '@/lib/cleanJob';
import { apiError, gate } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';

/** POST multipart: file, mode (metadata-only|balanced|aggressive), format (png|jpeg|webp). Costs 1 credit. */
export async function POST(req: Request) {
  const g = await gate(req);
  if (g.res) return g.res;
  const { keyId, user } = g.ctx;

  try {
    const parsed = parseCleanForm(await req.formData(), 'mode');
    const { buffer, telemetry, jobId } = await cleanForUser({ user, apiKeyId: keyId, req: parsed });
    return NextResponse.json({
      jobId,
      status: 'completed',
      format: parsed.format,
      image: `data:image/${parsed.format};base64,${buffer.toString('base64')}`,
      result: {
        originalBytes: telemetry.originalSize,
        processedBytes: telemetry.processedSize,
        dimensions: telemetry.dimensions,
        executionTimeMs: telemetry.executionTimeMs,
        badgeRemoved: !!telemetry.badgeRemoved,
        provenanceAudit: telemetry.provenanceAudit ?? null,
      },
    });
  } catch (e) {
    if (e instanceof CleanError) return apiError(e.status, (e.code ?? 'error').toLowerCase(), e.message);
    console.error('[v1/clean]', e);
    return apiError(500, 'processing_failed', 'Failed to process image. Credits for failed jobs are refunded.');
  }
}
