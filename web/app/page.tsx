import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'kinsho host',
  description: 'Index of independently hosted SPAs on this Static Web App',
};

/**
 * Lightweight host index — not a product portal.
 * New SPAs are added as peer folders under app/ (e.g. app/my-tool/).
 */
export default function HostIndexPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6">
      <div>
        <p className="text-sm tracking-[0.2em] text-[var(--kinsho-muted)] uppercase">
          Azure Static Web Apps
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">kinsho</h1>
        <p className="mt-3 text-[var(--kinsho-muted)]">
          独立した SPA をディレクトリ単位で量産・ホストするための基盤です。
        </p>
      </div>

      <ul className="space-y-2 border-t border-white/10 pt-6">
        <li>
          <Link
            href="/sample-app/"
            className="text-[var(--kinsho-accent)] underline-offset-4 hover:underline"
          >
            /sample-app
          </Link>
          <span className="ml-2 text-sm text-[var(--kinsho-muted)]">
            サンプル SPA
          </span>
        </li>
      </ul>
    </main>
  );
}
