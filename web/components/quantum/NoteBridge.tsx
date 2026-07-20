'use client';

import { useEffect, useState } from 'react';

type Props = {
  onDone?: () => void;
};

/**
 * note inbound veil — deep space only (no paper/cream flash).
 * Fades out to reveal the live starfield underneath.
 */
export default function NoteBridge({ onDone }: Props) {
  const [clear, setClear] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const toClear = window.setTimeout(() => setClear(true), 280);
    const drop = window.setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 280 + 900);
    return () => {
      window.clearTimeout(toClear);
      window.clearTimeout(drop);
    };
  }, [onDone]);

  if (gone) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-50"
      style={{
        background:
          'radial-gradient(ellipse at 50% 42%, #0a1420 0%, #04060a 48%, #010204 100%)',
        opacity: clear ? 0 : 1,
        transition: 'opacity 0.9s ease-out',
      }}
    />
  );
}
