'use client';

import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

/**
 * Demonstrates calling the shared Azure Functions backend.
 */
export default function SampleAppPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? '';
    const url = `${base}/api/health`;

    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as HealthResponse;
      })
      .then(setHealth)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'unknown error');
      });
  }, []);

  const state = error ? 'error' : health ? 'ok' : 'loading';

  return (
    <article className="space-y-10">
      <p className="rise rise-delay-2 text-[15px] leading-[1.9] text-[var(--ink-soft)] sm:text-base">
        このページは Note のような読み心地を軸に、わずかに近未来の空気を足したサンプルです。
        新しい SPA を増やすときは{' '}
        <code className="rounded-sm bg-[color-mix(in_srgb,var(--note)_12%,transparent)] px-1.5 py-0.5 font-[family-name:var(--font-sans)] text-[0.9em] text-[var(--note-deep)]">
          app/&lt;app-name&gt;/
        </code>{' '}
        を複製し、そのフォルダだけで UI を完結させてください。
      </p>

      <section
        className="rise rise-delay-3 border-t border-[var(--line)] pt-8"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5">
          <span className="status-dot" data-state={state} aria-hidden />
          <h2 className="font-[family-name:var(--font-display)] text-lg tracking-wide text-[var(--ink)]">
            API の合図
          </h2>
        </div>

        <p className="mt-2 text-sm text-[var(--muted)]">
          共有バックエンド <span className="text-[var(--ink-soft)]">/api/health</span>{' '}
          の応答です。
        </p>

        {error && (
          <p className="mt-5 text-sm leading-relaxed text-[#a84343]">
            呼び出しに失敗しました（{error}）。
            ローカルでは SWA CLI か Functions を起動してください。
          </p>
        )}

        {health && (
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] tracking-[0.2em] text-[var(--muted)] uppercase">
                status
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--note-deep)]">
                {health.status}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.2em] text-[var(--muted)] uppercase">
                service
              </dt>
              <dd className="mt-1 text-[15px] text-[var(--ink)]">{health.service}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.2em] text-[var(--muted)] uppercase">
                timestamp
              </dt>
              <dd className="mt-1 font-mono text-xs text-[var(--ink-soft)] sm:text-sm">
                {new Date(health.timestamp).toLocaleString('ja-JP')}
              </dd>
            </div>
          </dl>
        )}

        {!health && !error && (
          <p className="mt-5 text-sm text-[var(--muted)]">信号を待っています…</p>
        )}
      </section>
    </article>
  );
}
