import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const revalidate = 60;

export interface PublicStats {
  imagesCleaned: number;
  avgPsnr: number | null;
  users: number;
  live: boolean; // false = database unreachable, numbers are zero
}

export async function GET() {
  try {
    const [jobs, psnr, users] = await Promise.all([
      prisma.imageJob.count({ where: { status: 'COMPLETED' } }),
      prisma.imageJob.aggregate({ where: { status: 'COMPLETED', psnr: { not: null } }, _avg: { psnr: true } }),
      prisma.user.count(),
    ]);
    const body: PublicStats = {
      imagesCleaned: jobs,
      avgPsnr: psnr._avg.psnr ? Math.round(psnr._avg.psnr * 10) / 10 : null,
      users,
      live: true,
    };
    return NextResponse.json(body);
  } catch (err) {
    console.error('[stats] db unavailable', err);
    const body: PublicStats = { imagesCleaned: 0, avgPsnr: null, users: 0, live: false };
    return NextResponse.json(body);
  }
}
