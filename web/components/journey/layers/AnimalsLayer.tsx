'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useJourneyQuality } from '../JourneyQuality';
import type { JourneyLayerProps } from './types';
import { ASSET, hash2 } from './shared';
import HdriDome from './HdriDome';

function buildDeerGeometry() {
  const body = new THREE.CapsuleGeometry(0.14, 0.32, 3, 6);
  body.rotateZ(Math.PI / 2);
  body.translate(0, 0.42, 0);
  const neck = new THREE.CapsuleGeometry(0.05, 0.16, 2, 5);
  neck.rotateZ(-0.7);
  neck.translate(0.18, 0.58, 0);
  const head = new THREE.SphereGeometry(0.08, 7, 5);
  head.scale(1.2, 0.85, 0.9);
  head.translate(0.28, 0.66, 0);
  const leg = (x: number, z: number) => {
    const g = new THREE.CapsuleGeometry(0.03, 0.22, 2, 4);
    g.translate(x, 0.16, z);
    return g;
  };
  const parts = [body, neck, head, leg(-0.1, 0.1), leg(0.1, 0.1), leg(-0.1, -0.12), leg(0.1, -0.12)];
  const merged = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  return merged ?? body;
}

type AnimalSeed = {
  x: number;
  z: number;
  scale: number;
  phase: number;
  pace: number;
  tint: number;
};

function makeHerd(count: number, xSpread: number, zMin: number, zMax: number): AnimalSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    x: (hash2(i, 11) - 0.5) * xSpread,
    z: THREE.MathUtils.lerp(zMin, zMax, hash2(i, 12)),
    scale: 0.75 + hash2(i, 13) * 0.55,
    phase: hash2(i, 14) * Math.PI * 2,
    pace: 0.7 + hash2(i, 15) * 0.9,
    tint: hash2(i, 16),
  }));
}

export default function AnimalsLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const nearCount = profile.animalsNear;
  const herdCount = profile.animalsHerd;
  const nearMesh = useRef<THREE.InstancedMesh>(null);
  const herdMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const nearSeeds = useMemo(
    () => makeHerd(nearCount, 4.5, -4, 1.5),
    [nearCount],
  );
  const herdSeeds = useMemo(
    () => makeHerd(herdCount, 16, -24, -3.5),
    [herdCount],
  );
  const deerGeo = useMemo(() => buildDeerGeometry(), []);
  const impostorGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.7, 0.45);
    geo.translate(0, 0.28, 0);
    return geo;
  }, []);

  useEffect(
    () => () => {
      deerGeo.dispose();
      impostorGeo.dispose();
    },
    [deerGeo, impostorGeo],
  );

  useFrame(() => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.stageElapsed;
    const drift = frame.progress * stage.cameraSpeed;

    const near = nearMesh.current;
    if (near) {
      for (let i = 0; i < nearSeeds.length; i++) {
        const s = nearSeeds[i];
        const gait = t * s.pace * 2.8 + s.phase;
        const bob = Math.abs(Math.sin(gait)) * 0.04;
        dummy.position.set(
          s.x + Math.sin(t * 0.35 + s.phase) * 0.35,
          -1.15 + bob,
          s.z + Math.cos(t * 0.25 + s.phase) * 0.2 + drift * 0.15,
        );
        dummy.rotation.set(0, Math.sin(t * 0.2 + s.phase) * 0.8 + Math.PI * 0.15, 0);
        dummy.scale.setScalar(s.scale);
        dummy.updateMatrix();
        near.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.08, 0.35, 0.22 + s.tint * 0.15);
        near.setColorAt(i, color);
      }
      near.instanceMatrix.needsUpdate = true;
      if (near.instanceColor) near.instanceColor.needsUpdate = true;
    }

    const herd = herdMesh.current;
    if (herd) {
      for (let i = 0; i < herdSeeds.length; i++) {
        const s = herdSeeds[i];
        const run = t * s.pace * 0.55 + s.phase;
        let z = s.z + ((drift * 0.9 + run * 0.35) % 22);
        if (z > -2.5) z -= 22;
        dummy.position.set(s.x + Math.sin(run) * 0.2, -1.15, z);
        dummy.rotation.set(0, Math.PI * 0.5 + Math.sin(run * 0.2) * 0.25, 0);
        const depth = THREE.MathUtils.clamp(1.05 + z * 0.025, 0.3, 1);
        dummy.scale.set(s.scale * depth, s.scale * depth, 1);
        dummy.updateMatrix();
        herd.setMatrixAt(i, dummy.matrix);
        color.setRGB(0.14 + s.tint * 0.08, 0.12, 0.1);
        herd.setColorAt(i, color);
      }
      herd.instanceMatrix.needsUpdate = true;
      if (herd.instanceColor) herd.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <HdriDome url={ASSET.skyHdri} exposure={0.48} yaw={0.5} />
      <ambientLight intensity={0.58} color="#e8f4ef" />
      <hemisphereLight args={['#d7eee8', '#6f7d52', 0.75]} />
      <directionalLight position={[4, 7, 1]} intensity={1.15} color="#fff2d0" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.16, -6]} raycast={() => null}>
        <planeGeometry args={[42, 52]} />
        <meshStandardMaterial color="#6f8a4e" roughness={0.95} metalness={0.02} />
      </mesh>

      <instancedMesh
        ref={nearMesh}
        args={[
          profile.preferImpostors ? impostorGeo : deerGeo,
          undefined,
          nearCount,
        ]}
        frustumCulled={false}
        raycast={() => null}
      >
        {profile.preferImpostors ? (
          <meshBasicMaterial vertexColors transparent opacity={0.88} depthWrite={false} />
        ) : (
          <meshStandardMaterial vertexColors roughness={0.78} metalness={0.04} />
        )}
      </instancedMesh>

      <instancedMesh
        ref={herdMesh}
        args={[impostorGeo, undefined, herdCount]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshBasicMaterial vertexColors transparent opacity={0.72} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
