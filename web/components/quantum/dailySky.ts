/**
 * Void sky moods — picked at random on each visit.
 * Portal ritual stays identical; only the idle field shifts.
 */

export type VoidSky = {
  id: string;
  label: string;
  background: [number, number, number];
  cssBg: string;
  starCool: [number, number, number];
  starWarm: [number, number, number];
  starHeat: [number, number, number];
  speedScale: number;
  yAmpScale: number;
  sizeScale: number;
  twinkleScale: number;
  exposure: number;
  densityScale: number;
};

/** @deprecated Prefer VoidSky — kept for existing imports. */
export type DailySky = VoidSky;

const SKIES: VoidSky[] = [
  {
    id: 'void-blue',
    label: '深空',
    background: [0.012, 0.012, 0.031],
    cssBg: '#030308',
    starCool: [0.72, 0.82, 1.0],
    starWarm: [1.0, 0.9, 0.7],
    starHeat: [1.0, 0.55, 0.22],
    speedScale: 1,
    yAmpScale: 1,
    sizeScale: 1,
    twinkleScale: 1,
    exposure: 0.82,
    densityScale: 1,
  },
  {
    id: 'nebula-rose',
    label: '星雲紅',
    background: [0.04, 0.015, 0.035],
    cssBg: '#0a0409',
    starCool: [0.95, 0.72, 0.88],
    starWarm: [1.0, 0.82, 0.7],
    starHeat: [1.0, 0.4, 0.45],
    speedScale: 0.88,
    yAmpScale: 1.15,
    sizeScale: 1.05,
    twinkleScale: 1.2,
    exposure: 0.78,
    densityScale: 0.95,
  },
  {
    id: 'emerald-tide',
    label: '翠潮',
    background: [0.01, 0.035, 0.032],
    cssBg: '#030908',
    starCool: [0.55, 0.95, 0.88],
    starWarm: [0.85, 1.0, 0.75],
    starHeat: [0.35, 0.95, 0.7],
    speedScale: 1.08,
    yAmpScale: 0.9,
    sizeScale: 0.95,
    twinkleScale: 0.85,
    exposure: 0.8,
    densityScale: 1.05,
  },
  {
    id: 'amber-dusk',
    label: '琥珀黄昏',
    background: [0.04, 0.025, 0.012],
    cssBg: '#0a0603',
    starCool: [1.0, 0.85, 0.55],
    starWarm: [1.0, 0.72, 0.4],
    starHeat: [1.0, 0.5, 0.18],
    speedScale: 0.75,
    yAmpScale: 0.85,
    sizeScale: 1.12,
    twinkleScale: 0.7,
    exposure: 0.76,
    densityScale: 0.9,
  },
  {
    id: 'ice-field',
    label: '氷原',
    background: [0.02, 0.035, 0.06],
    cssBg: '#050910',
    starCool: [0.7, 0.88, 1.0],
    starWarm: [0.9, 0.95, 1.0],
    starHeat: [0.55, 0.75, 1.0],
    speedScale: 1.2,
    yAmpScale: 1.25,
    sizeScale: 0.88,
    twinkleScale: 1.35,
    exposure: 0.88,
    densityScale: 1.1,
  },
  {
    id: 'violet-rift',
    label: '紫隙',
    background: [0.03, 0.015, 0.055],
    cssBg: '#08040e',
    starCool: [0.78, 0.65, 1.0],
    starWarm: [0.95, 0.8, 1.0],
    starHeat: [0.7, 0.4, 1.0],
    speedScale: 0.95,
    yAmpScale: 1.35,
    sizeScale: 1.0,
    twinkleScale: 1.1,
    exposure: 0.8,
    densityScale: 1,
  },
  {
    id: 'silver-dust',
    label: '銀塵',
    background: [0.025, 0.028, 0.035],
    cssBg: '#06070a',
    starCool: [0.9, 0.93, 1.0],
    starWarm: [1.0, 0.98, 0.92],
    starHeat: [0.85, 0.88, 1.0],
    speedScale: 1.05,
    yAmpScale: 1.05,
    sizeScale: 0.82,
    twinkleScale: 1.45,
    exposure: 0.9,
    densityScale: 1.15,
  },
  {
    id: 'copper-storm',
    label: '銅嵐',
    background: [0.045, 0.02, 0.01],
    cssBg: '#0c0502',
    starCool: [1.0, 0.7, 0.45],
    starWarm: [1.0, 0.55, 0.3],
    starHeat: [1.0, 0.35, 0.12],
    speedScale: 1.25,
    yAmpScale: 0.7,
    sizeScale: 1.08,
    twinkleScale: 0.9,
    exposure: 0.74,
    densityScale: 0.92,
  },
  {
    id: 'mint-fog',
    label: '薄荷霧',
    background: [0.015, 0.04, 0.038],
    cssBg: '#040a09',
    starCool: [0.7, 1.0, 0.92],
    starWarm: [0.9, 1.0, 0.85],
    starHeat: [0.4, 0.9, 0.75],
    speedScale: 0.82,
    yAmpScale: 1.1,
    sizeScale: 0.9,
    twinkleScale: 1.15,
    exposure: 0.84,
    densityScale: 1.08,
  },
  {
    id: 'crimson-abyss',
    label: '紅淵',
    background: [0.05, 0.008, 0.015],
    cssBg: '#0d0204',
    starCool: [1.0, 0.55, 0.55],
    starWarm: [1.0, 0.75, 0.65],
    starHeat: [1.0, 0.25, 0.2],
    speedScale: 0.7,
    yAmpScale: 1.4,
    sizeScale: 1.15,
    twinkleScale: 0.75,
    exposure: 0.72,
    densityScale: 0.88,
  },
  {
    id: 'cobalt-deep',
    label: '紺碧',
    background: [0.008, 0.02, 0.055],
    cssBg: '#02050e',
    starCool: [0.45, 0.7, 1.0],
    starWarm: [0.7, 0.85, 1.0],
    starHeat: [0.3, 0.55, 1.0],
    speedScale: 1.15,
    yAmpScale: 0.95,
    sizeScale: 0.92,
    twinkleScale: 1.05,
    exposure: 0.86,
    densityScale: 1.12,
  },
  {
    id: 'pearl-night',
    label: '真珠夜',
    background: [0.03, 0.03, 0.04],
    cssBg: '#08080a',
    starCool: [0.95, 0.9, 0.95],
    starWarm: [1.0, 0.95, 0.88],
    starHeat: [0.9, 0.7, 0.85],
    speedScale: 0.9,
    yAmpScale: 1.2,
    sizeScale: 1.18,
    twinkleScale: 0.65,
    exposure: 0.85,
    densityScale: 0.85,
  },
  {
    id: 'chartreuse-veil',
    label: '黄緑幕',
    background: [0.025, 0.04, 0.012],
    cssBg: '#060a03',
    starCool: [0.85, 1.0, 0.45],
    starWarm: [1.0, 0.95, 0.55],
    starHeat: [0.7, 1.0, 0.3],
    speedScale: 1.1,
    yAmpScale: 1.0,
    sizeScale: 0.98,
    twinkleScale: 1.25,
    exposure: 0.79,
    densityScale: 1.02,
  },
  {
    id: 'indigo-still',
    label: '藍寂',
    background: [0.015, 0.012, 0.045],
    cssBg: '#04030b',
    starCool: [0.6, 0.7, 1.0],
    starWarm: [0.8, 0.85, 1.0],
    starHeat: [0.5, 0.45, 1.0],
    speedScale: 0.65,
    yAmpScale: 0.8,
    sizeScale: 1.05,
    twinkleScale: 0.55,
    exposure: 0.77,
    densityScale: 0.98,
  },
  {
    id: 'solar-ember',
    label: '陽炎',
    background: [0.05, 0.03, 0.008],
    cssBg: '#0d0802',
    starCool: [1.0, 0.9, 0.5],
    starWarm: [1.0, 0.75, 0.35],
    starHeat: [1.0, 0.45, 0.1],
    speedScale: 1.3,
    yAmpScale: 0.75,
    sizeScale: 1.1,
    twinkleScale: 1.0,
    exposure: 0.83,
    densityScale: 0.94,
  },
  {
    id: 'aqua-glass',
    label: '水硝',
    background: [0.01, 0.04, 0.05],
    cssBg: '#030a0d',
    starCool: [0.5, 0.95, 1.0],
    starWarm: [0.8, 1.0, 0.95],
    starHeat: [0.25, 0.85, 1.0],
    speedScale: 1.18,
    yAmpScale: 1.3,
    sizeScale: 0.85,
    twinkleScale: 1.4,
    exposure: 0.87,
    densityScale: 1.18,
  },
  {
    id: 'obsidian',
    label: '黒曜',
    background: [0.008, 0.008, 0.01],
    cssBg: '#020203',
    starCool: [0.85, 0.88, 0.95],
    starWarm: [1.0, 0.95, 0.85],
    starHeat: [0.7, 0.75, 0.9],
    speedScale: 0.85,
    yAmpScale: 0.9,
    sizeScale: 0.75,
    twinkleScale: 1.6,
    exposure: 0.7,
    densityScale: 1.25,
  },
  {
    id: 'lilac-haze',
    label: '薄紫霞',
    background: [0.035, 0.025, 0.05],
    cssBg: '#09060d',
    starCool: [0.9, 0.75, 1.0],
    starWarm: [1.0, 0.85, 0.95],
    starHeat: [0.75, 0.5, 0.95],
    speedScale: 0.92,
    yAmpScale: 1.15,
    sizeScale: 1.02,
    twinkleScale: 1.0,
    exposure: 0.81,
    densityScale: 1.0,
  },
  {
    id: 'teal-silence',
    label: '青緑黙',
    background: [0.01, 0.03, 0.035],
    cssBg: '#03080a',
    starCool: [0.4, 0.9, 0.85],
    starWarm: [0.7, 0.95, 0.9],
    starHeat: [0.2, 0.8, 0.75],
    speedScale: 0.78,
    yAmpScale: 1.05,
    sizeScale: 0.95,
    twinkleScale: 0.8,
    exposure: 0.8,
    densityScale: 1.06,
  },
  {
    id: 'noir-gold',
    label: '黒金',
    background: [0.02, 0.018, 0.012],
    cssBg: '#050403',
    starCool: [1.0, 0.88, 0.55],
    starWarm: [1.0, 0.78, 0.4],
    starHeat: [0.95, 0.6, 0.2],
    speedScale: 0.95,
    yAmpScale: 0.85,
    sizeScale: 1.2,
    twinkleScale: 0.6,
    exposure: 0.75,
    densityScale: 0.82,
  },
];

