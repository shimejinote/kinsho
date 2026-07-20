/**
 * Everyday status for the lab console — clock, day progress, network, tips.
 */

import { LIFE_TIPS } from './appsData';

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

export type DailyStatus = {
  time: string;
  dateLabel: string;
  weekday: string;
  timezone: string;
  dayProgress: number;
  minutesToNextHour: number;
  phase: DayPhase;
  phaseLabel: string;
  online: boolean;
  battery: number | null;
  charging: boolean | null;
  tip: string;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function phaseOf(hour: number): { phase: DayPhase; label: string } {
  if (hour < 6) return { phase: 'night', label: '深夜' };
  if (hour < 11) return { phase: 'morning', label: '朝' };
  if (hour < 17) return { phase: 'day', label: '昼' };
  if (hour < 21) return { phase: 'evening', label: '夕方' };
  return { phase: 'night', label: '夜' };
}

export function createIdleDailyStatus(): DailyStatus {
  return {
    time: '--:--:--',
    dateLabel: '----/--/--',
    weekday: '—',
    timezone: '—',
    dayProgress: 0,
    minutesToNextHour: 0,
    phase: 'day',
    phaseLabel: '—',
    online: true,
    battery: null,
    charging: null,
    tip: LIFE_TIPS[0],
  };
}

export function buildDailyStatus(
  now: Date,
  battery: { level: number; charging: boolean } | null,
): DailyStatus {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const { phase, label } = phaseOf(h);
  const dayProgress = ((h * 3600 + m * 60 + s) / 86400) * 100;
  const remSec = 3600 - (m * 60 + s);
  const minutesToNextHour = Math.max(1, Math.ceil(remSec / 60));
  const dayKey =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  const tipOffset = Math.floor((h * 60 + m) / 5);
  const tip =
    LIFE_TIPS[(dayKey + tipOffset) % LIFE_TIPS.length] ?? LIFE_TIPS[0];

  return {
    time: `${pad(h)}:${pad(m)}:${pad(s)}`,
    dateLabel: `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())}`,
    weekday: WEEKDAYS[now.getDay()] ?? '—',
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone?.replace(/_/g, ' ') ??
      'local',
    dayProgress,
    minutesToNextHour,
    phase,
    phaseLabel: label,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    battery: battery ? Math.round(battery.level * 100) : null,
    charging: battery ? battery.charging : null,
    tip,
  };
}
