/**
 * Debug / A-B warp dive patterns — cinematic variants.
 *
 * Shared: the final freeze → iris → menu handoff (QuantumMount) is identical.
 * Everything up to arrival (suck curve, flash color, vignette, camera punch,
 * rift membrane) is per-pattern so each dive reads as a different "film".
 */

export type WarpDiveId =
  | 'ae-classic'
  | 'snap-plunge'
  | 'emerald-fold'
  | 'lightspeed-bloom'
  | 'maelstrom';

export type WarpVisual = {
  /** Flash tint + how strongly it overrides the freeze palette (0..1). */
  flashColor: [number, number, number];
  flashColorMix: number;
  /** Center-dark well color. */
  vigDark: [number, number, number];
  /** Outer-bright lift color. */
  vigBright: [number, number, number];
  /** Dark-well tightness (>1 harder/tighter, <1 wide/soft). */
  wellTight: number;
  /** Outer brightness gain. */
  outerGain: number;
  /** FOV / exposure punch multiplier at flash. */
  camPunch: number;
  /** Extra exposure lift through the dive. */
  exposureLift: number;
  /** Rift membrane tint. */
  riftColor: [number, number, number];
  /** Full-frame white flood tracking the flash (0..1). Lightspeed jump. */
  whiteout?: number;
  /** Rotating spiral-arm strength in the vignette (0..1). Maelstrom. */
  vortex?: number;
  /** Camera roll (radians) about the view axis through the dive. */
  cameraRoll?: number;
};

export type WarpDivePattern = {
  id: WarpDiveId;
  label: string;
  blurb: string;
  suckSpeed: number;
  suckEaseIn: number;
  crossingSec: number;
  restoreSec: number;
  flashPeakAt: number;
  flashWidth: number;
  flashGain: number;
  stillIn: number;
  stillOut0: number;
  stillOut1: number;
  arrivalAt: number;
  visual: WarpVisual;
};

