'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Orbitron, Share_Tech_Mono } from 'next/font/google';
import { APPS, LAB_META, NAV_ITEMS, type AppEntry, type NavId } from './appsData';
import { DailyStatusRail } from './DailyStatusRail';
import { useDailyStatus } from './useDailyStatus';
import styles from './AppsDirectory.module.css';

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

type Props = {
  overlay?: boolean;
  onReenterVoid?: () => void;
  reveal?: boolean;
};

function statusTone(status: AppEntry['status']) {
  if (status === 'LIVE') return 'text-[#7dffb3]';
  if (status === 'SIGNAL') return 'text-[#ffc24b]';
  return 'text-[#7ec8ff]';
}

function filterApps(nav: NavId): AppEntry[] {
  if (nav === 'archives') return APPS.filter((a) => a.status === 'ARCHIVE');
  if (nav === 'signal')
    return APPS.filter((a) => a.status === 'LIVE' || a.status === 'SIGNAL');
  return APPS;
}

/**
 * Lab console: clear app picker + everyday status.
 */
export default function AppsDirectory({
  overlay = false,
  onReenterVoid,
  reveal = true,
}: Props) {
  const [nav, setNav] = useState<NavId>('directory');
  const daily = useDailyStatus(reveal);
  const apps = filterApps(nav);
  const activeNav = NAV_ITEMS.find((n) => n.id === nav) ?? NAV_ITEMS[0];
  const shell = overlay
    ? 'absolute inset-0 overflow-hidden'
    : 'relative min-h-dvh overflow-hidden';
  const enter = reveal ? styles.in : styles.inWait;

  return (
    <main
      className={`${display.variable} ${mono.variable} ${shell} text-[#d7f6ff]`}
      style={{
        fontFamily: 'var(--font-cp-mono), ui-monospace, monospace',
        background:
          'radial-gradient(ellipse 110% 70% at 50% 0%, #0a141c 0%, #05080c 55%, #020308 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0 2px, rgba(0,0,0,0.4) 2px 3px)',
        }}
      />

      <div className={styles.shell}>
        <aside className={`${enter} ${styles.nav}`}>
          <p className="text-[9px] tracking-[0.32em] text-[#5fd6ff] uppercase">
            lab console
          </p>
          <h1
            className="mt-2 font-[family-name:var(--font-cp-display)] text-xl font-extrabold tracking-[0.1em] text-[#effcff]"
            style={{
              textShadow: '0 0 16px rgba(0, 220, 255, 0.3)',
            }}
          >
            {LAB_META.site}
          </h1>
          <p className="mt-2 text-[12px] text-[#6f97a8]">{LAB_META.tagline}</p>

          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="メニュー">
            {NAV_ITEMS.map((item) => {
              const active = nav === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNav(item.id)}
                  className={`${styles.navBtn} ${active ? styles.navBtnActive : ''}`}
                >
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.navHint}>{item.hint}</span>
                </button>
              );
            })}
          </nav>

          {onReenterVoid ? (
            <button
              type="button"
              onClick={onReenterVoid}
              className="mt-4 cursor-pointer border-0 bg-transparent p-0 text-left text-[11px] tracking-[0.16em] text-[#5a8294] uppercase transition-colors hover:text-[#9fe9ff]"
            >
              ← void に戻る
            </button>
          ) : (
            <Link
              href="/"
              className="mt-4 text-[11px] tracking-[0.16em] text-[#5a8294] uppercase transition-colors hover:text-[#9fe9ff]"
            >
              ← void に戻る
            </Link>
          )}
        </aside>

        <div className={`${enter} ${reveal ? styles.d1 : ''} ${styles.main}`}>
          <div className={styles.mobileStatus}>
            <span>
              <strong>{daily.time}</strong>
            </span>
            <span>
              {daily.dateLabel}（{daily.weekday}）
            </span>
            <span className={daily.online ? styles.ok : styles.warn}>
              {daily.online ? 'オンライン' : 'オフライン'}
            </span>
          </div>

          <div className={styles.mainBody}>
            <section className={styles.viewport}>
              <header className="mb-4">
                <p className="text-[10px] tracking-[0.28em] text-[#5fd6ff] uppercase">
                  apps
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-cp-display)] text-lg tracking-[0.1em] text-[#effcff]">
                  {activeNav.label}
                </h2>
                <p className="mt-1 text-[12px] text-[#6f97a8]">
                  {activeNav.hint} · {apps.length} 件
                </p>
              </header>

              {apps.length === 0 ? (
                <p className="text-sm text-[#6f97a8]">該当する端末がありません。</p>
              ) : (
                <ul
                  className={`${enter} ${reveal ? styles.d2 : ''} ${styles.appGrid}`}
                >
                  {apps.map((app, i) => (
                    <li
                      key={app.id}
                      className={enter}
                      style={
                        reveal
                          ? { animationDelay: `${0.16 + i * 0.04}s` }
                          : undefined
                      }
                    >
                      <Link
                        href={app.href}
                        className="group block outline-none focus-visible:ring-1 focus-visible:ring-[#5fd6ff]/ring-offset-2 focus-visible:ring-offset-[#05070c]"
                      >
                        <article
                          className={styles.tray}
                          style={
                            { '--thumb-accent': app.accent } as CSSProperties
                          }
                        >
                          <div className={styles.thumb}>
                            {app.thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={app.thumb}
                                alt=""
                                className={styles.thumbImg}
                              />
                            ) : (
                              <>
                                <span
                                  className={styles.thumbFallback}
                                  aria-hidden
                                />
                                <span className={styles.thumbMark} aria-hidden>
                                  {app.id}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="px-2 py-1.5">
                            <div className="flex items-baseline justify-between gap-1">
                              <h3 className="truncate font-[family-name:var(--font-cp-display)] text-[11px] tracking-[0.06em] text-[#e8fbff] transition-colors group-hover:text-[#7aefff]">
                                {app.name}
                              </h3>
                              <span
                                className={`shrink-0 text-[8px] tracking-[0.12em] ${statusTone(app.status)}`}
                              >
                                {app.status}
                              </span>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[#6f97a8]">
                              {app.blurb}
                            </p>
                          </div>
                        </article>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className={`${enter} ${reveal ? styles.d2 : ''}`}>
              <DailyStatusRail status={daily} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
