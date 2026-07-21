import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import {
  Hina_Mincho,
  Shippori_Mincho,
  Yomogi,
  Zen_Kaku_Gothic_New,
} from 'next/font/google';
import { getSiteUrl } from '@/lib/siteUrl';
import './globals.css';

const shippori = Shippori_Mincho({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-shippori',
  display: 'swap',
});

/** Dreamy old-style mincho for void word-dust / prose assembly.
 *  Disable size-adjust fallback — that face is Latin-only and breaks CJK atlas paint. */
const hina = Hina_Mincho({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-glyph',
  display: 'swap',
  adjustFontFallback: false,
  preload: true,
});

/** Loose handwritten face for quiet brand marks. */
const yomogi = Yomogi({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-yomogi',
  display: 'swap',
});

const zen = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-zen',
  display: 'swap',
});

const site = getSiteUrl();

/**
 * Root shell for the multi-app Static Web Apps host.
 * Intentionally has NO shared header/footer/portal chrome —
 * each app under app/<name>/ owns its full UI.
 * OGP is tuned so note link cards match the void entry frame.
 */
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: 'kinsho',
    template: '%s · kinsho',
  },
  description: '虚空を抜けた先の端末 — kinsho',
  applicationName: 'kinsho',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: 'kinsho',
    title: 'kinsho',
    description: '虚空を抜けた先の端末 — kinsho',
    url: site,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'kinsho',
    description: '虚空を抜けた先の端末 — kinsho',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#04060a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${shippori.variable} ${hina.variable} ${yomogi.variable} ${zen.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
