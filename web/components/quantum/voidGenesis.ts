/**
 * Void boot timing — started once per canvas session.
 * No deferral flags (those caused stuck black screens).
 */

let t0 = 0;

/** Stars expand from nothing (~seconds). */
const STAR_SEC = 2.35;
/** Portal starts after most stars have appeared. */
const PORTAL_START_SEC = 1.55;
/** Whoosh duration (overshoot settle). */
const PORTAL_DUR_SEC = 0.78;

function clamp01(x: number) {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** easeOutBack — scale overshoots then settles (ぶわん). */
function easeOutBack(t: number) {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/** Call when the void canvas mounts (and on re-enter). Always restarts. */
export function beginVoidGenesis() {
  t0 = performance.now();
}

/** 0 = black, 1 = full starfield. */
export function getStarGenesis() {
  if (!t0) return 0;
  const t = (performance.now() - t0) / 1000;
  return smoothstep(t / STAR_SEC);
}

/**
 * 0 = hidden, peaks slightly above 1 mid-whoosh, settles to 1.
 * Use as portal scale multiplier.
 */
export function getPortalWhoosh() {
  if (!t0) return 0;
  const t = (performance.now() - t0) / 1000;
  if (t < PORTAL_START_SEC) return 0;
  return easeOutBack((t - PORTAL_START_SEC) / PORTAL_DUR_SEC);
}

/** Opacity 0→1 without overshoot. */
export function getPortalReveal() {
  if (!t0) return 0;
  const t = (performance.now() - t0) / 1000;
  if (t < PORTAL_START_SEC) return 0;
  return smoothstep((t - PORTAL_START_SEC) / (PORTAL_DUR_SEC * 0.55));
}

export function isPortalReady() {
  return getPortalReveal() > 0.92;
}
