'use client';

import Link from 'next/link';
import { Orbitron, Share_Tech_Mono } from 'next/font/google';
import styles from './CyberpunkAppsIndex.module.css';

const display = Orbitron({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-cp-display',
  display: 'swap',
});

const mono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-cp-mono',
  display: 'swap',
});

type AppEntry = {
  id: string;
  href: string;
  name: string;
  blurb: string;
  status: 'LIVE' | 'ARCHIVE' | 'SIGNAL';
};

const APPS: AppEntry[] = [
  {
    id: '01',
    href: '/sample-app/',
    name: 'SAMPLE SIGNAL',
    blurb: '共有 API へつなぐ実験端末',
    status: 'LIVE',
  },
  {
    id: '02',
    href: '/archive/void/',
    name: 'VOID ARCHIVE',
    blurb: '星塵トンネルの凍結スナップ',
    status: 'ARCHIVE',
  },
  {
    id: '03',
    href: '/archive/journey/',
    name: 'WORLD JOURNEY',
    blurb: '地表までの落下航路を再走',
    status: 'ARCHIVE',
  },
];

function statusTone(status: AppEntry['status']) {
  if (status === 'LIVE') return 'text-[#7dffb3]';
  if (status === 'SIGNAL') return 'text-[#ffc24b]';
  return 'text-[#7ec8ff]';
}

type Props = {
  /** Embedded over the void canvas (same URL). */
  overlay?: boolean;
  /** SPA return to the portal — preferred over a route change. */
  onReenterVoid?: () => void;
  /** When false, content stays mounted but entrance motion waits (warm preload). */
  reveal?: boolean;
};

/**
 * Post-warp destination: kinsho as neon directory, one list of gates.
 */
export default function CyberpunkAppsIndex({
  overlay = false,
  onReenterVoid,
  reveal = true,
}: Props = {}) {
  const shell = overlay
    ? 'absolute inset-0 overflow-y-auto overflow-x-hidden'
    : 'relative min-h-dvh overflow-hidden';
  const enter = reveal ? styles.in : styles.inWait;

  return (
    <main
      className={`${display.variable} ${mono.variable} ${shell} text-[#d7f6ff]`}
      style={{
        fontFamily: 'var(--font-cp-mono), ui-monospace, monospace',
        background:
          'radial-gradient(120% 80% at 50% -10%, #12334a 0%, #070b12 42%, #04060a 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(transparent 0%, rgba(0, 220, 255, 0.05) 40%, rgba(0, 220, 255, 0.14) 100%), linear-gradient(90deg, rgba(0, 220, 255, 0.22) 1px, transparent 1px), linear-gradient(rgba(0, 220, 255, 0.18) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 48px 48px, 48px 48px',
          transform: 'perspective(600px) rotateX(58deg) scale(1.35)',
          transformOrigin: 'center bottom',
          maskImage: 'linear-gradient(to top, black 10%, transparent 95%)',
        }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.45) 2px 3px)',
        }}
      />
      <div
        aria-hidden
        className={`${styles.scan} pointer-events-none absolute inset-x-0 h-24 opacity-30`}
        style={{
          background:
            'linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.18), transparent)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-5 py-16 sm:px-8">
        <p
          className={`${enter} text-[11px] tracking-[0.42em] text-[#5fd6ff] uppercase`}
        >
          gate clear · uplink
        </p>
        <h1
          className={`${enter} ${reveal ? styles.d1 : ''} mt-3 font-[family-name:var(--font-cp-display)] text-[clamp(2.6rem,12vw,5.2rem)] leading-none font-extrabold tracking-[0.08em] text-[#effcff]`}
          style={{
            textShadow:
              '0 0 18px rgba(0, 220, 255, 0.35), 0 0 1px rgba(255,255,255,0.8)',
          }}
        >
          KINSHO
        </h1>
        <p
          className={`${enter} ${reveal ? styles.d2 : ''} mt-4 max-w-md text-sm leading-relaxed text-[#8bb8c9] sm:text-[15px]`}
        >
          虚空を抜けた先の端末一覧。接続先を選べ。
        </p>

        <ul
          className={`${enter} ${reveal ? styles.d3 : ''} mt-12 space-y-0 border-y border-[#1e3d4f]`}
        >
          {APPS.map((app) => (
            <li key={app.id}>
              <Link
                href={app.href}
                className="group flex items-stretch gap-4 border-b border-[#1e3d4f] py-5 transition-colors last:border-b-0 hover:bg-[rgba(0,200,255,0.06)] focus-visible:bg-[rgba(0,200,255,0.08)] focus-visible:outline-none"
              >
                <span className="w-10 shrink-0 pt-1 text-xs tracking-[0.2em] text-[#3f6f82]">
                  {app.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-[family-name:var(--font-cp-display)] text-lg tracking-[0.12em] text-[#e8fbff] transition-colors group-hover:text-[#7aefff] sm:text-xl">
                      {app.name}
                    </span>
                    <span
                      className={`text-[10px] tracking-[0.28em] ${statusTone(app.status)}`}
                    >
                      ● {app.status}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-[#6f97a8]">
                    {app.blurb}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="self-center font-[family-name:var(--font-cp-display)] text-sm tracking-widest text-[#3f6f82] transition-all group-hover:translate-x-1 group-hover:text-[#7aefff]"
                >
                  ≫
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {onReenterVoid ? (
          <button
            type="button"
            onClick={onReenterVoid}
            className={`${enter} ${reveal ? styles.d4 : ''} mt-10 inline-flex w-fit cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-xs tracking-[0.32em] text-[#5a8294] uppercase transition-colors hover:text-[#9fe9ff]`}
          >
            ← re-enter void
          </button>
        ) : (
          <Link
            href="/"
            className={`${enter} ${reveal ? styles.d4 : ''} mt-10 inline-flex w-fit items-center gap-2 text-xs tracking-[0.32em] text-[#5a8294] uppercase transition-colors hover:text-[#9fe9ff]`}
          >
            ← re-enter void
          </Link>
        )}
      </div>
    </main>
  );
}
