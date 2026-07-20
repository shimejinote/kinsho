'use client';

import type { DailyStatus } from './dailyStatus';
import styles from './AppsDirectory.module.css';

/** Everyday status rail — time, day progress, tips. */
export function DailyStatusRail({ status }: { status: DailyStatus }) {
  return (
    <aside className={styles.statusRail} aria-label="今日の状態">
      <div>
        <p className={styles.statusEyebrow}>local time</p>
        <p className={styles.statusTime}>{status.time}</p>
        <p className={styles.statusDate}>
          {status.dateLabel}（{status.weekday}）· {status.phaseLabel}
        </p>
      </div>

      <dl className={styles.statusList}>
        <div className={styles.statusRow}>
          <dt>今日の進捗</dt>
          <dd>
            <span className={styles.statusBar} aria-hidden>
              <span
                className={styles.statusBarFill}
                style={{ width: `${status.dayProgress}%` }}
              />
            </span>
            <span className={styles.statusNum}>
              {status.dayProgress.toFixed(0)}%
            </span>
          </dd>
        </div>
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
