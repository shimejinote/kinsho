'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import * as THREE from 'three';
import ClockworkPortal from './ClockworkPortal';
import CrossingFlash from './CrossingFlash';
import { pickRandomSky } from './dailySky';
import DimensionalRift from './DimensionalRift';
import NucleusAura from './NucleusAura';
import ParticleSwarm from './ParticleSwarm';
import WarpCamera from './WarpCamera';
import WarpVignette from './WarpVignette';
import WarpWind from './WarpWind';

/**
 * Dust field + void portal. Idle sky is random per visit;
 * click / long-press warp ritual stays the same.
 */
export default function QuantumScene() {
  const sky = useMemo(() => pickRandomSky(), []);

  return (
    <div
      className="absolute inset-0 h-full w-full"
      style={{ background: sky.cssBg }}
      data-sky={sky.id}
      aria-label={`虚空 · ${sky.label}`}
    >
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 4.2], fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = sky.exposure;
          camera.lookAt(0, 0, 0);
        }}
      >
        <color attach="background" args={[...sky.background]} />
        <Suspense fallback={null}>
          <WarpCamera />
          <ParticleSwarm sky={sky} />
          <WarpWind />
          <ClockworkPortal />
          <NucleusAura />
          <WarpVignette />
          <DimensionalRift />
          <CrossingFlash />
        </Suspense>
      </Canvas>
    </div>
  );
}
