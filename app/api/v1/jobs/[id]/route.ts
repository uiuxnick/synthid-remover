import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { apiError, gate } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const g = await gate(req);
  if (g.res) return g.res;
  // Scoped to the key's owner: other users' job ids look identical to nonexistent ones.
  const job = await prisma.imageJob.findFirst({
    where: { id: params.id, userId: g.ctx.user.id },
    select: { id: true, status: true, mode: true, processingTimeMs: true, creditsCharged: true, inputBytes: true, outputBytes: true, createdAt: true, errorMessage: true },
  });
  if (!job) return apiError(404, 'not_found', 'Job not found.');
  return NextResponse.json({ ...job, status: job.status.toLowerCase() });
}
