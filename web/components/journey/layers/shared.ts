import { JOURNEY_ASSETS } from './assets';

/** Deterministic 0–1 hash for instance seeding. */
export function hash2(i: number, salt = 1): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export type ScrollSeed = {
  u: number;
  shell: number;
  spin: number;
  scale: number;
  side: number;
  lane: number;
  phase: number;
};

export function makeScrollSeeds(count: number, variety: number): ScrollSeed[] {
  const out: ScrollSeed[] = [];
  for (let i = 0; i < count; i++) {
    const n = variety * 997 + i * 61;
    out.push({
      u: hash2(n, 1),
      shell: Math.pow(hash2(n, 2), 0.55),
      spin: hash2(n, 3) * Math.PI * 2,
      scale: 0.55 + hash2(n, 4) * 0.55,
      side: hash2(n, 5) < 0.5 ? -1 : 1,
      lane: 1.2 + hash2(n, 6) * 2.8,
      phase: hash2(n, 7) * Math.PI * 2,
    });
  }
  return out;
}

export const ASSET = {
  cityHdri: JOURNEY_ASSETS.cityHdr,
  forestHdri: JOURNEY_ASSETS.forestHdr,
  skyHdri: JOURNEY_ASSETS.skyHdr,
  forestGround: JOURNEY_ASSETS.forestGround,
  grassRock: JOURNEY_ASSETS.grassRock,
} as const;
