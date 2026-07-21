'use client';

import * as THREE from 'three';

export const SPORE_URLS = {
  a: '/images/spores/spore-a.png',
  b: '/images/spores/spore-b.png',
  c: '/images/spores/spore-c.png',
  trail: '/images/spores/spore-trail.png',
  cloud: '/images/spores/spore-cloud.png',
  drip: '/images/spores/spore-drip.png',
  spark: '/images/spores/spore-spark.png',
} as const;

export type SporeTextures = {
  a: THREE.Texture;
  b: THREE.Texture;
  c: THREE.Texture;
  trail: THREE.Texture;
  cloud: THREE.Texture;
  drip: THREE.Texture;
  spark: THREE.Texture;
};

function prep(tex: THREE.Texture) {
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function loadSporeTextures(): Promise<SporeTextures> {
  const loader = new THREE.TextureLoader();
  const load = (url: string) =>
    new Promise<THREE.Texture>((resolve, reject) => {
      loader.load(url, (t) => resolve(prep(t)), undefined, reject);
    });

  return Promise.all([
    load(SPORE_URLS.a),
    load(SPORE_URLS.b),
    load(SPORE_URLS.c),
    load(SPORE_URLS.trail),
    load(SPORE_URLS.cloud),
    load(SPORE_URLS.drip),
    load(SPORE_URLS.spark),
  ]).then(([a, b, c, trail, cloud, drip, spark]) => ({
    a,
    b,
    c,
    trail,
    cloud,
    drip,
    spark,
  }));
}

export function disposeSporeTextures(tex: SporeTextures | null) {
  if (!tex) return;
  for (const t of Object.values(tex)) t.dispose();
}