export const WARP_DIVE_PATTERNS: readonly WarpDivePattern[] = [
  {
    id: 'ae-classic',
    label: 'A+E 古典',
    blurb: '遅い開門 · 冷たい白閃光 · 静止',
    suckSpeed: 1,
    suckEaseIn: 1,
    crossingSec: 1.9,
    restoreSec: 1.6,
    flashPeakAt: 0.12,
    flashWidth: 0.055,
    flashGain: 1.05,
    stillIn: 0.04,
    stillOut0: 0.42,
    stillOut1: 0.58,
    arrivalAt: 0.08,
    visual: {
      flashColor: [0.9, 0.96, 1.0],
      flashColorMix: 0.28,
      vigDark: [0.0, 0.0, 0.02],
      vigBright: [0.42, 0.58, 0.98],
      wellTight: 1.0,
      outerGain: 1.0,
      camPunch: 1.0,
      exposureLift: 0.0,
      riftColor: [0.55, 0.85, 1.0],
    },
  },
  {
    id: 'snap-plunge',
    label: '急降下',
    blurb: '一気に吸引 · 灼熱の白金閃光 · 強い衝撃',
    suckSpeed: 2.4,
    suckEaseIn: 0.3,
    crossingSec: 1.05,
    restoreSec: 1.05,
    flashPeakAt: 0.08,
    flashWidth: 0.03,
    flashGain: 1.5,
    stillIn: 0.02,
    stillOut0: 0.2,
    stillOut1: 0.34,
    arrivalAt: 0.06,
    visual: {
      flashColor: [1.0, 0.92, 0.68],
      flashColorMix: 0.6,
      vigDark: [0.03, 0.005, 0.0],
      vigBright: [1.0, 0.72, 0.36],
      wellTight: 1.55,
      outerGain: 1.5,
      camPunch: 1.9,
      exposureLift: 0.28,
      riftColor: [1.0, 0.7, 0.4],
    },
  },
  {
    id: 'emerald-fold',
    label: '翠の裂け目',
    blurb: '静かな折り畳み · 翠の膜 · 深い静寂',
    suckSpeed: 0.85,
    suckEaseIn: 1.15,
    crossingSec: 2.3,
    restoreSec: 1.7,
    flashPeakAt: 0.16,
    flashWidth: 0.07,
    flashGain: 0.7,
    stillIn: 0.08,
    stillOut0: 0.62,
    stillOut1: 0.86,
    arrivalAt: 0.14,
    visual: {
      flashColor: [0.5, 1.0, 0.78],
      flashColorMix: 0.62,
      vigDark: [0.0, 0.02, 0.018],
      vigBright: [0.36, 1.0, 0.82],
      wellTight: 1.1,
      outerGain: 1.05,
      camPunch: 0.95,
      exposureLift: 0.06,
      riftColor: [0.4, 1.0, 0.82],
    },
  },
  {
    id: 'lightspeed-bloom',
    label: '白光爆ぜ',
    blurb: '超加速 · 全画面ホワイトアウト · 光速跳躍',
    suckSpeed: 2.1,
    suckEaseIn: 0.35,
    crossingSec: 1.15,
    restoreSec: 1.15,
    flashPeakAt: 0.1,
    flashWidth: 0.045,
    flashGain: 1.7,
    stillIn: 0.02,
    stillOut0: 0.22,
    stillOut1: 0.4,
    arrivalAt: 0.11,
    visual: {
      flashColor: [1.0, 1.0, 1.0],
      flashColorMix: 0.78,
      vigDark: [0.0, 0.0, 0.0],
      vigBright: [1.0, 0.98, 0.95],
      wellTight: 0.85,
      outerGain: 1.4,
      camPunch: 2.3,
      exposureLift: 0.55,
      riftColor: [0.92, 0.96, 1.0],
      whiteout: 1.0,
    },
  },
  {
    id: 'maelstrom',
    label: '渦潮',
    blurb: '回転する虚空 · 黄金の降着環 · 渦に呑まれる',
    suckSpeed: 0.7,
    suckEaseIn: 1.3,
    crossingSec: 2.7,
    restoreSec: 1.9,
    flashPeakAt: 0.2,
    flashWidth: 0.085,
    flashGain: 0.95,
    stillIn: 0.1,
    stillOut0: 0.56,
    stillOut1: 0.82,
    arrivalAt: 0.17,
    visual: {
      flashColor: [1.0, 0.82, 0.42],
      flashColorMix: 0.6,
      vigDark: [0.02, 0.0, 0.05],
      vigBright: [1.0, 0.7, 0.28],
      wellTight: 1.2,
      outerGain: 1.25,
      camPunch: 1.1,
      exposureLift: 0.05,
      riftColor: [1.0, 0.68, 0.86],
      vortex: 1.0,
      cameraRoll: 0.55,
    },
  },
] as const;

let activeId: WarpDiveId = 'ae-classic';

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeWarpDive(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getWarpDiveId(): WarpDiveId {
  return activeId;
}

export function getWarpDivePattern(): WarpDivePattern {
  return (
    WARP_DIVE_PATTERNS.find((p) => p.id === activeId) ?? WARP_DIVE_PATTERNS[0]!
  );
}

export function setWarpDiveId(id: WarpDiveId) {
  if (activeId === id) return;
  activeId = id;
  notify();
}

/**
 * Pick a dive at ritual start. Avoids immediate repeat when 2+ patterns exist.
 */
export function pickRandomWarpDive(): WarpDiveId {
  const pool = WARP_DIVE_PATTERNS;
  if (pool.length === 0) return activeId;
  if (pool.length === 1) {
    setWarpDiveId(pool[0]!.id);
    return pool[0]!.id;
  }
  const others = pool.filter((p) => p.id !== activeId);
  const pick = others[Math.floor(Math.random() * others.length)]!;
  setWarpDiveId(pick.id);
  return pick.id;
}
