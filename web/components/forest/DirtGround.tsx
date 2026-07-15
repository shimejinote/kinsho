'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

const REPEAT = 14;
const NORMAL_SCALE = new THREE.Vector2(0.85, 0.85);

const TEXTURE_SETS = {
  legacy: [
    '/textures/dirt/dirt_diff.jpg',
    '/textures/dirt/dirt_nor.jpg',
    '/textures/dirt/dirt_rough.jpg',
  ],
  journey: [
    '/assets/journey/nature/forest-ground-diffuse-1k.jpg',
    '/assets/journey/nature/forest-ground-normal-gl-1k.jpg',
    '/assets/journey/nature/forest-ground-roughness-1k.jpg',
  ],
} as const;

export type DirtGroundTextures = keyof typeof TEXTURE_SETS;

/**
 * Forest floor from Poly Haven dirt maps (tiled).
 * Softens into wet sand as seaBlend rises.
 */
export default function DirtGround({
  seaRef,
  textures = 'legacy',
}: {
  seaRef?: MutableRefObject<number>;
  textures?: DirtGroundTextures;
} = {}) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  const [map, normalMap, roughnessMap] = useTexture([...TEXTURE_SETS[textures]]);

  useLayoutEffect(() => {
    for (const tex of [map, normalMap, roughnessMap]) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(REPEAT, REPEAT);
      tex.anisotropy = 4;
      tex.colorSpace = tex === map ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    }
  }, [map, normalMap, roughnessMap]);

  useFrame(() => {
    const sea = seaRef?.current ?? 0;
    const m = mat.current;
    if (!m) return;
    m.color.setRGB(
      THREE.MathUtils.lerp(1, 0.92, sea),
      THREE.MathUtils.lerp(1, 0.86, sea),
      THREE.MathUtils.lerp(1, 0.68, sea),
    );
    m.roughness = THREE.MathUtils.lerp(1, 0.72, sea);
    if (mesh.current) {
      mesh.current.position.z = THREE.MathUtils.lerp(-4, 2, sea * 0.55);
    }
  });

  return (
    <mesh
      ref={mesh}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.18, -4]}
      raycast={() => null}
      receiveShadow
    >
      <planeGeometry args={[52, 56, 1, 1]} />
      <meshStandardMaterial
        ref={mat}
        map={map}
        normalMap={normalMap}
        roughnessMap={roughnessMap}
        roughness={1}
        metalness={0.02}
        normalScale={NORMAL_SCALE}
      />
    </mesh>
  );
}

useTexture.preload(TEXTURE_SETS.legacy[0]);
useTexture.preload(TEXTURE_SETS.legacy[1]);
useTexture.preload(TEXTURE_SETS.legacy[2]);
useTexture.preload(TEXTURE_SETS.journey[0]);
useTexture.preload(TEXTURE_SETS.journey[1]);
useTexture.preload(TEXTURE_SETS.journey[2]);
