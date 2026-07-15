/**
 * Window-level mouse crank impulse.
 * Kept outside React so HTML overlays / re-renders can't drop tracking.
 */

let lastX: number | null = null;
let impulse = 0;
let listening = false;

function onMove(e: PointerEvent) {
  // Ignore non-mouse / non-pen if desired; mouse + pen + touch all OK.
  const w = window.innerWidth || 1;
  if (lastX === null) {
    lastX = e.clientX;
    return;
  }
  // Normalized horizontal delta roughly in [-2, 2] for a full-screen swipe.
  impulse += ((e.clientX - lastX) / w) * 2;
  lastX = e.clientX;
}

function onReset() {
  lastX = null;
}

export function ensureCrankListening() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  // pointermove alone (mousemove would double-fire with it).
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('blur', onReset);
  document.addEventListener('mouseleave', onReset);
}

/** Consume accumulated horizontal impulse since last call. */
export function consumeCrankImpulse() {
  const v = impulse;
  impulse = 0;
  return v;
}
