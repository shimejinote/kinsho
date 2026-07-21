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
 * Soft photon-ring aura around the event horizon.
 * Dark core + bright critical orbit so stars falling in read as swallowed, not piled.
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

  // Event-horizon void (subtractive feel via low alpha core)
  float hole = 1.0 - smoothstep(0.0, 0.42, r);
  hole = pow(hole, 1.4);

  // Photon ring — thin critical orbit where light piles up
  float ring = exp(-pow((r - 0.52) * 14.0, 2.0));
  float ringInner = exp(-pow((r - 0.38) * 22.0, 2.0)) * 0.55;
  float halo = exp(-r * r * 1.8) * 0.22 * (1.0 - hole);
  float breath = 0.92 + 0.08 * sin(uTime * 2.2 + r * 6.0);
  float spin = 0.55 + 0.45 * sin(atan(p.y, p.x) * 3.0 - uTime * 1.8);

  float a = (ring * 0.72 + ringInner * 0.4 + halo * 0.35) * a0 * breath * spin;
  a *= 1.0 - hole * 0.85;
  a *= 1.0 - smoothstep(0.82, 0.96, r);
  a = clamp(a, 0.0, 0.55);

  vec3 col = mix(uFzMid, uFzAccent, ring);
  col = mix(col, uFzCore, ringInner * 0.6);
  col *= 1.0 + ring * 0.45;

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
    let pinch = THREE.MathUtils.smoothstep(suck, 0.22, 0.98);
    pinch = Math.pow(pinch, 1.35);
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
