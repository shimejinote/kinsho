'use client';

import type { DailyStatus } from './dailyStatus';
import styles from './AppsDirectory.module.css';

const PROGRESS: {
  key: keyof Pick<
    DailyStatus,
    'dayProgress' | 'weekProgress' | 'monthProgress' | 'yearProgress'
  >;
  label: string;
}[] = [
  { key: 'dayProgress', label: '今日' },
  { key: 'weekProgress', label: '今週' },
  { key: 'monthProgress', label: '今月' },
  { key: 'yearProgress', label: '今年' },
];

function ProgressRow({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={styles.statusRow}>
      <dt>{label}</dt>
      <dd>
        <span className={styles.statusBar} aria-hidden>
          <span
            className={styles.statusBarFill}
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className={styles.statusNum}>{pct.toFixed(0)}%</span>
      </dd>
    </div>
  );
}

/** Everyday status rail — clock, calendar progress, tips. */
export function DailyStatusRail({ status }: { status: DailyStatus }) {
  return (
    <aside className={styles.statusRail} aria-label="いまの状態">
      <div>
        <p className={styles.statusEyebrow}>local time</p>
        <p className={styles.statusTime}>{status.time}</p>
        <p className={styles.statusDate}>
          {status.dateLabel}（{status.weekday}）· {status.phaseLabel}
        </p>
      </div>

      <dl className={styles.statusList}>
        {PROGRESS.map(({ key, label }) => (
          <ProgressRow key={key} label={label} value={status[key]} />
        ))}
        <div className={styles.statusRow}>
          <dt>次の正時まで</dt>
          <dd className={styles.statusNum}>{status.minutesToNextHour} 分</dd>
        </div>
        <div className={styles.statusRow}>
          <dt>通信</dt>
          <dd className={status.online ? styles.ok : styles.warn}>
            {status.online ? 'オンライン' : 'オフライン'}
          </dd>
        </div>
        {status.battery != null ? (
          <div className={styles.statusRow}>
            <dt>バッテリー</dt>
            <dd
              className={
                status.battery < 20 && !status.charging ? styles.warn : styles.ok
              }
            >
              {status.battery}%
              {status.charging ? ' · 充電中' : ''}
            </dd>
          </div>
        ) : null}
        <div className={styles.statusRow}>
          <dt>タイムゾーン</dt>
          <dd className={styles.statusMuted}>{status.timezone}</dd>
        </div>
      </dl>

      <div className={styles.statusTip}>
        <p className={styles.statusEyebrow}>tip</p>
        <p className={styles.statusTipBody}>{status.tip}</p>
      </div>
    </aside>
  );
}
