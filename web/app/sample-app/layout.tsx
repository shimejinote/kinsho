import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sample App',
};

/**
 * App-local layout: completely independent UI surface.
 * Duplicate this folder pattern for each new SPA (app/<app-name>/).
 */
export default function SampleAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#121a14] text-[#e7f0ea]">
      <header className="border-b border-emerald-900/60 px-6 py-4">
        <p className="text-xs tracking-[0.25em] text-emerald-500/80 uppercase">
          sample-app
        </p>
        <h1 className="text-xl font-medium">独立 SPA サンプル</h1>
      </header>
      <div className="px-6 py-8">{children}</div>
    </div>
  );
}
