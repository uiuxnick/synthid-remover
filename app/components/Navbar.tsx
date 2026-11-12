'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { useTheme } from 'next-themes';

const LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/api-docs', label: 'API' },
];

type SessionUser = { name?: string | null; email?: string | null } | null;

export const Navbar: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<SessionUser | undefined>(undefined); // undefined = still loading
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // Fetched client-side so marketing pages stay statically rendered (fast LCP).
  // Re-run on route change: the navbar persists across client navigations, so without this it
  // would keep showing "Log in" right after a login/register redirect.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/session')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => !cancelled && setUser(s?.user ?? null))
      .catch(() => !cancelled && setUser(null));
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const iconBtn =
    'flex h-10 w-10 items-center justify-center rounded-[10px] bg-h-surface text-h-ink transition-colors hover:bg-h-surface2';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-h-line bg-h-bg">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <span aria-hidden className="h-5 w-5 rounded-[6px] bg-h-accent" />
            <span className="text-[17px] font-semibold tracking-[-0.01em]">SynthID Remover</span>
          </Link>
          <nav className="hidden items-center gap-7 text-[15px] text-h-muted md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={pathname === l.href ? 'page' : undefined} className={`transition-colors hover:text-h-ink ${pathname === l.href ? 'text-h-ink' : ''}`}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={iconBtn}
            aria-label="Toggle theme"
          >
            {mounted ? theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" /> : <span className="h-4 w-4" />}
          </button>

          <div className="hidden items-center gap-2 md:flex">
            {user === undefined ? (
              <span className="h-8 w-24" aria-hidden />
            ) : user ? (
              <Link href="/dashboard" className="rounded-[10px] bg-h-accent px-4 py-2.5 text-[15px] font-medium text-h-accent-ink">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-2 text-[15px] text-h-muted hover:text-h-ink">
                  Log in
                </Link>
                <Link href="/register" className="rounded-[10px] bg-h-accent px-4 py-2.5 text-[15px] font-medium text-h-accent-ink">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button className={`${iconBtn} md:hidden`} onClick={() => setOpen((v) => !v)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="bg-h-surface px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4 text-[17px]">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            ))}
            {user ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="font-semibold">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
                <Link href="/register" onClick={() => setOpen(false)} className="font-semibold">Get started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
