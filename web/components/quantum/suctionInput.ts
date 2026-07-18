/**
 * Drain → full absorb → A+E crossing flash → glow bang restore.
 * Long-press: cycles repeat while held; glow stacks.
 * One-click: `triggerWarpPlayback()` auto-ramps once through the full ritual
 * (continues after pointer release). Strength ramps slowly — dimensional warp, not a snap.
 *
 * Crossing (adopted A+E): soft cold flash (A) + motion hush (E) at portal entry.
 */

export type SuctionPhase = 'idle' | 'sucking' | 'crossing' | 'restoring';

/** Adopted “passed through the portal” combo. */
export type CrossingPattern = 'ae';

/** Canonical crossing pattern for portal entry. */
export const ADOPTED_CROSSING_PATTERN: CrossingPattern = 'ae';

let holding = false;
/** One-shot auto ritual — drives suck→crossing→restore without held pointer. */
let autoPlay = false;
let phase: SuctionPhase = 'idle';
let strength = 0;
let restore = 0;
/** Completed absorb→bang cycles while continuously held */
let cycle = 0;
/** Sustained glow floor so it never fully goes dark between repeats */
let afterglow = 0;
/** 0..1 while in crossing; 0 otherwise. */
let crossing = 0;
let phaseAge = 0;
/** Set at crossing flash peak — portal arrival for apps handoff. */
let arrivalPending = false;
/** Guards one arrival signal per crossing beat. */
let arrivalSignaled = false;
/** Slot-style “プシュン” hold — lock the frame before iris reveal. */
let freezeHold = false;

const RESTORE_SEC = 1.6;
const MAX_CYCLE = 8;
/**
 * Crossing beat:
 * A flash early → E stillness through the middle of the beat.
 */
const CROSSING_SEC = 1.9;

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Call when the scene mounts so HMR / remount never leaves residual pull. */
export function resetSuction() {
  holding = false;
  autoPlay = false;
  phase = 'idle';
  strength = 0;
  restore = 0;
  cycle = 0;
  afterglow = 0;
  crossing = 0;
  phaseAge = 0;
  arrivalPending = false;
  arrivalSignaled = false;
  freezeHold = false;
}

/** True once at dimensional arrival (flash) until consumed. */
export function consumeArrival() {
  if (!arrivalPending) return false;
  arrivalPending = false;
  return true;
}

/**
 * Lock the warp at flash-peak nucleus — “プシュン” freeze cushion.
 * Field time stops; flash/stillness stay lit until settle/iris.
 */
export function holdArrivalFreeze() {
  freezeHold = true;
  holding = false;
  autoPlay = false;
  phase = 'crossing';
  strength = 1;
  restore = 0;
  crossing = 0.12;
  phaseAge = CROSSING_SEC * 0.12;
  afterglow = 1;
  arrivalPending = false;
}

/**
 * Cut the ritual short after apps handoff — no bang-restore bounce.
 */
export function settleAfterArrival() {
  freezeHold = false;
  holding = false;
  autoPlay = false;
  phase = 'idle';
  strength = 0;
  restore = 0;
  crossing = 0;
  phaseAge = 0;
  afterglow = 0;
  arrivalPending = false;
  arrivalSignaled = false;
}

export function setSuctionHolding(next: boolean) {
  holding = next;
  if (next && phase === 'idle' && !autoPlay) {
    phase = 'sucking';
  }
}

export function isSuctionHolding() {
  return holding;
}

/** True while a one-click or long-press ritual should ignore new triggers. */
export function isWarpBusy() {
  return (
    freezeHold ||
    autoPlay ||
    phase === 'crossing' ||
    phase === 'restoring' ||
    (phase === 'sucking' && holding)
  );
}

export function isWarpAutoPlaying() {
  return autoPlay;
}

/**
 * Start a one-shot suck → crossing → restore. Completes after pointer release.
 * No-ops if a ritual is already in progress (debounce / double-fire guard).
 */
export function triggerWarpPlayback(): boolean {
  if (autoPlay || phase === 'crossing' || phase === 'restoring') return false;
  if (phase === 'sucking' && holding) return false;
  autoPlay = true;
  holding = false;
  if (phase === 'idle') phase = 'sucking';
  return true;
}

export function getSuctionPhase() {
  return phase;
}

export function getCrossingPattern(): CrossingPattern {
  return ADOPTED_CROSSING_PATTERN;
}

export function getSuction() {
  if (phase === 'restoring') return Math.max(0, 1 - restore);
  if (phase === 'crossing') return 1;
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
  const flashLift = getFlash() * 0.55 * boost;
  return Math.min(3.5, Math.max(pulse, floor) + flashLift);
}

/** Crossing progress 0..1 (only while phase === crossing). */
export function getCrossing() {
  return crossing;
}

export function isCrossing() {
  return phase === 'crossing';
}

/**
 * Soft white/cold flash envelope (pattern A).
 * Peaks early in the crossing beat.
 */
export function getFlash() {
  if (freezeHold) return 0.36;
  if (phase !== 'crossing' || crossing <= 0) return 0;
  const c = crossing;
  // Hot early flash — brighter for nucleus → iris continuity
  const peak = Math.exp(-Math.pow((c - 0.12) / 0.055, 2));
  const tail = Math.exp(-Math.pow((c - 0.24) / 0.1, 2)) * 0.45;
  return Math.min(1, peak * 1.05 + tail * 0.5);
}

/**
 * Dimensional rift envelope — late suck + very early crossing,
 * before / slightly overlapping the soft A flash. Soft open/close,
 * not bolt spikes. Brief, low intensity.
 */
