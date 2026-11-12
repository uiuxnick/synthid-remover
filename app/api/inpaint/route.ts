import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { InsufficientCreditsError, getAppConfig, refundJobCredits, spendCredits } from '@/lib/credits';
import { clientIp, consumeAnonTrial, rateLimit } from '@/lib/ratelimit';
import { applyInpaintMask, stripMetadata, disruptEmbeddedSignals } from '@/lib/imageProcessor';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user?.id ? session.user : null;
  const ip = clientIp(req);
  const refId = randomUUID(); // ledger reference for this run (inpaint has no ImageJob row)
  let charged = false;
  try {
    const cfg = await getAppConfig();
    const rl = await rateLimit(user ? `u:${user.id}` : `ip:${ip}`, cfg.rateLimitPerMin);
    if (!rl.ok) {
      return NextResponse.json({ error: 'Too many requests.', code: 'RATE_LIMITED' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
    }
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const maskFile = formData.get('mask') as File | null;
    const format = String(formData.get('format') ?? 'png') as 'jpeg' | 'png' | 'webp';
    if (!['png', 'jpeg', 'webp'].includes(format)) {
      return NextResponse.json({ error: 'format must be png, jpeg or webp.' }, { status: 400 });
    }

    if (!imageFile || !maskFile) {
      return NextResponse.json(
        { error: 'Both original image and binary brush mask are required.' },
        { status: 400 }
      );
    }

    const maxBytes = cfg.maxUploadMb * 1024 * 1024;
    if (imageFile.size > maxBytes || maskFile.size > maxBytes) {
      return NextResponse.json({ error: `File exceeds the ${cfg.maxUploadMb} MB limit.` }, { status: 413 });
    }

    // Same billing rules as /api/process: signed-in users pay 1 credit, anonymous users use the IP trial.
    if (user) {
      try {
        await spendCredits(user.id, 1, refId, 'inpaint');
        charged = true;
      } catch (e) {
        if (e instanceof InsufficientCreditsError) {
          return NextResponse.json({ error: 'You are out of credits.', code: 'INSUFFICIENT_CREDITS' }, { status: 402 });
        }
        throw e;
      }
    } else if (!(await consumeAnonTrial(ip, cfg.anonTrialRuns))) {
      return NextResponse.json({ error: 'Free trial used up. Create an account to continue.', code: 'TRIAL_EXHAUSTED' }, { status: 403 });
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const maskBuffer = Buffer.from(await maskFile.arrayBuffer());

    const startTime = Date.now();
    const logs: string[] = [];

    logs.push(`[INPAINT] Received image (${(imageBuffer.length / 1024).toFixed(1)} KB) & brush mask`);
    logs.push(`[INPAINT] Analyzing painted region stencil...`);

    // Apply canvas visual inpainting patch
    let inpaintedBuffer = await applyInpaintMask(imageBuffer, maskBuffer);
    logs.push(`[INPAINT] Reconstructed underlying visual details via spatial neighborhood blending.`);

    // Wipe metadata as standard baseline
    inpaintedBuffer = await stripMetadata(inpaintedBuffer, format);
    logs.push(`[SUCCESS] Wiped C2PA Content Credentials & EXIF headers.`);

    // Optional SynthID signal disruption post-inpaint
    inpaintedBuffer = await disruptEmbeddedSignals(inpaintedBuffer, format, 95);
    logs.push(`[SUCCESS] Disrupting frequency signals on final composite.`);

    const executionTimeMs = Date.now() - startTime;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    const base64Image = `data:${mimeType};base64,${inpaintedBuffer.toString('base64')}`;

    return NextResponse.json({
      success: true,
      filename: imageFile.name,
      format,
      base64Image,
      telemetry: {
        originalSize: imageBuffer.length,
        processedSize: inpaintedBuffer.length,
        executionTimeMs,
        logs,
      },
    });
  } catch (error: any) {
    console.error('Inpaint Error:', error);
    if (user && charged) await refundJobCredits(user.id, 1, refId).catch((e) => console.error('refund failed', e));
    return NextResponse.json(
      { error: 'Failed to execute visual inpainting.' },
      { status: 500 }
    );
  }
}
