import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/db';
import { SideNav, type SideNavItem } from '@/app/components/SideNav';
import { signOut } from '@/auth';

async function logout() {
  'use server';
  await signOut({ redirectTo: '/' });
}

export const dynamic = 'force-dynamic';

const NAV: SideNavItem[] = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/workspace', label: 'Images' },
  { href: '/dashboard/video', label: 'Video' },
  { href: '/dashboard/history', label: 'History' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/api-keys', label: 'API keys' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { creditsBalance: true, tier: true, role: true },
  });
  const credits = user?.creditsBalance ?? 0;
  const tier = (user?.tier ?? 'FREE').toLowerCase();

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row md:gap-10 md:py-12">
      <aside className="md:w-56 md:shrink-0">
        <div className="mb-5 flex items-end justify-between rounded-[14px] bg-h-surface px-5 py-4 md:block">
          <div>
            <p className="text-[14px] text-h-muted">Credits left</p>
            <p className="text-[44px] font-semibold leading-none tracking-[-0.03em] tabular-nums" aria-label={`${credits} credits left`}>
              {credits}
            </p>
          </div>
          <p className="text-[14px] capitalize text-h-muted md:mt-3">{tier} plan</p>
        </div>
        <SideNav label="Dashboard" items={user?.role === 'ADMIN' ? [...NAV, { href: '/admin', label: 'Admin' }] : NAV} />
        {/* Kept apart from navigation so it is not hit by accident. */}
        <form action={logout} className="mt-6 hidden md:block">
          <p className="truncate px-3.5 text-[14px] text-h-muted">{sessionUser.email}</p>
          <button className="mt-1 rounded-[10px] px-3.5 py-2.5 text-[16px] text-h-muted transition-colors hover:bg-h-surface hover:text-h-ink">Log out</button>
        </form>
        <form action={logout} className="mt-3 md:hidden">
          <button className="text-[15px] text-h-muted underline underline-offset-4">Log out</button>
        </form>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
