'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { useJourneyQuality } from '../JourneyQuality';
import type { JourneyLayerProps } from './types';
import { hash2, makeScrollSeeds } from './shared';

const Z_NEAR = 5;
const Z_FAR = -22;

function buildMushroomGeometry() {
  const stem = new THREE.CylinderGeometry(0.05, 0.07, 0.28, 8, 1);
  stem.translate(0, 0.14, 0);
  const cap = new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  cap.scale(1.15, 0.7, 1.15);
  cap.translate(0, 0.34, 0);
  const merged = mergeGeometries([stem, cap], false);
  stem.dispose();
  cap.dispose();
  return merged ?? cap;
}

export default function MyceliumLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const mushroomCount = profile.mushrooms;
  const sporeCount = profile.spores;
  const threadCount = profile.threads;
  const mushrooms = useRef<THREE.InstancedMesh>(null);
  const threads = useRef<THREE.LineSegments>(null);
  const spores = useRef<THREE.Points>(null);
  const glow = useRef<THREE.Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const seeds = useMemo(
    () => makeScrollSeeds(mushroomCount, 77),
    [mushroomCount],
  );
  const mushGeo = useMemo(() => buildMushroomGeometry(), []);

  const sporePositions = useMemo(() => {
    const arr = new Float32Array(sporeCount * 3);
    for (let i = 0; i < sporeCount; i++) {
      arr[i * 3] = (hash2(i, 51) - 0.5) * 10;
      arr[i * 3 + 1] = -0.4 + hash2(i, 52) * 2.4;
      arr[i * 3 + 2] = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, hash2(i, 53));
    }
    return arr;
  }, [sporeCount]);

  const threadPositions = useMemo(() => {
    const arr = new Float32Array(threadCount * 2 * 3);
    for (let i = 0; i < threadCount; i++) {
      const x = (hash2(i, 61) - 0.5) * 12;
      const z = THREE.MathUtils.lerp(-18, 2, hash2(i, 62));
      const y = -1.12;
      arr[i * 6] = x;
      arr[i * 6 + 1] = y;
      arr[i * 6 + 2] = z;
      arr[i * 6 + 3] = x + (hash2(i, 63) - 0.5) * 2.4;
      arr[i * 6 + 4] = y + 0.02 + hash2(i, 64) * 0.08;
      arr[i * 6 + 5] = z + (hash2(i, 65) - 0.5) * 2.8;
    }
    return arr;
  }, [threadCount]);

  useEffect(() => () => mushGeo.dispose(), [mushGeo]);

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const scroll = frame.stageElapsed * stage.cameraSpeed * 0.35;
    const pulse = 0.65 + Math.sin(frame.stageElapsed * 2.4) * 0.35;

    const mesh = mushrooms.current;
    if (mesh) {
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const t = (s.u + scroll * (0.4 + s.shell * 0.35)) % 1;
        const z = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, t);
        const x = s.side * s.lane * 0.85 * (0.9 + s.shell * 0.4);
        const breath = 1 + Math.sin(frame.stageElapsed * 2 + s.phase) * 0.06;
        dummy.position.set(x, -1.15, z);
        dummy.rotation.set(0, s.spin, 0);
        dummy.scale.setScalar(s.scale * breath * (0.7 + s.shell * 0.9));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);

        const neon = 0.45 + s.shell * 0.55;
        color.setHSL(0.78 + s.phase * 0.04, 0.85, 0.35 + neon * 0.25);
        mesh.setColorAt(i, color);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 1.1 + pulse * 0.9;
    }

    if (spores.current) {
      const pos = spores.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const y =
          -0.3 +
          ((hash2(i, 71) + frame.stageElapsed * (0.08 + (i % 5) * 0.02)) % 2.6);
        let z = pos.getZ(i) + 0.01 * stage.cameraSpeed;
        if (z > Z_NEAR) z = Z_FAR;
        pos.setY(i, y);
        pos.setZ(i, z);
        pos.setX(i, pos.getX(i) + Math.sin(state.clock.elapsedTime + i) * 0.002);
      }
      pos.needsUpdate = true;
      const mat = spores.current.material as THREE.PointsMaterial;
      mat.opacity = 0.35 + pulse * 0.35;
    }

    if (glow.current) {
      const mat = glow.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.08 + pulse * 0.1;
      glow.current.scale.setScalar(1 + pulse * 0.15);
    }

    if (threads.current) {
      threads.current.rotation.y = Math.sin(frame.stageElapsed * 0.15) * 0.05;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.25} color="#4a2670" />
      <hemisphereLight args={['#6b2d9e', '#12051c', 0.55]} />
      <pointLight position={[0, 1.2, 1]} intensity={2.4} color="#d24bff" distance={18} />
      <pointLight position={[-2, 0.6, -3]} intensity={1.4} color="#47f0ff" distance={12} />
      <pointLight position={[2.4, 0.4, -6]} intensity={1.2} color="#ff5ad5" distance={12} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.16, -6]} raycast={() => null}>
        <planeGeometry args={[36, 40]} />
        <meshStandardMaterial
          color="#1a0a24"
          emissive="#3a1458"
          emissiveIntensity={0.35}
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>

      <mesh ref={glow} position={[0, 0.2, -4]} raycast={() => null}>
        <sphereGeometry args={[3.2, 24, 16]} />
        <meshBasicMaterial color="#b14cff" transparent opacity={0.1} depthWrite={false} />
      </mesh>

      <instancedMesh
        ref={mushrooms}
        args={[mushGeo, undefined, mushroomCount]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshStandardMaterial
          vertexColors
          emissive="#c44bff"
          emissiveIntensity={1.4}
          roughness={0.45}
          metalness={0.15}
          toneMapped={false}
        />
      </instancedMesh>

      <lineSegments ref={threads} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[threadPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#7af7ff" transparent opacity={0.35} depthWrite={false} />
      </lineSegments>

      <points ref={spores} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sporePositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color="#e9a6ff"
          transparent
          opacity={0.55}
          depthWrite={false}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
