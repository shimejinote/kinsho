'use client';

import { useEffect, useState } from 'react';
import { isWarpBusy, resetSuction, triggerWarpPlayback } from './suctionInput';
import {
  getWarpDiveId,
  subscribeWarpDive,
  WARP_DIVE_PATTERNS,
  type WarpDiveId,
} from './warpPattern';

type Props = {
  visible?: boolean;
};

/**
 * Debug-only dive pattern picker.
 * Production portal entry picks at random among adopted dives;
 * these buttons lock a specific dive for A/B review.
 */
export default function WarpDebugPanel({ visible = true }: Props) {
  const [active, setActive] = useState<WarpDiveId>(() => getWarpDiveId());

  useEffect(() => subscribeWarpDive(() => setActive(getWarpDiveId())), []);

  if (!visible) return null;

  const run = (id: WarpDiveId) => {
    setActive(id);
    if (isWarpBusy()) {
      resetSuction();
    }
    // Let reset settle one frame, then fire with locked dive (no random).
    requestAnimationFrame(() => {
      triggerWarpPlayback({ dive: id });
    });
  };

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-4 z-40 max-w-[min(100%,20rem)] rounded border border-white/15 bg-black/55 px-3 py-2.5 text-[11px] text-white/85 backdrop-blur-sm"
      style={{ fontFamily: 'var(--font-zen), sans-serif' }}
    >
      <p className="mb-2 tracking-[0.18em] text-white/45 uppercase">
        debug · dive
      </p>
      <div className="flex flex-col gap-1.5">
        {WARP_DIVE_PATTERNS.map((p) => {
          const on = active === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => run(p.id)}
              className={`rounded px-2.5 py-1.5 text-left transition-colors ${
                on
                  ? 'bg-white/18 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="block text-[12px] tracking-wide">{p.label}</span>
              <span className="mt-0.5 block text-[10px] text-white/45">
                {p.blurb}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
