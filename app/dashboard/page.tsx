import Link from 'next/link';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { getAppConfig } from '@/lib/credits';

export const metadata = { title: 'Dashboard', robots: { index: false } };

export default async function DashboardHome() {
  const user = await requireUser();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [cfg, balance, monthJobs, agg, recent] = await Promise.all([
    getAppConfig(),
    prisma.user.findUnique({ where: { id: user.id }, select: { creditsBalance: true } }),
    prisma.imageJob.count({ where: { userId: user.id, status: 'COMPLETED', createdAt: { gte: monthStart } } }),
    prisma.imageJob.aggregate({
      where: { userId: user.id, status: 'COMPLETED', psnr: { not: null } },
      _avg: { psnr: true, processingTimeMs: true },
    }),
    prisma.imageJob.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5 }),
  ]);

  const credits = balance?.creditsBalance ?? 0;
  const low = credits < cfg.lowCreditThreshold;

  const tiles: [string, string][] = [
    ['Images this month', String(monthJobs)],
    ['Average PSNR', agg._avg.psnr ? `${agg._avg.psnr.toFixed(1)} dB` : '—'],
    ['Average speed', agg._avg.processingTimeMs ? `${Math.round(agg._avg.processingTimeMs)} ms` : '—'],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}</h1>

      {low && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-[16px]">
          <span>You have {credits} credit{credits === 1 ? '' : 's'} left.</span>
          <Link href="/pricing" className="font-semibold underline">Get more</Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-h-surface p-6 ">
            <p className=" text-[13px]   text-h-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[14px] bg-h-surface ">
        <div className="flex items-center justify-between border-b border-h-line p-4 ">
          <h2 className="font-semibold">Recent jobs</h2>
          <Link href="/dashboard/history" className="text-[14px] underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <p className="p-6 text-[16px] text-h-muted">
            No jobs yet. <Link href="/dashboard/workspace" className="underline">Open the workspace</Link> to clean your first image.
          </p>
        ) : (
          <ul className="divide-y divide-h-line text-[16px] ">
            {recent.map((j) => (
              <li key={j.id} className="flex items-center justify-between p-4">
                <span className=" text-[14px] text-h-muted">{j.createdAt.toISOString().slice(0, 16).replace('T', ' ')}</span>
                <span>{j.mode.toLowerCase().replace('_', '-')}</span>
                <span className="tabular-nums">{j.psnr ? `${j.psnr.toFixed(1)} dB` : '—'}</span>
                <span className="text-[14px]  text-h-muted">{j.status.charAt(0) + j.status.slice(1).toLowerCase()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
