'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJourneyQuality } from '../JourneyQuality';
import type { JourneyLayerProps } from './types';
import HdriDome from './HdriDome';
import { ASSET, hash2, makeScrollSeeds } from './shared';

const Z_NEAR = 6;
const Z_FAR = -38;

function buildTowerGeometry() {
  const body = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
  body.translate(0, 0.5, 0);
  return body;
}

export default function CityLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const buildingCount = profile.cityBuildings;
  const windowCount = profile.cityWindows;
  const trafficCount = profile.cityTraffic;
  const root = useRef<THREE.Group>(null);
  const towers = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const traffic = useRef<THREE.Points>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);

  const seeds = useMemo(
    () => makeScrollSeeds(buildingCount, 11),
    [buildingCount],
  );
  const windowSeeds = useMemo(
    () =>
      Array.from({ length: windowCount }, (_, i) => ({
        u: hash2(i, 21),
        y: 0.15 + hash2(i, 22) * 0.8,
        x: (hash2(i, 23) - 0.5) * 0.7,
        z: (hash2(i, 24) - 0.5) * 0.7,
        side: hash2(i, 25) < 0.5 ? -1 : 1,
        lane: 1.4 + hash2(i, 26) * 3.2,
        shell: Math.pow(hash2(i, 27), 0.5),
        pulse: hash2(i, 28),
      })),
    [windowCount],
  );

  const trafficPositions = useMemo(() => {
    const arr = new Float32Array(trafficCount * 3);
    for (let i = 0; i < trafficCount; i++) {
      arr[i * 3] = (hash2(i, 40) - 0.5) * 18;
      arr[i * 3 + 1] = -0.95 + hash2(i, 41) * 0.08;
      arr[i * 3 + 2] = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, hash2(i, 42));
    }
    return arr;
  }, [trafficCount]);

  const geometry = useMemo(() => buildTowerGeometry(), []);
  const windowGeo = useMemo(() => new THREE.BoxGeometry(0.08, 0.08, 0.04), []);

  useEffect(
    () => () => {
      geometry.dispose();
      windowGeo.dispose();
    },
    [geometry, windowGeo],
  );

  useFrame((_, delta) => {
    const frame = director.getLayerFrame(stage.id);
    const scroll = frame.stageElapsed * stage.cameraSpeed * 0.55;
    const progress = frame.progress;

    if (root.current) {
      root.current.position.z = -progress * stage.cameraSpeed * 0.35;
    }

    const towerMesh = towers.current;
    if (towerMesh) {
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const t = (s.u + scroll * (0.35 + s.shell * 0.4)) % 1;
        const z = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, t);
        const height = 1.6 + s.shell * 4.8 + (i % 5) * 0.35;
        const width = 0.55 + s.scale * 0.55;
        const depth = 0.55 + (1 - s.shell) * 0.7;
        const x = s.side * s.lane * (1.05 + Math.max(0, -z) * 0.03);

        dummy.position.set(x, -1.15, z);
        dummy.rotation.set(0, s.spin * 0.15, 0);
        dummy.scale.set(width, height, depth);
        dummy.updateMatrix();
        towerMesh.setMatrixAt(i, dummy.matrix);

        const cool = 0.35 + s.shell * 0.25;
        color.setRGB(0.22 + cool * 0.15, 0.28 + cool * 0.12, 0.34 + cool * 0.2);
        towerMesh.setColorAt(i, color);
      }
      towerMesh.instanceMatrix.needsUpdate = true;
      if (towerMesh.instanceColor) towerMesh.instanceColor.needsUpdate = true;
    }

    const windowMesh = windows.current;
    if (windowMesh) {
      for (let i = 0; i < windowSeeds.length; i++) {
        const s = windowSeeds[i];
        const t = (s.u + scroll * (0.35 + s.shell * 0.4)) % 1;
        const z = THREE.MathUtils.lerp(Z_FAR, Z_NEAR, t);
        const buildingH = 1.8 + s.shell * 5;
        const x = s.side * s.lane * (1.05 + Math.max(0, -z) * 0.03) + s.x;
        const y = -1.15 + buildingH * s.y;
        const on =
          0.15 +
          0.85 *
            Math.max(
              0,
              Math.sin(progress * 12 + s.pulse * 20 + frame.stageElapsed * 3),
            );

        dummy.position.set(x, y, z + s.z * 0.2);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(0.35 + on * 0.9);
        dummy.updateMatrix();
        windowMesh.setMatrixAt(i, dummy.matrix);

        color.setRGB(1, 0.82 + s.pulse * 0.12, 0.45 + s.pulse * 0.2);
        windowMesh.setColorAt(i, color);
      }
      windowMesh.instanceMatrix.needsUpdate = true;
      if (windowMesh.instanceColor) windowMesh.instanceColor.needsUpdate = true;
    }

    if (traffic.current) {
      const pos = traffic.current.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let z = pos.getZ(i) + delta * (2.2 + (i % 5) * 0.35) * stage.cameraSpeed;
        if (z > Z_NEAR) z = Z_FAR;
        pos.setZ(i, z);
        pos.setX(
          i,
          Math.sin(frame.stageElapsed * 0.7 + i) * 0.15 + (i % 2 === 0 ? -1.1 : 1.1),
        );
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <group ref={root}>
      <HdriDome url={ASSET.cityHdri} exposure={0.42} yaw={0.35} />
      <ambientLight intensity={0.55} color="#b7c4cf" />
      <hemisphereLight args={['#d7e4ef', '#3a3a38', 0.65]} />
      <directionalLight position={[4, 8, 2]} intensity={1.15} color="#fff1d6" />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.16, -8]}
        receiveShadow={profile.shadows}
        raycast={() => null}
      >
        <planeGeometry args={[60, 70]} />
        <meshStandardMaterial color="#2c3136" roughness={0.92} metalness={0.08} />
      </mesh>

      <instancedMesh
        ref={towers}
        args={[geometry, undefined, buildingCount]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshStandardMaterial
          vertexColors
          roughness={0.62}
          metalness={0.18}
          color="#4a5560"
        />
      </instancedMesh>

      <instancedMesh
        ref={windows}
        args={[windowGeo, undefined, windowCount]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshStandardMaterial
          vertexColors
          emissive="#ffb35a"
          emissiveIntensity={1.4}
          roughness={0.35}
          metalness={0.1}
          toneMapped={false}
        />
      </instancedMesh>

      <points ref={traffic} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trafficPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.08}
          color="#ff8a3d"
          transparent
          opacity={0.85}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
