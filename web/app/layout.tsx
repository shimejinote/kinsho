import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

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
    <html lang="ja">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
