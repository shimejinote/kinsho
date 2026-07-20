'use client';

import { useEffect, useState } from 'react';
import {
  getGlyphStars,
  subscribeGlyphStars,
  toggleGlyphStars,
} from './glyphStarsMode';

type Props = {
  visible?: boolean;
};

/**
 * Toggle word-dust (glyph stars) ↔ classic mote starfield.
 */
export default function GlyphStarsToggle({ visible = true }: Props) {
  const [on, setOn] = useState(() => getGlyphStars());

  useEffect(() => subscribeGlyphStars(() => setOn(getGlyphStars())), []);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-auto absolute right-4 bottom-4 z-40"
      style={{ fontFamily: 'var(--font-zen), sans-serif' }}
    >
      <button
        type="button"
        onClick={() => setOn(toggleGlyphStars())}
        aria-pressed={on}
        className={`rounded border px-3 py-2 text-[11px] tracking-[0.14em] backdrop-blur-sm transition-colors ${
          on
            ? 'border-white/25 bg-white/18 text-white'
            : 'border-white/15 bg-black/55 text-white/70 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="block text-[10px] text-white/45 uppercase">field</span>
        <span className="mt-0.5 block text-[12px]">
          {on ? '文字 · 言葉' : '星 · 光点'}
        </span>
      </button>
    </div>
  );
}
