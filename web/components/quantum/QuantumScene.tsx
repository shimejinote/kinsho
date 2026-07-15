'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import ClockworkPortal from './ClockworkPortal';
import ParticleSwarm from './ParticleSwarm';

/**
 * Dust field + real 3D clockwork portal (env-mapped gears + vortex core).
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
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.82;
        }}
      >
        <color attach="background" args={['#030308']} />
        <Suspense fallback={null}>
          <ParticleSwarm />
          <ClockworkPortal />
        </Suspense>
      </Canvas>
    </div>
  );
}
