import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Shippori_Mincho, Zen_Kaku_Gothic_New } from 'next/font/google';
import './globals.css';

const shippori = Shippori_Mincho({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-shippori',
  display: 'swap',
});

const zen = Zen_Kaku_Gothic_New({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-zen',
  display: 'swap',
});

/**
 * Root shell for the multi-app Static Web Apps host.
 * Intentionally has NO shared header/footer/portal chrome —
 * each app under app/<name>/ owns its full UI.
 */
export const metadata: Metadata = {
  title: {
    default: 'kinsho',
    template: '%s · kinsho',
  },
  description: 'Inexpensive multi-SPA host on Azure Static Web Apps',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja" className={`${shippori.variable} ${zen.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
