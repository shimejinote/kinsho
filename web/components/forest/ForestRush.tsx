'use client';

import { ContactShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { JourneyDirector } from '../journey/JourneyDirector';
import type { JourneyStageId } from '../journey/timeline';
import DirtGround, { type DirtGroundTextures } from './DirtGround';
import Ocean from './Ocean';
import { TREE_KINDS, buildTreePack, type TreePack } from './treeFactory';

const DEFAULT_PER_VARIETY = 36;
const Z_BEHIND = 8;
const Z_DEPTH = -26;

type Seed = {
  u: number;
  shell: number;
  spin: number;
  scale: number;
  side: number;
  lane: number;
};

function makeSeeds(count: number, variety: number): Seed[] {
  const out: Seed[] = [];
  for (let i = 0; i < count; i++) {
    const n = variety * 997 + i * 61;
    const rnd = (k: number) => {
      const x = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    out.push({
      u: rnd(1),
      shell: Math.pow(rnd(2), 0.55),
      spin: rnd(3) * Math.PI * 2,
      scale: 0.55 + rnd(4) * 0.55,
      side: rnd(5) < 0.5 ? -1 : 1,
      lane: 1.55 + rnd(6) * 2.4,
    });
  }
  return out;
}

function TreeField({
  pack,
  seeds,
  scrollRef,
  seaRef,
}: {
  pack: TreePack;
  seeds: Seed[];
  scrollRef: MutableRefObject<number>;
  seaRef: MutableRefObject<number>;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const inst = mesh.current;
    if (!inst) return;
    const scroll = scrollRef.current;
    const sea = seaRef.current;

    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const t = (s.u + scroll * (0.55 + s.shell * 0.45)) % 1;
      const z = THREE.MathUtils.lerp(Z_DEPTH, Z_BEHIND, t);
      const peel = 1 + sea * (2.8 + s.shell * 1.4);
      const flare = (1.05 + Math.max(0, -z) * 0.04) * peel;
      const x = s.side * s.lane * flare;
      const y = -1.15;

      const depthFade = THREE.MathUtils.smoothstep(z, -4, -20);
      const live = Math.max(0, 1 - sea * (0.55 + depthFade * 0.9));

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, s.spin - scroll * 0.2, 0);
      const approach = Math.sin(t * Math.PI);
      dummy.scale.setScalar(s.scale * (0.92 + approach * 0.18) * live);
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[pack.geometry, pack.material, seeds.length]}
      frustumCulled={false}
      castShadow={false}
      receiveShadow={false}
      raycast={() => null}
    />
  );
}

export default function ForestRush({
  director,
  stageId,
  seaEnabled = true,
  groundTextures = 'legacy',
  treesPerVariety = DEFAULT_PER_VARIETY,
  shadows = true,
}: {
  director?: JourneyDirector;
  stageId?: JourneyStageId;
  seaEnabled?: boolean;
  groundTextures?: DirtGroundTextures;
  treesPerVariety?: number;
  shadows?: boolean;
} = {}) {
  const scrollRef = useRef(0);
  const seaRef = useRef(0);

  const packs = useMemo(
    () => TREE_KINDS.map((kind) => buildTreePack(kind)),
    [],
  );

  const seedBanks = useMemo(
    () => packs.map((_, i) => makeSeeds(treesPerVariety, i)),
    [packs, treesPerVariety],
  );

  useEffect(() => {
    return () => {
      packs.forEach((p) => {
        p.geometry.dispose();
        p.material.dispose();
      });
    };
  }, [packs]);

  useFrame((state, delta) => {
    const frame =
      director && stageId ? director.getLayerFrame(stageId) : undefined;
    const progress = frame?.progress ?? (state.clock.elapsedTime % 5) / 5;
    const speed = 0.18 + THREE.MathUtils.smootherstep(progress, 0.08, 0.9) * 2.45;
    scrollRef.current += delta * speed;

    seaRef.current = seaEnabled
      ? THREE.MathUtils.smoothstep(progress, 0.78, 1)
      : 0;
  });

  return (
    <group>
      <DirtGround seaRef={seaRef} textures={groundTextures} />
      {seaEnabled ? <Ocean seaRef={seaRef} /> : null}
      {packs.map((pack, i) => (
        <TreeField
          key={TREE_KINDS[i]}
          pack={pack}
          seeds={seedBanks[i]}
          scrollRef={scrollRef}
          seaRef={seaRef}
        />
      ))}
      {shadows ? (
        <ContactShadows
          position={[0, -1.17, 0]}
          opacity={0.35}
          scale={28}
          blur={2.4}
          far={12}
          resolution={256}
          color="#1a2a18"
        />
      ) : null}
    </group>
  );
}
