import { requireAdmin } from '@/lib/auth-helpers';
import { SideNav, type SideNavItem } from '@/app/components/SideNav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

const NAV: SideNavItem[] = [
  { href: '/admin', label: 'Overview', exact: true },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/tracking', label: 'Tracking' },
  { href: '/admin/email', label: 'Email' },
  { href: '/admin/settings', label: 'Pricing and engine' },
  { href: '/dashboard', label: 'Back to dashboard', exact: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // authoritative DB check; middleware only sees the JWT
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row md:gap-10 md:py-12">
      <aside className="md:w-56 md:shrink-0">
        <p className="mb-5 rounded-[14px] bg-h-accent px-5 py-4 text-[16px] font-medium text-h-accent-ink">Admin</p>
        <SideNav label="Admin" items={NAV} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
