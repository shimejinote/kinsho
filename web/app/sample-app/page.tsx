'use client';

import { useEffect, useState } from 'react';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

/**
 * Demonstrates calling the shared Azure Functions backend.
 *
 * Free SWA + managed API: relative `/api/health` (deployed from repo `api/`).
 * Free SWA + separate Consumption Function App: set NEXT_PUBLIC_API_BASE_URL
 * to `https://<func>.azurewebsites.net` (CORS must allow the SWA origin).
 * Standard SWA + linkedBackends: relative `/api/health` via linked Function App.
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

  return (
    <section className="mx-auto max-w-md space-y-4">
      <p className="text-sm leading-relaxed text-emerald-100/70">
        このページは他アプリと UI を共有しません。新規アプリは{' '}
        <code className="rounded bg-black/30 px-1.5 py-0.5 text-emerald-300">
          app/&lt;app-name&gt;/
        </code>{' '}
        を複製して追加してください。
      </p>

      <div className="rounded-lg border border-emerald-800/50 bg-black/20 p-4">
        <h2 className="text-sm font-medium text-emerald-400">API health</h2>
        {error && (
          <p className="mt-2 text-sm text-red-300">
            呼び出し失敗: {error}
            <span className="mt-1 block text-xs text-emerald-100/50">
              ローカルでは SWA CLI、または Functions を起動してください。
            </span>
          </p>
        )}
        {health && (
          <pre className="mt-2 overflow-x-auto text-xs text-emerald-100/90">
            {JSON.stringify(health, null, 2)}
          </pre>
        )}
        {!health && !error && (
          <p className="mt-2 text-sm text-emerald-100/50">読み込み中…</p>
        )}
      </div>
    </section>
  );
}
