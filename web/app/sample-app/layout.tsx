import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sample App',
};

/**
 * App-local layout: Note-like reading surface, fully independent from host chrome.
 */
export default function SampleAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="atmosphere min-h-dvh">
      <header className="mx-auto max-w-2xl px-6 pt-14 pb-2 sm:px-8">
        <p className="rise text-[11px] tracking-[0.28em] text-[var(--muted)] uppercase">
          sample-app
        </p>
        <h1 className="rise rise-delay-1 mt-3 font-[family-name:var(--font-display)] text-[clamp(1.85rem,5vw,2.75rem)] leading-snug font-medium tracking-tight text-[var(--ink)]">
          独立した一冊のはじまり
        </h1>
        <p className="rise rise-delay-2 mt-3 text-sm text-[var(--muted)]">
          kinsho 上のサンプル · UI は他アプリと共有しません
        </p>
        <div className="rule mt-8" />
      </header>
      <div className="mx-auto max-w-2xl px-6 pt-8 pb-20 sm:px-8">{children}</div>
    </div>
  );
}
