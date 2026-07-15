'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useJourneyQuality } from '../JourneyQuality';
import type { JourneyLayerProps } from './types';
import { hash2 } from './shared';

function buildPersonGeometry() {
  const torso = new THREE.CapsuleGeometry(0.12, 0.28, 3, 6);
  torso.translate(0, 0.42, 0);
  const head = new THREE.SphereGeometry(0.11, 8, 6);
  head.translate(0, 0.72, 0);
  const legL = new THREE.CapsuleGeometry(0.045, 0.22, 2, 5);
  legL.translate(-0.06, 0.14, 0);
  const legR = new THREE.CapsuleGeometry(0.045, 0.22, 2, 5);
  legR.translate(0.06, 0.14, 0);
  const merged = mergeGeometries([torso, head, legL, legR], false);
  if (!merged) return torso;
  torso.dispose();
  head.dispose();
  legL.dispose();
  legR.dispose();
  return merged;
}

type PersonSeed = {
  x: number;
  z: number;
  scale: number;
  phase: number;
  pace: number;
  hue: number;
};

function makePeople(count: number, spreadX: number, zMin: number, zMax: number): PersonSeed[] {
  return Array.from({ length: count }, (_, i) => ({
    x: (hash2(i, 1) - 0.5) * spreadX,
    z: THREE.MathUtils.lerp(zMin, zMax, hash2(i, 2)),
    scale: 0.85 + hash2(i, 3) * 0.4,
    phase: hash2(i, 4) * Math.PI * 2,
    pace: 0.9 + hash2(i, 5) * 0.8,
    hue: hash2(i, 6),
  }));
}

export default function PeopleLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const nearCount = profile.peopleNear;
  const farCount = profile.peopleFar;
  const nearMesh = useRef<THREE.InstancedMesh>(null);
  const farMesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const nearSeeds = useMemo(
    () => makePeople(nearCount, 3.2, -2.5, 2.2),
    [nearCount],
  );
  const farSeeds = useMemo(
    () => makePeople(farCount, 14, -22, -3),
    [farCount],
  );
  const personGeo = useMemo(() => buildPersonGeometry(), []);
  const impostorGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.42, 0.95);
    geo.translate(0, 0.48, 0);
    return geo;
  }, []);

  useEffect(
    () => () => {
      personGeo.dispose();
      impostorGeo.dispose();
    },
    [personGeo, impostorGeo],
  );

  useFrame(() => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.stageElapsed;
    const drift = frame.progress * stage.cameraSpeed * 1.1;

    const near = nearMesh.current;
    if (near) {
      for (let i = 0; i < nearSeeds.length; i++) {
        const s = nearSeeds[i];
        const walk = t * s.pace + s.phase;
        const stride = Math.sin(walk * 3.4);
        dummy.position.set(
          s.x + Math.sin(walk * 0.35) * 0.15,
          -1.15 + Math.abs(stride) * 0.03,
          s.z + drift * 0.2,
        );
        dummy.rotation.set(stride * 0.08, Math.sin(walk * 0.2) * 0.4, stride * 0.05);
        dummy.scale.setScalar(s.scale);
        dummy.updateMatrix();
        near.setMatrixAt(i, dummy.matrix);
        color.setHSL(0.06 + s.hue * 0.08, 0.28, 0.28 + s.hue * 0.18);
        near.setColorAt(i, color);
      }
      near.instanceMatrix.needsUpdate = true;
      if (near.instanceColor) near.instanceColor.needsUpdate = true;
    }

    const far = farMesh.current;
    if (far) {
      for (let i = 0; i < farSeeds.length; i++) {
        const s = farSeeds[i];
        const walk = t * s.pace * 0.7 + s.phase;
        let z = s.z + ((drift * 0.55 + walk * 0.08) % 20);
        if (z > -2) z -= 20;
        dummy.position.set(s.x, -1.15, z);
        dummy.rotation.set(0, Math.sin(walk * 0.15) * 0.5, 0);
        const depthScale = THREE.MathUtils.clamp(1.1 + z * 0.02, 0.35, 1.1);
        dummy.scale.set(s.scale * depthScale * 0.9, s.scale * depthScale, 1);
        dummy.updateMatrix();
        far.setMatrixAt(i, dummy.matrix);
        color.setRGB(0.12 + s.hue * 0.1, 0.11, 0.1);
        far.setColorAt(i, color);
      }
      far.instanceMatrix.needsUpdate = true;
      if (far.instanceColor) far.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.62} color="#e6dcc8" />
      <hemisphereLight args={['#f0e8d8', '#6b6356', 0.7]} />
      <directionalLight position={[2.5, 6, 3]} intensity={1.05} color="#fff6e4" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.16, -4]} raycast={() => null}>
        <planeGeometry args={[40, 48]} />
        <meshStandardMaterial color="#b8aea0" roughness={0.95} metalness={0.02} />
      </mesh>

      {/* Soft street haze ribbon */}
      <mesh position={[0, 0.4, -10]} raycast={() => null}>
        <planeGeometry args={[28, 6]} />
        <meshBasicMaterial color="#cfc6b8" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <instancedMesh
        ref={nearMesh}
        args={[
          profile.preferImpostors ? impostorGeo : personGeo,
          undefined,
          nearCount,
        ]}
        frustumCulled={false}
        raycast={() => null}
      >
        {profile.preferImpostors ? (
          <meshBasicMaterial vertexColors transparent opacity={0.9} depthWrite={false} />
        ) : (
          <meshStandardMaterial vertexColors roughness={0.8} metalness={0.05} />
        )}
      </instancedMesh>

      <instancedMesh
        ref={farMesh}
        args={[impostorGeo, undefined, farCount]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshBasicMaterial vertexColors transparent opacity={0.78} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