export function getRift() {
  if (phase === 'sucking') {
    const s = strength;
    // Membrane opens near plunge commit (~0.96 → crossing)
    const gate = smoothstep(0.86, 0.93, s);
    if (gate < 0.01) return 0;
    // Soft swell as strength crosses the plunge thresholds
    const swell1 = Math.exp(-Math.pow((s - 0.9) / 0.022, 2));
    const swell2 = Math.exp(-Math.pow((s - 0.945) / 0.018, 2)) * 0.7;
    const linger = smoothstep(0.93, 0.97, s) * 0.28;
    return Math.min(1, gate * (swell1 * 0.5 + swell2 * 0.45 + linger));
  }
  if (phase === 'crossing' && crossing > 0) {
    const c = crossing;
    // Residual membrane fades before A flash peak (~0.12)
    const open = Math.exp(-Math.pow((c - 0.02) / 0.04, 2));
    const shimmer = Math.exp(-Math.pow((c - 0.05) / 0.028, 2)) * 0.35;
    const kill = 1 - smoothstep(0.07, 0.12, c);
    return Math.min(1, (open * 0.5 + shimmer) * kill);
  }
  return 0;
}

/** @deprecated Use getRift — kept as alias for any external callers. */
export function getLightning() {
  return getRift();
}

/**
 * Motion hush (pattern E). Freezes mid-crossing after the flash.
 */
export function getStillness() {
  if (freezeHold) return 1;
  if (phase !== 'crossing' || crossing <= 0) return 0;
  const c = crossing;
  return smoothstep(0.04, 0.12, c) * (1 - smoothstep(0.42, 0.58, c));
}

/** Slow the field while stillness holds. */
export function getFieldTimeScale() {
  if (freezeHold) return 0;
  const still = getStillness();
  return 1 - still * 0.92;
}

/** 1 while the pre-iris “プシュン” cushion is held. */
export function getArrivalFreeze() {
  return freezeHold ? 1 : 0;
}

function enterCrossing() {
  strength = 1;
  crossing = 0;
  phaseAge = 0;
  phase = 'crossing';
  cycle = Math.min(MAX_CYCLE, cycle + 1);
  afterglow = Math.min(1, 0.35 + cycle * 0.1);
  arrivalSignaled = false;
}

function enterRestoring() {
  crossing = 0;
  phaseAge = 0;
  restore = 0.001;
  phase = 'restoring';
  afterglow = Math.min(1, 0.4 + cycle * 0.1);
}

export type SuctionFrame = {
  strength: number;
  restore: number;
  glow: number;
  phase: SuctionPhase;
  cycle: number;
  crossing: number;
  flash: number;
  stillness: number;
  rift: number;
};

export function tickSuction(dt: number): SuctionFrame {
  const d = Math.min(dt, 0.05);
  const driving = holding || autoPlay;

  // Afterglow: linger while driven / crossing / restoring; fade when released
  const glowHot =
    driving || phase === 'restoring' || phase === 'crossing';
  const glowTarget = glowHot ? Math.min(1, 0.25 + cycle * 0.12) : 0;
  const gAlpha = 1 - Math.pow(glowHot ? 0.94 : 0.88, d * 60);
  afterglow += (glowTarget - afterglow) * gAlpha;
  if (!driving && phase === 'idle' && afterglow < 0.01) {
    afterglow = 0;
    cycle = 0;
  }

  if (freezeHold) {
    crossing = 0.12;
    strength = 1;
    afterglow = 1;
    return {
      strength: 1,
      restore: 0,
      glow: getGlow(),
      phase,
      cycle,
      crossing,
      flash: getFlash(),
      stillness: 1,
      rift: 0,
    };
  }

  if (phase === 'crossing') {
    phaseAge += d;
    crossing = Math.min(1, phaseAge / CROSSING_SEC);
    strength = 1;
    afterglow = Math.max(afterglow, 0.85 + getFlash() * 0.15);
    // Arrive as the soft A flash peaks — iris opens with the nucleus
    if (!arrivalSignaled && crossing >= 0.08) {
      arrivalSignaled = true;
      arrivalPending = true;
    }
    if (crossing >= 1) {
      enterRestoring();
    }
  } else if (phase === 'restoring') {
    restore += d / RESTORE_SEC;
    if (restore >= 1) {
      restore = 0;
      strength = 0;
      // Long-press only: repeat while still held. One-click always ends after one ritual.
      if (holding && !autoPlay) {
        phase = 'sucking';
        // Keep a high afterglow so the field stays bright into the next drain
        afterglow = Math.min(1, 0.4 + cycle * 0.1);
      } else {
        autoPlay = false;
        phase = 'idle';
      }
    }
  } else if (phase === 'sucking') {
    const target = driving ? 1 : 0;
    // Slow dimensional warp: long ease-in, only slight haste after many cycles
    const haste = 1 + Math.min(cycle, 5) * 0.02;
    const base = driving ? Math.pow(0.996, haste) : 0.96;
    const alpha = 1 - Math.pow(base, d * 60);
    // Extra ease-in: early press builds even slower (time spent opening the gate)
    const easeIn = driving ? 0.22 + 0.78 * strength : 1;
    strength += (target - strength) * alpha * easeIn;
    if (!driving && strength < 0.001) {
      strength = 0;
      phase = 'idle';
    }
    // Full entry → A+E crossing, then restore bang
    if (driving && strength >= 0.96) {
      enterCrossing();
    }
  } else if (driving) {
    phase = 'sucking';
  }

  return {
    strength: phase === 'restoring' ? Math.max(0, 1 - restore) : strength,
    restore: phase === 'restoring' ? restore : 0,
    glow: getGlow(),
    phase,
    cycle,
    crossing,
    flash: getFlash(),
    stillness: getStillness(),
    rift: getRift(),
  };
}
