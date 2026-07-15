export type QualityTier = 'high' | 'balanced' | 'light';

export type JourneyQualityProfile = {
  tier: QualityTier;
  label: string;
  dprMax: number;
  antialias: boolean;
  shadows: boolean;
  bloom: boolean;
  dof: boolean;
  particleCount: number;
  atmosphereStreaks: number;
  grassBlades: number;
  cityBuildings: number;
  cityWindows: number;
  cityTraffic: number;
  peopleNear: number;
  peopleFar: number;
  animalsNear: number;
  animalsHerd: number;
  mushrooms: number;
  spores: number;
  threads: number;
  forestUndergrowth: number;
  treesPerVariety: number;
  preferImpostors: boolean;
  reducedMotion: boolean;
  cameraLerp: number;
};

const HIGH: JourneyQualityProfile = {
  tier: 'high',
  label: 'High',
  dprMax: 1.75,
  antialias: true,
  shadows: true,
  bloom: true,
  dof: true,
  particleCount: 25000,
  atmosphereStreaks: 1400,
  grassBlades: 1100,
  cityBuildings: 48,
  cityWindows: 220,
  cityTraffic: 90,
  peopleNear: 6,
  peopleFar: 36,
  animalsNear: 5,
  animalsHerd: 28,
  mushrooms: 70,
  spores: 240,
  threads: 48,
  forestUndergrowth: 90,
  treesPerVariety: 36,
  preferImpostors: false,
  reducedMotion: false,
  cameraLerp: 0.12,
};

const BALANCED: JourneyQualityProfile = {
  tier: 'balanced',
  label: 'Balanced',
  dprMax: 1.35,
  antialias: true,
  shadows: true,
  bloom: true,
  dof: false,
  particleCount: 14000,
  atmosphereStreaks: 800,
  grassBlades: 650,
  cityBuildings: 32,
  cityWindows: 120,
  cityTraffic: 48,
  peopleNear: 4,
  peopleFar: 28,
  animalsNear: 3,
  animalsHerd: 20,
  mushrooms: 48,
  spores: 140,
  threads: 32,
  forestUndergrowth: 56,
  treesPerVariety: 24,
  preferImpostors: false,
  reducedMotion: false,
  cameraLerp: 0.14,
};

const LIGHT: JourneyQualityProfile = {
  tier: 'light',
  label: 'Light',
  dprMax: 1,
  antialias: false,
  shadows: false,
  bloom: false,
  dof: false,
  particleCount: 7000,
  atmosphereStreaks: 360,
  grassBlades: 320,
  cityBuildings: 20,
  cityWindows: 64,
  cityTraffic: 24,
  peopleNear: 2,
  peopleFar: 22,
  animalsNear: 2,
  animalsHerd: 16,
  mushrooms: 28,
  spores: 72,
  threads: 18,
  forestUndergrowth: 28,
  treesPerVariety: 14,
  preferImpostors: true,
  reducedMotion: false,
  cameraLerp: 0.2,
};

export const QUALITY_TIERS: readonly QualityTier[] = [
  'high',
  'balanced',
  'light',
] as const;

export function profileForTier(
  tier: QualityTier,
  reducedMotion = false,
): JourneyQualityProfile {
  const base =
    tier === 'high' ? HIGH : tier === 'balanced' ? BALANCED : LIGHT;
  if (!reducedMotion) return base;
  return {
    ...LIGHT,
    tier,
    label: base.label,
    reducedMotion: true,
    bloom: false,
    dof: false,
    cameraLerp: 0.28,
  };
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Startup auto-select: mobile → light/balanced, desktop → high/balanced. */
export function detectQualityTier(): QualityTier {
  if (typeof window === 'undefined') return 'balanced';
  if (prefersReducedMotion()) return 'light';

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const mem = nav.deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (coarse || narrow) {
    if (mem !== undefined && mem <= 4) return 'light';
    return 'balanced';
  }
  if ((mem === undefined || mem >= 8) && cores >= 8) return 'high';
  return 'balanced';
}

export function nextQualityTier(tier: QualityTier): QualityTier {
  const index = QUALITY_TIERS.indexOf(tier);
  return QUALITY_TIERS[(index + 1) % QUALITY_TIERS.length];
}
