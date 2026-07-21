'use client';

import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { Orbitron, Share_Tech_Mono } from 'next/font/google';
import { APPS, NAV_ITEMS, type AppEntry, type NavId } from './appsData';
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
 * Utility console: app picker + everyday status. No brand chrome.
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

  const renderVoid = () =>
    onReenterVoid ? (
      <button type="button" onClick={onReenterVoid} className={styles.voidLink}>
        ← void に戻る
      </button>
    ) : (
      <Link href="/" className={styles.voidLink}>
        ← void に戻る
      </Link>
    );

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
            <span className={styles.mobileVoid}>{renderVoid()}</span>
          </div>

          <div className={styles.mainBody}>
            <section className={styles.viewport}>
              <header className={styles.toolbar}>
                <div className={styles.toolbarLead}>
                  <h1 className={styles.toolbarTitle}>{activeNav.label}</h1>
                  <p className={styles.toolbarMeta}>
                    {activeNav.hint} · {apps.length} 件
                  </p>
                </div>
                <nav className={styles.filters} aria-label="表示の絞り込み">
                  {NAV_ITEMS.map((item) => {
                    const active = nav === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNav(item.id)}
                        aria-pressed={active}
                        className={`${styles.filterBtn} ${active ? styles.filterBtnActive : ''}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
                <div className={styles.desktopVoid}>{renderVoid()}</div>
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
                              <h2 className="truncate font-[family-name:var(--font-cp-display)] text-[11px] tracking-[0.06em] text-[#e8fbff] transition-colors group-hover:text-[#7aefff]">
                                {app.name}
                              </h2>
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
