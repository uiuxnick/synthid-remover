import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { gate } from '@/lib/apiV1';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const g = await gate(req);
  if (g.res) return g.res;
  const u = await prisma.user.findUnique({ where: { id: g.ctx.user.id }, select: { creditsBalance: true } });
  return NextResponse.json({ credits: u?.creditsBalance ?? 0 });
}
