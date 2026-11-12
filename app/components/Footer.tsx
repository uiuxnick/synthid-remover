import Link from 'next/link';

const LINKS = [
  ['Features', '/features'],
  ['Pricing', '/pricing'],
  ['API', '/api-docs'],
  ['Log in', '/login'],
] as const;

/** One quiet line: what this is, where to go, the legal links. */
export function Footer() {
  return (
    <footer className="bg-h-bg px-4 pb-6 pt-24 text-[14px] text-h-muted sm:px-6 sm:pt-32">
      <div className="mx-auto grid max-w-[1200px] gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-baseline">
        <p>Image and video cleanup. Use only on media you own.</p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1 sm:justify-center">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} className="text-h-ink">{label}</Link>
          ))}
        </nav>
        <p className="sm:text-right">
          © {new Date().getFullYear()} · <Link href="/terms" className="text-h-ink">Terms</Link> ·{' '}
          <Link href="/privacy" className="text-h-ink">Privacy</Link>
        </p>
      </div>
    </footer>
  );
}
