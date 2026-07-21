'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { peekActiveSky, type PickedSky } from './dailySky';
import styles from './VoidBrandMark.module.css';

function rgbCss(c: [number, number, number], gain = 1) {
  const ch = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n * gain)) * 255);
  return `rgb(${ch(c[0])} ${ch(c[1])} ${ch(c[2])})`;
}

function noStyleFromSky(sky: PickedSky): CSSProperties {
  const a = rgbCss(sky.starCool, 1.15);
  const b = rgbCss(sky.starWarm, 1.2);
  const c = rgbCss(sky.starHeat, 1.25);
  const d = rgbCss(sky.freeze.accent, 1.1);
  return {
    backgroundImage: `linear-gradient(110deg, ${a} 0%, ${b} 32%, ${c} 62%, ${d} 100%)`,
  };
}

/**
 * Quiet identity on the void entry — enough to read as Shimeji, not a hero title.
 * Sky-tinted 「の」 waits for QuantumScene's visit sky (no SSR random → no hydration mismatch).
 */
export default function VoidBrandMark() {
  const [noStyle, setNoStyle] = useState<CSSProperties | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    let frames = 0;
    let raf = 0;

    const tryApply = () => {
      if (!alive) return;
      const sky = peekActiveSky();
      if (sky) {
        setNoStyle(noStyleFromSky(sky));
        return;
      }
      frames += 1;
      // Dynamic Canvas mounts a tick later — keep waiting briefly.
      if (frames < 180) {
        raf = requestAnimationFrame(tryApply);
      }
    };

    raf = requestAnimationFrame(tryApply);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className={styles.mark} aria-label="しめじの研究所">
      <div className={styles.row}>
        <p className={styles.label}>
          しめじ
          <span
            className={`${styles.no}${noStyle ? ` ${styles.noLit}` : ''}`}
            style={noStyle}
          >
            の
          </span>
          研究所
        </p>
        <span className={styles.sil} aria-hidden />
      </div>
    </div>
  );
}
