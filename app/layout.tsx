import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ThemeProvider } from './components/ThemeProvider';
import { SITE } from '@/lib/site';
import { getPublicTracking } from '@/lib/tracking';
import { TrackingScripts } from './components/TrackingScripts';

// Pages stay statically cached; tracking config is re-read at most every 5 min (admin saves revalidate immediately).
export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ['C2PA remover', 'EXIF stripper', 'metadata cleaner', 'AI image badge remover', 'PSNR image quality'],
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: SITE.name, description: SITE.description },
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: { icon: '/icon.svg', shortcut: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  colorScheme: 'light dark',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tracking = await getPublicTracking();
  return (
    <html lang="en" suppressHydrationWarning className="scroll-smooth">
      <head>
        {tracking?.gsc && <meta name="google-site-verification" content={tracking.gsc} />}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-h-bg font-sans text-h-ink">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster theme="system" richColors position="top-right" />
          {tracking && <TrackingScripts t={tracking} />}
        </ThemeProvider>
      </body>
    </html>
  );
}
