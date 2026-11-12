import { requireAdmin } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { getAppConfig } from '@/lib/credits';
import { card, inr } from './ui';

export default async function AdminHome() {
  await requireAdmin();
  const now = Date.now();
  const d7 = new Date(now - 7 * 864e5);
  const d30 = new Date(now - 30 * 864e5);

  const [cfg, users, newUsers, jobs30, failed30, revenue, subsByPlan, failedPay, pro] = await Promise.all([
    getAppConfig(),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: d7 } } }),
    prisma.imageJob.count({ where: { createdAt: { gte: d30 }, status: 'COMPLETED' } }),
    prisma.imageJob.count({ where: { createdAt: { gte: d30 }, status: 'FAILED' } }),
    prisma.transaction.aggregate({ where: { status: 'SUCCESS', createdAt: { gte: d30 } }, _sum: { amount: true } }),
    prisma.subscription.groupBy({ by: ['planId'], where: { status: 'ACTIVE' }, _count: true }),
    prisma.transaction.count({ where: { status: 'FAILED', createdAt: { gte: d30 } } }),
    prisma.user.count({ where: { tier: { in: ['PRO', 'ENTERPRISE'] } } }),
  ]);

  // MRR = active subscriptions normalised to a month (annual plans / 12).
  const mrrPaise = subsByPlan.reduce(
    (sum, g) => sum + g._count * (cfg.razorpayPlanProAnnual && g.planId === cfg.razorpayPlanProAnnual ? cfg.proAnnualPaise / 12 : cfg.proMonthlyPaise),
    0
  );
  const activeSubs = subsByPlan.reduce((n, g) => n + g._count, 0);

  const tiles: [string, string, string?][] = [
    ['MRR', inr(mrrPaise), `${activeSubs} active subscription${activeSubs === 1 ? '' : 's'}`],
    ['Revenue (30d)', inr(revenue._sum.amount ?? 0), 'successful payments'],
    ['Users', String(users), `${newUsers} new in 7 days`],
    ['Paid tier users', String(pro)],
    ['Jobs (30d)', String(jobs30), `${failed30} failed`],
    ['Failed payments (30d)', String(failedPay)],
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.02em]">Overview</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(([label, value, sub]) => (
          <div key={label} className={card}>
            <p className=" text-[13px]   text-h-muted">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            {sub && <p className="text-[14px] text-h-muted">{sub}</p>}
          </div>
        ))}
      </div>
      <p className="text-[14px] text-h-muted">Server-processed jobs only; in-browser trial runs are not counted. MRR uses current AppConfig prices.</p>
    </div>
  );
}
