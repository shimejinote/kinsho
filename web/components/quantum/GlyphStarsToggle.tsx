'use client';

import { useEffect, useState } from 'react';
import {
  cycleFieldMode,
  getFieldMode,
  subscribeFieldMode,
  type FieldMode,
} from './glyphStarsMode';

type Props = {
  visible?: boolean;
};

const LABELS: Record<FieldMode, { sub: string; main: string }> = {
  stars: { sub: 'field', main: '星 · 光点' },
  glyphs: { sub: 'field', main: '文字 · 言葉' },
  mushrooms: { sub: 'field', main: '菌 · 胞子' },
};

/**
 * Cycle starfield ↔ word-dust ↔ shimeji silhouettes.
 */
export default function GlyphStarsToggle({ visible = true }: Props) {
  const [mode, setMode] = useState<FieldMode>(() => getFieldMode());

  useEffect(() => subscribeFieldMode(() => setMode(getFieldMode())), []);

  if (!visible) return null;

  const label = LABELS[mode];
  const active = mode !== 'stars';

  return (
    <div
      className="pointer-events-auto absolute right-4 bottom-4 z-40"
      style={{ fontFamily: 'var(--font-zen), sans-serif' }}
    >
      <button
        type="button"
        onClick={() => setMode(cycleFieldMode())}
        aria-label={`フィールド: ${label.main}`}
        className={`rounded border px-3 py-2 text-[11px] tracking-[0.14em] backdrop-blur-sm transition-colors ${
          active
            ? 'border-white/25 bg-white/18 text-white'
            : 'border-white/15 bg-black/55 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="block text-[10px] text-white/45 uppercase">
          {label.sub}
        </span>
        <span className="mt-0.5 block text-[12px]">{label.main}</span>
      </button>
    </div>
  );
}
