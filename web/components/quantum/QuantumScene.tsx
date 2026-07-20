'use client';

import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import ClockworkPortal from './ClockworkPortal';
import CrossingFlash from './CrossingFlash';
import { pickRandomSky } from './dailySky';
import DimensionalRift from './DimensionalRift';
import NucleusAura from './NucleusAura';
import ParticleSwarm from './ParticleSwarm';
import ProseBlackout from './ProseBlackout';
import { beginVoidGenesis } from './voidGenesis';
import WarpCamera from './WarpCamera';
import WarpVignette from './WarpVignette';
import WarpWind from './WarpWind';
import styles from './VoidSpace.module.css';

/**
 * Dust field + void portal. Idle sky is random per visit;
 * click / long-press warp ritual stays the same.
 */
export default function QuantumScene() {
  const sky = useMemo(() => pickRandomSky(), []);

  useEffect(() => {
    beginVoidGenesis();
  }, []);

  return (
    <div
      className="absolute inset-0 h-full w-full overflow-hidden"
      style={{ background: sky.cssBg }}
      data-sky={sky.id}
      aria-label={`虚空 · ${sky.label}`}
    >
      {/* Space well + nebula — behind transparent WebGL */}
      <div
        aria-hidden
        className={`${styles.nebulaFar} pointer-events-none absolute inset-[-12%] opacity-60 mix-blend-screen`}
        style={{ backgroundImage: sky.cssNebula }}
      />
      <div
        aria-hidden
        className={`${styles.nebula} pointer-events-none absolute inset-[-8%]`}
        style={{ backgroundImage: sky.cssNebula }}
      />
      <div
        aria-hidden
        className={`${styles.nebulaSlow} pointer-events-none absolute inset-[-5%] mix-blend-screen`}
        style={{ backgroundImage: sky.cssNebula }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: sky.cssVeil }}
      />

      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 4.2], fov: 42, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
          premultipliedAlpha: true,
        }}
        style={{ touchAction: 'none', background: 'transparent' }}
        onCreated={({ gl, camera, scene }) => {
          gl.setClearColor(0x000000, 0);
          scene.background = null;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = sky.exposure;
          camera.lookAt(0, 0, 0);
          beginVoidGenesis();
        }}
      >
        <Suspense fallback={null}>
          <WarpCamera />
          <ProseBlackout />
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
