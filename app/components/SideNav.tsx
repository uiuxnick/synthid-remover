'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface SideNavItem {
  href: string;
  label: string;
  /** Match only the exact path (for section roots such as /dashboard). */
  exact?: boolean;
}

/** Section navigation for the dashboard and admin shells: a column on desktop, a scrolling row on phones. */
export function SideNav({ items, label }: { items: SideNavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label: text, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[16px] transition-colors ${
              active ? 'bg-h-accent font-medium text-h-accent-ink' : 'text-h-muted hover:bg-h-surface hover:text-h-ink'
            }`}
          >
            {text}
          </Link>
        );
      })}
    </nav>
  );
}
