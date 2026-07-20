'use client';

import { useEffect, useState } from 'react';
import {
  buildDailyStatus,
  createIdleDailyStatus,
  type DailyStatus,
} from './dailyStatus';

type BatteryLike = {
  level: number;
  charging: boolean;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
};

/**
 * Local clock + network + optional battery. Updates every second.
 */
export function useDailyStatus(active = true): DailyStatus {
  const [status, setStatus] = useState(createIdleDailyStatus);
  const [battery, setBattery] = useState<{
    level: number;
    charging: boolean;
  } | null>(null);

  useEffect(() => {
    if (!active || typeof navigator === 'undefined') return;

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<BatteryLike>;
    };
    if (!nav.getBattery) return;

    let bat: BatteryLike | null = null;
    const sync = () => {
      if (!bat) return;
      setBattery({ level: bat.level, charging: bat.charging });
    };

    nav.getBattery().then((b) => {
      bat = b;
      sync();
      b.addEventListener('levelchange', sync);
      b.addEventListener('chargingchange', sync);
    });

    return () => {
      if (!bat) return;
      bat.removeEventListener('levelchange', sync);
      bat.removeEventListener('chargingchange', sync);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;

    const tick = () => setStatus(buildDailyStatus(new Date(), battery));
    tick();
    const id = window.setInterval(tick, 1000);

    const onNet = () => tick();
    window.addEventListener('online', onNet);
    window.addEventListener('offline', onNet);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', onNet);
      window.removeEventListener('offline', onNet);
    };
  }, [active, battery]);

  return status;
}