export type FieldLayout = {
  /** Inner orbit radius */
  radiusMin: number;
  /** Outer span added to min */
  radiusSpan: number;
  /** Shell distribution power (<1 = more outer, >1 = more inner) */
  shellPow: number;
  stretchLo: number;
  stretchHi: number;
  zBias: number;
  noiseAmp: number;
  yPhase: number;
  spinSign: number;
  /** Extra per-star radius jitter */
  radiusJitter: number;
};

export type FreezePalette = {
  core: [number, number, number];
  mid: [number, number, number];
  accent: [number, number, number];
  deep: [number, number, number];
  cssCore: string;
  cssMid: string;
  cssAccent: string;
  cssDeep: string;
};

export type PickedSky = VoidSky & {
  seed: number;
  key: string;
  field: FieldLayout;
  freeze: FreezePalette;
  /** Soft nebula blooms (CSS background-image stack). */
  cssNebula: string;
  /** Edge falloff over nebula. */
  cssVeil: string;
};

let activeSky: PickedSky | null = null;

/** Mulberry32 — deterministic PRNG from a 32-bit seed. */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rgbTuple(r: number, g: number, b: number): [number, number, number] {
  return [r, g, b];
}

function rgbaCss(c: [number, number, number], a: number) {
  return `rgba(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)}, ${a})`;
}

