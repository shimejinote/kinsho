/**
 * Long-press drain → full absorb → glow bang restore.
 * While held, cycles repeat and glow intensity stacks (stays lit, gets brighter).
 */

export type SuctionPhase = 'idle' | 'sucking' | 'restoring';

let holding = false;
let phase: SuctionPhase = 'idle';
let strength = 0;
let restore = 0;
/** Completed absorb→bang cycles while continuously held */
let cycle = 0;
/** Sustained glow floor so it never fully goes dark between repeats */
let afterglow = 0;

const RESTORE_SEC = 1.6;
const MAX_CYCLE = 8;

/** Call when the scene mounts so HMR / remount never leaves residual pull. */
export function resetSuction() {
  holding = false;
  phase = 'idle';
  strength = 0;
  restore = 0;
  cycle = 0;
  afterglow = 0;
}

export function setSuctionHolding(next: boolean) {
  holding = next;
  if (next && phase === 'idle') {
    phase = 'sucking';
  }
  if (!next) {
    // Release — let afterglow die; reset stack next idle
  }
}

export function isSuctionHolding() {
  return holding;
}

export function getSuctionPhase() {
  return phase;
}

export function getSuction() {
  if (phase === 'restoring') return Math.max(0, 1 - restore);
  return strength;
}

export function getRestore() {
  return phase === 'restoring' ? restore : 0;
}

/** Peak flash scale for this cycle (1 → ~4.6) */
export function getCycleBoost() {
  return 1 + Math.min(cycle, MAX_CYCLE) * 0.45;
}

export function getGlow() {
  const boost = getCycleBoost();
  let pulse = 0;
  if (phase === 'restoring') {
    const rise = smoothstep(0, 0.03, restore);
    const fall = 1 - smoothstep(0.4, 1.0, restore);
    const flut = 0.85 + 0.15 * Math.sin(restore * Math.PI * 10);
    pulse = rise * fall * flut * 1.2 * boost;
  }
  // Stay lit between cycles / while sucking again
  const floor = afterglow * boost * 0.55;
  return Math.min(3.5, Math.max(pulse, floor));
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

export type SuctionFrame = {
  strength: number;
  restore: number;
  glow: number;
  phase: SuctionPhase;
  cycle: number;
};

export function tickSuction(dt: number): SuctionFrame {
  const d = Math.min(dt, 0.05);

  // Afterglow: linger while held; fade when released
  const glowTarget = holding || phase === 'restoring' ? Math.min(1, 0.25 + cycle * 0.12) : 0;
  const gAlpha = 1 - Math.pow(holding || phase === 'restoring' ? 0.94 : 0.88, d * 60);
  afterglow += (glowTarget - afterglow) * gAlpha;
  if (!holding && phase === 'idle' && afterglow < 0.01) {
    afterglow = 0;
    cycle = 0;
  }

  if (phase === 'restoring') {
    restore += d / RESTORE_SEC;
    if (restore >= 1) {
      restore = 0;
      strength = 0;
      if (holding) {
        phase = 'sucking';
        // Keep a high afterglow so the field stays bright into the next drain
        afterglow = Math.min(1, 0.4 + cycle * 0.1);
      } else {
        phase = 'idle';
      }
    }
  } else if (phase === 'sucking') {
    const target = holding ? 1 : 0;
    // Slow burn at first (余韻), only a little faster after cycle 3+
    const haste = 1 + Math.min(cycle, 5) * 0.03;
    const base = holding ? Math.pow(0.994, haste) : 0.96;
    const alpha = 1 - Math.pow(base, d * 60);
    // Extra ease-in: early press builds even slower
    const easeIn = holding ? 0.35 + 0.65 * strength : 1;
    strength += (target - strength) * alpha * easeIn;
    if (!holding && strength < 0.001) {
      strength = 0;
      phase = 'idle';
    }
    // Full entry only after a real commit
    if (holding && strength >= 0.96) {
      strength = 1;
      restore = 0.001;
      phase = 'restoring';
      cycle = Math.min(MAX_CYCLE, cycle + 1);
      afterglow = Math.min(1, 0.35 + cycle * 0.1);
    }
  } else if (holding) {
    phase = 'sucking';
  }

  return {
    strength: phase === 'restoring' ? Math.max(0, 1 - restore) : strength,
    restore: phase === 'restoring' ? restore : 0,
    glow: getGlow(),
    phase,
    cycle,
  };
}
