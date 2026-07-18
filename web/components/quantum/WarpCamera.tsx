'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import {
  getFlash,
  getGlow,
  getSuction,
  getSuctionPhase,
  getStillness,
} from './suctionInput';
import { getActiveSky } from './dailySky';

const BASE_POS = new THREE.Vector3(0, 0.15, 4.2);
const WARP_POS = new THREE.Vector3(0, 0.06, 2.35);
const BASE_FOV = 42;
const WARP_FOV = 54;

/**
 * Body immersion: ease the camera into the portal and open FOV while warping.
 * Crossing: brief FOV/exposure punch (A) and hush (E).
 */
export default function WarpCamera() {
  const { camera, gl } = useThree();
  const shake = useRef(0);
  const tmp = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const suck = getSuction();
    const phase = getSuctionPhase();
    const glow = getGlow();
    const flash = getFlash();
    const still = getStillness();

    // Same slow cubic feel as the starfield warp ramp
    let fly = THREE.MathUtils.smoothstep(suck, 0.04, 0.92);
    fly = fly * fly * fly;
    if (phase === 'restoring') {
      fly = Math.max(fly, THREE.MathUtils.smoothstep(1 - getSuction(), 0, 0.35) * 0.45);
    }
    if (phase === 'crossing') {
      fly = Math.max(fly, 0.92);
    }
    fly = Math.min(1, fly + glow * 0.04);

    const persp = camera as THREE.PerspectiveCamera;
    const targetFov =
      THREE.MathUtils.lerp(BASE_FOV, WARP_FOV, fly) + flash * 6 - still * 1.5;
    persp.fov = THREE.MathUtils.lerp(
      persp.fov,
      THREE.MathUtils.clamp(targetFov, 32, 68),
      1 - Math.pow(0.0002, dt),
    );
    persp.updateProjectionMatrix();

    tmp.current.lerpVectors(BASE_POS, WARP_POS, fly);
    tmp.current.z -= flash * 0.08;

    // Soft breath + late-stage tremor as the gate opens (hushed during E)
    shake.current = THREE.MathUtils.lerp(
      shake.current,
      fly > 0.55 ? fly * 0.012 * (1 - still * 0.95) : 0,
      1 - Math.pow(0.02, dt),
    );
    const t = state.clock.elapsedTime;
    tmp.current.x += Math.sin(t * 11.0) * shake.current;
    tmp.current.y += Math.cos(t * 13.0) * shake.current * 0.7;

    camera.position.lerp(tmp.current, 1 - Math.pow(0.0008, dt));
    camera.lookAt(0, 0, 0);

    const baseExposure = getActiveSky().exposure;
    const warpExposure = Math.max(0.55, baseExposure - 0.2);
    const exposure =
      THREE.MathUtils.lerp(baseExposure, warpExposure, fly * 0.85) +
      flash * 0.9 -
      still * 0.06;
    gl.toneMappingExposure = THREE.MathUtils.lerp(
      gl.toneMappingExposure,
      exposure,
      1 - Math.pow(0.01, dt),
    );
  });

  return null;
}
