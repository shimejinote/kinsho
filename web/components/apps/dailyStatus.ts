/**
 * Everyday status — clock and calendar progress (day / week / month / year).
 */

import { LIFE_TIPS } from './appsData';

export type DayPhase = 'morning' | 'day' | 'evening' | 'night';

export type DailyStatus = {
  time: string;
  dateLabel: string;
  weekday: string;
  timezone: string;
  dayProgress: number;
  weekProgress: number;
  monthProgress: number;
  yearProgress: number;
  minutesToNextHour: number;
  phase: DayPhase;
  phaseLabel: string;
  online: boolean;
  battery: number | null;
  charging: boolean | null;
  tip: string;
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

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

/** Monday-start week (0 = Mon … 6 = Sun). */
function mondayIndex(day: number) {
  return day === 0 ? 6 : day - 1;
}

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function calendarProgress(now: Date) {
  const y = now.getFullYear();
  const month = now.getMonth();
  const daySec =
    now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const dayProgress = (daySec / 86_400) * 100;

  const weekElapsed =
    mondayIndex(now.getDay()) * DAY_MS + (now.getTime() - startOfLocalDay(now));
  const weekProgress = (weekElapsed / WEEK_MS) * 100;

  const monthStart = new Date(y, month, 1).getTime();
  const monthEnd = new Date(y, month + 1, 1).getTime();
  const monthProgress =
    ((now.getTime() - monthStart) / (monthEnd - monthStart)) * 100;

  const yearStart = new Date(y, 0, 1).getTime();
  const yearEnd = new Date(y + 1, 0, 1).getTime();
  const yearProgress =
    ((now.getTime() - yearStart) / (yearEnd - yearStart)) * 100;

  return { dayProgress, weekProgress, monthProgress, yearProgress };
}

export function createIdleDailyStatus(): DailyStatus {
  return {
    time: '--:--:--',
    dateLabel: '----/--/--',
    weekday: '—',
    timezone: '—',
    dayProgress: 0,
    weekProgress: 0,
    monthProgress: 0,
    yearProgress: 0,
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
  const { dayProgress, weekProgress, monthProgress, yearProgress } =
    calendarProgress(now);
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
    weekProgress,
    monthProgress,
    yearProgress,
    minutesToNextHour,
    phase,
    phaseLabel: label,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    battery: battery ? Math.round(battery.level * 100) : null,
    charging: battery ? battery.charging : null,
    tip,
  };
}
