import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'kinsho',
  description: '独立した SPA をディレクトリ単位で量産・ホストする基盤',
};

/**
 * Host index — editorial entry point, not a product portal.
 */
export default function HostIndexPage() {
  return (
    <main className="atmosphere flex min-h-dvh items-center px-6 py-16 sm:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <p className="rise font-[family-name:var(--font-sans)] text-[11px] tracking-[0.28em] text-[var(--muted)] uppercase">
          culture bed for small apps
        </p>

        <h1 className="rise rise-delay-1 mt-5 font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,6.5rem)] leading-[0.95] font-medium tracking-tight text-[var(--ink)]">
          kinsho
        </h1>

        <p className="rise rise-delay-2 mt-6 max-w-md text-[15px] leading-relaxed text-[var(--ink-soft)] sm:text-base">
          無関係な単発 SPA を、ひとつの Azure 上で育てる菌床。共通ヘッダーは持たず、各アプリは完全に独立しています。
        </p>

        <div className="rule mt-10 mb-8" />

        <ul className="rise rise-delay-3 space-y-5">
          <li className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <Link
              href="/sample-app/"
              className="note-link font-[family-name:var(--font-display)] text-xl tracking-wide"
            >
              sample-app
            </Link>
            <span className="text-sm text-[var(--muted)]">
              近未来 Note 調の独立 SPA サンプル
            </span>
          </li>
        </ul>
      </div>
    </main>
  );
}
