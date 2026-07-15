'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import * as THREE from 'three';
import ClockworkPortal from '../quantum/ClockworkPortal';
import DaySky from './DaySky';
import ForestRush from './ForestRush';
import PortalHotspot from './PortalHotspot';

/**
 * Sunny forest corridor → 5s rush → break out onto the sea.
 * Long-press rushes; short-tap opens /apps.
 */
export default function ForestScene() {
  return (
    <div className="fixed inset-0 h-dvh w-screen bg-[#9ec8f0]">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.55, 5.0], fov: 48, near: 0.1, far: 90 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        style={{ touchAction: 'none' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.18;
          gl.outputColorSpace = THREE.SRGBColorSpace;
        }}
      >
        <color attach="background" args={['#9ec8f0']} />
        {/* Light atmospheric haze — keeps distance soft, not ominous */}
        <fog attach="fog" args={['#c5ddf5', 18, 48]} />
        <DaySky />
        <Suspense fallback={null}>
          <group position={[0, 0.15, 0.4]} scale={1.35}>
            <ClockworkPortal interactive={false} />
          </group>
        </Suspense>
        <Suspense fallback={null}>
          <ForestRush />
        </Suspense>
      </Canvas>
      <PortalHotspot />
    </div>
  );
}