function hexFromRgb(c: [number, number, number]) {
  const h = (n: number) =>
    Math.round(Math.min(1, Math.max(0, n)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

/**
 * Per-visit space backdrop: deep well + soft nebula blooms from sky tints.
 * Positions/sizes jitter with the visit seed so the same mood still varies.
 */
function buildSpaceBackdrop(sky: VoidSky, rng: () => number) {
  const deep = sky.background;
  const cool = sky.starCool;
  const warm = sky.starWarm;
  const heat = sky.starHeat;

  const base = [
    `radial-gradient(ellipse 130% 100% at 50% 38%, ${rgbaCss(
      [
        Math.min(1, deep[0] * 2.8 + 0.02),
        Math.min(1, deep[1] * 2.8 + 0.02),
        Math.min(1, deep[2] * 2.8 + 0.04),
      ],
      1,
    )} 0%, ${hexFromRgb(deep)} 42%, #010104 78%, #000000 100%)`,
  ].join(',');

  const blooms = [
    {
      x: mix(8, 42, rng()),
      y: mix(6, 40, rng()),
      w: mix(48, 88, rng()),
      h: mix(40, 78, rng()),
      c: cool,
      a: mix(0.14, 0.28, rng()),
    },
    {
      x: mix(55, 94, rng()),
      y: mix(35, 88, rng()),
      w: mix(42, 80, rng()),
      h: mix(38, 72, rng()),
      c: warm,
      a: mix(0.1, 0.22, rng()),
    },
    {
      x: mix(20, 78, rng()),
      y: mix(45, 95, rng()),
      w: mix(36, 70, rng()),
      h: mix(32, 64, rng()),
      c: heat,
      a: mix(0.06, 0.16, rng()),
    },
    {
      x: mix(30, 70, rng()),
      y: mix(0, 28, rng()),
      w: mix(55, 95, rng()),
      h: mix(28, 50, rng()),
      c: cool,
      a: mix(0.05, 0.12, rng()),
    },
  ];

  const nebula = blooms
    .map(
      (b) =>
        `radial-gradient(${b.w}% ${b.h}% at ${b.x}% ${b.y}%, ${rgbaCss(b.c, b.a)} 0%, ${rgbaCss(b.c, b.a * 0.35)} 32%, transparent 68%)`,
    )
    .join(',');

  const veil = `radial-gradient(ellipse 90% 70% at 50% 55%, transparent 30%, ${rgbaCss(deep, 0.55)} 100%)`;

  return { cssBg: base, cssNebula: nebula, cssVeil: veil };
}

function pickField(rng: () => number): FieldLayout {
  return {
    radiusMin: mix(1.15, 1.85, rng()),
    radiusSpan: mix(2.4, 4.2, rng()),
    shellPow: mix(0.45, 1.35, rng()),
    stretchLo: mix(0.55, 0.85, rng()),
    stretchHi: mix(1.05, 1.45, rng()),
    zBias: mix(-0.85, 0.15, rng()),
    noiseAmp: mix(0.18, 0.42, rng()),
    yPhase: mix(0.35, 0.85, rng()),
    spinSign: rng() > 0.5 ? 1 : -1,
    radiusJitter: mix(0.08, 0.35, rng()),
  };
}

/** Freeze veil hues — independent of sky mood for extra variety. */
function pickFreeze(rng: () => number): FreezePalette {
  const hues = [
    // arctic
    {
      core: rgbTuple(0.85, 0.95, 1.0),
      mid: rgbTuple(0.35, 0.75, 1.0),
      accent: rgbTuple(0.55, 0.4, 0.95),
      deep: rgbTuple(0.08, 0.1, 0.28),
    },
    // rose rift
    {
      core: rgbTuple(1.0, 0.88, 0.95),
      mid: rgbTuple(0.95, 0.45, 0.7),
      accent: rgbTuple(0.7, 0.35, 1.0),
      deep: rgbTuple(0.2, 0.05, 0.18),
    },
    // emerald
    {
      core: rgbTuple(0.85, 1.0, 0.92),
      mid: rgbTuple(0.3, 0.9, 0.75),
      accent: rgbTuple(0.4, 0.7, 1.0),
      deep: rgbTuple(0.04, 0.14, 0.12),
    },
    // amber
    {
      core: rgbTuple(1.0, 0.95, 0.8),
      mid: rgbTuple(1.0, 0.7, 0.35),
      accent: rgbTuple(0.95, 0.45, 0.55),
      deep: rgbTuple(0.18, 0.08, 0.04),
    },
    // violet deep
    {
      core: rgbTuple(0.9, 0.85, 1.0),
      mid: rgbTuple(0.65, 0.45, 1.0),
      accent: rgbTuple(0.35, 0.7, 1.0),
      deep: rgbTuple(0.1, 0.05, 0.22),
    },
    // copper
    {
      core: rgbTuple(1.0, 0.9, 0.75),
      mid: rgbTuple(1.0, 0.55, 0.3),
      accent: rgbTuple(0.85, 0.35, 0.55),
      deep: rgbTuple(0.16, 0.05, 0.03),
    },
    // mint glass
    {
      core: rgbTuple(0.88, 1.0, 0.98),
      mid: rgbTuple(0.4, 0.95, 0.9),
      accent: rgbTuple(0.55, 0.75, 1.0),
      deep: rgbTuple(0.03, 0.12, 0.14),
    },
    // blood aurora
    {
      core: rgbTuple(1.0, 0.82, 0.85),
      mid: rgbTuple(1.0, 0.35, 0.4),
      accent: rgbTuple(0.75, 0.4, 0.95),
      deep: rgbTuple(0.16, 0.02, 0.06),
    },
  ];
  const h = hues[Math.floor(rng() * hues.length)]!;
  // Mild per-visit drift so even same hue family differs
  const drift = (c: [number, number, number]): [number, number, number] => [
    Math.min(1, Math.max(0, c[0] + (rng() - 0.5) * 0.08)),
    Math.min(1, Math.max(0, c[1] + (rng() - 0.5) * 0.08)),
    Math.min(1, Math.max(0, c[2] + (rng() - 0.5) * 0.08)),
  ];
  const core = drift(h.core);
  const mid = drift(h.mid);
  const accent = drift(h.accent);
  const deep = drift(h.deep);
  return {
    core,
    mid,
    accent,
    deep,
    cssCore: rgbaCss(core, 0.28),
    cssMid: rgbaCss(mid, 0.16),
    cssAccent: rgbaCss(accent, 0.18),
    cssDeep: rgbaCss(deep, 0.2),
  };
}

/** Random sky + field layout + freeze palette for this page load. */
export function pickRandomSky(): PickedSky {
  const seed =
    ((Math.random() * 0xffffffff) >>> 0) ^
    ((performance.now() * 1000) >>> 0);
  const rng = mulberry32(seed);
  const sky = SKIES[Math.floor(rng() * SKIES.length)]!;
  const space = buildSpaceBackdrop(sky, rng);
  activeSky = {
    ...sky,
    cssBg: space.cssBg,
    cssNebula: space.cssNebula,
    cssVeil: space.cssVeil,
    seed,
    key: `r-${seed.toString(16)}`,
    field: pickField(rng),
    freeze: pickFreeze(rng),
  };
  return activeSky;
}

export function getActiveSky(): PickedSky {
  return activeSky ?? pickRandomSky();
}

/** @deprecated Use pickRandomSky — random per visit. */
export function getDailySky(): PickedSky {
  return pickRandomSky();
}

export function skyCount() {
  return SKIES.length;
}
