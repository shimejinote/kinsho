'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import ForestRush from '../../forest/ForestRush';
import { useJourneyQuality } from '../JourneyQuality';
import HdriDome from './HdriDome';
import { ASSET, hash2 } from './shared';
import type { JourneyLayerProps } from './types';

/**
 * Upgraded forest stage: journey ground PBR + moss HDR cue, god-rays,
 * undergrowth, and the existing rush corridor without the sea breakout.
 */
export default function ForestLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const undergrowth = profile.forestUndergrowth;
  const rayCount = profile.tier === 'light' ? 3 : 5;
  const rays = useRef<THREE.Group>(null);
  const brush = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const sunDir = useMemo(
    () => new THREE.Vector3(0.45, 0.82, 0.35).normalize(),
    [],
  );

  const brushSeeds = useMemo(
    () =>
      Array.from({ length: undergrowth }, (_, i) => ({
        x: (hash2(i, 1) - 0.5) * 10,
        z: THREE.MathUtils.lerp(3, -18, hash2(i, 2)),
        scale: 0.35 + hash2(i, 3) * 0.55,
        spin: hash2(i, 4) * Math.PI * 2,
        phase: hash2(i, 5) * Math.PI * 2,
      })),
    [undergrowth],
  );

  const coneGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.18, 0.35, 5);
    geo.translate(0, 0.16, 0);
    return geo;
  }, []);

  useEffect(() => () => coneGeo.dispose(), [coneGeo]);

  useFrame(() => {
    const frame = director.getLayerFrame(stage.id);
    if (rays.current) {
      rays.current.rotation.z = Math.sin(frame.stageElapsed * 0.2) * 0.04;
      rays.current.children.forEach((child, i) => {
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = 0.04 + Math.sin(frame.stageElapsed * 0.9 + i) * 0.025;
      });
    }

    const mesh = brush.current;
    if (!mesh) return;
    const scroll = frame.stageElapsed * stage.cameraSpeed * 0.45;
    for (let i = 0; i < brushSeeds.length; i++) {
      const s = brushSeeds[i];
      let z = s.z + scroll;
      z = ((z + 18) % 21) - 18;
      const x = Math.abs(s.x) < 1.2 ? s.x + Math.sign(s.x || 1) * 1.4 : s.x;
      dummy.position.set(x, -1.15, z);
      dummy.rotation.set(0, s.spin + frame.stageElapsed * 0.05, 0);
      const sway = 1 + Math.sin(frame.stageElapsed * 1.5 + s.phase) * 0.05;
      dummy.scale.set(s.scale * sway, s.scale, s.scale * sway);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <HdriDome url={ASSET.forestHdri} radius={48} exposure={0.38} yaw={1.1} />
      <hemisphereLight args={['#c4e0ff', '#3d4a2e', 0.85]} />
      <ambientLight intensity={0.32} color="#fff4e6" />
      <directionalLight
        position={[sunDir.x * 20, sunDir.y * 20, sunDir.z * 20]}
        intensity={1.35}
        color="#fff1c8"
      />
      <directionalLight position={[-5, 5, -2]} intensity={0.28} color="#a8c8ff" />

      <ForestRush
        director={director}
        stageId={stage.id}
        seaEnabled={false}
        groundTextures="journey"
        treesPerVariety={profile.treesPerVariety}
        shadows={profile.shadows}
      />

      <instancedMesh
        ref={brush}
        args={[coneGeo, undefined, undergrowth]}
        frustumCulled={false}
        raycast={() => null}
      >
        <meshStandardMaterial color="#2f5a28" roughness={0.9} metalness={0.02} />
      </instancedMesh>

      <group ref={rays} position={[1.5, 2.2, -2]}>
        {Array.from({ length: rayCount }, (_, i) => (
          <mesh
            key={i}
            position={[i * 0.55 - 1.2, 0, -i * 0.8]}
            rotation={[0.35, 0.15, -0.35 + i * 0.08]}
            raycast={() => null}
          >
            <planeGeometry args={[0.55, 7]} />
            <meshBasicMaterial
              color="#fff2c2"
              transparent
              opacity={0.06}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
