'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import ClockworkPortal from './ClockworkPortal';
import CrossingFlash from './CrossingFlash';
import DimensionalRift from './DimensionalRift';
import ParticleSwarm from './ParticleSwarm';
import WarpCamera from './WarpCamera';
import WarpVignette from './WarpVignette';
import WarpWind from './WarpWind';

/**
 * Dust field + void portal. Click once or long-press for dimensional warp
 * immersion (camera dolly, vignette, rim wind-cut, star streaks,
 * precursor rift membrane, A+E flash).
 */
export default function QuantumScene() {
  return (
    <div className="fixed inset-0 h-dvh w-screen bg-black">
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
          gl.toneMappingExposure = 0.82;
          camera.lookAt(0, 0, 0);
        }}
      >
        <color attach="background" args={['#030308']} />
        <Suspense fallback={null}>
          <WarpCamera />
          <ParticleSwarm />
          <WarpWind />
          <ClockworkPortal />
          <WarpVignette />
          <DimensionalRift />
          <CrossingFlash />
        </Suspense>
      </Canvas>
    </div>
  );
}
