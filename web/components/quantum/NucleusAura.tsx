'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  getArrivalFreeze,
  getFlash,
  getSuction,
  getSuctionPhase,
} from './suctionInput';
import { getActiveSky } from './dailySky';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Soft perfect-circle dimensional nucleus.
 * Stars feed into this disc so the silhouette stays round, not jagged.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uAmount;
uniform float uTime;
uniform vec3 uFzCore;
uniform vec3 uFzMid;
uniform vec3 uFzAccent;

void main() {
  float a0 = clamp(uAmount, 0.0, 1.0);
  if (a0 < 0.008) discard;

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 0.98) discard;

  float disc = 1.0 - smoothstep(0.0, 0.88, r);
  disc = pow(disc, 1.65);
  float rim = exp(-pow((r - 0.58) * 10.0, 2.0));
  float halo = exp(-r * r * 2.2) * 0.4;
  float breath = 0.92 + 0.08 * sin(uTime * 2.2 + r * 6.0);

  float a = (disc * 0.36 + rim * 0.5 + halo * 0.3) * a0 * breath;
  a *= 1.0 - smoothstep(0.82, 0.96, r);
  a = clamp(a, 0.0, 0.5);

  vec3 col = mix(uFzMid, uFzCore, disc);
  col = mix(col, uFzAccent, rim * 0.55 + (1.0 - disc) * 0.2);

  gl_FragColor = vec4(col, a);
}
`;

export default function NucleusAura() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const sky = useMemo(() => getActiveSky(), []);
  const uniforms = useMemo(
    () => ({
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uFzCore: { value: new THREE.Vector3(...sky.freeze.core) },
      uFzMid: { value: new THREE.Vector3(...sky.freeze.mid) },
      uFzAccent: { value: new THREE.Vector3(...sky.freeze.accent) },
    }),
    [sky],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const suck = getSuction();
    let pinch = THREE.MathUtils.smoothstep(suck, 0.55, 0.97);
    pinch = Math.pow(pinch, 1.6);
    if (getSuctionPhase() === 'crossing') pinch = Math.max(pinch, 0.85);
    pinch = Math.max(pinch, getArrivalFreeze() * 0.9);
    pinch = Math.max(pinch, getFlash() * 0.35);

    const cur = mat.current.uniforms.uAmount.value as number;
    mat.current.uniforms.uAmount.value = THREE.MathUtils.lerp(
      cur,
      pinch,
      1 - Math.pow(0.015, dt),
    );
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh position={[0, 0, 0.05]} renderOrder={12} frustumCulled={false}>
      <planeGeometry args={[1.85, 1.85]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
