'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { setSuctionHolding } from '../quantum/suctionInput';

/**
 * Reliable DOM hit target over the center seal.
 * Canvas raycasting is easy to miss / steal; this always receives the press.
 */
export default function PortalHotspot() {
  const router = useRouter();
  const downAt = useRef(0);
  const holding = useRef(false);

  useEffect(() => {
    const end = () => {
      if (!holding.current) return;
      holding.current = false;
      setSuctionHolding(false);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('blur', end);
    return () => {
      end();
      window.removeEventListener('pointerup', end);
      window.removeEventListener('blur', end);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="短押しで Apps、長押しで森を突っ走る"
      className="absolute left-1/2 top-[48%] z-30 h-28 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full border border-sky-700/20 bg-white/10 p-0 hover:border-sky-600/35 hover:bg-white/20"
      style={{ touchAction: 'none' }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        holding.current = true;
        downAt.current = performance.now();
        setSuctionHolding(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const held = performance.now() - downAt.current;
        holding.current = false;
        setSuctionHolding(false);
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* already released */
        }
        if (held < 320) router.push('/apps/');
      }}
      onPointerCancel={() => {
        holding.current = false;
        setSuctionHolding(false);
      }}
    />
  );
}
