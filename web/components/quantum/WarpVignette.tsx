'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getGlow, getSuction, getSuctionPhase, getStillness } from './suctionInput';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Screen-space immersion veil: darken periphery, keep a soft window on the portal,
 * add a faint rift tint so the gate owns attention while warping.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uWarp;
uniform float uTime;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  // Slightly taller framing matches typical portrait FOV feel
  p.x *= 1.05;
  float r = length(p);

  float warp = clamp(uWarp, 0.0, 1.0);
  if (warp < 0.001) discard;

  // Soft portal window (center stays readable)
  float window = 1.0 - smoothstep(0.08, 0.42, r);
  // Peripheral falloff — stronger toward corners
  float vig = smoothstep(0.18, 1.15, r);
  vig = pow(vig, 1.35);

  // Slow breathing of the veil
  float breath = 0.92 + 0.08 * sin(uTime * 1.4 + r * 3.0);

  float a = vig * warp * 0.82 * breath;
  a *= 1.0 - window * 0.55;
  a = clamp(a, 0.0, 0.92);

  // Deep space → rift violet at the inner edge of the vignette
  vec3 deep = vec3(0.01, 0.012, 0.03);
  vec3 rift = vec3(0.08, 0.04, 0.18);
  float ring = exp(-pow((r - 0.38) * 4.5, 2.0)) * warp;
  vec3 col = mix(deep, rift, 0.35 + warp * 0.4);
  col += vec3(0.2, 0.35, 0.85) * ring * 0.25;
  col += vec3(0.45, 0.2, 0.75) * ring * 0.15;

  gl_FragColor = vec4(col, a);
}
`;

export default function WarpVignette() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uWarp: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const suck = getSuction();
    let fly = THREE.MathUtils.smoothstep(suck, 0.03, 0.9);
    fly = fly * fly;
    if (getSuctionPhase() === 'restoring') {
      fly = Math.max(fly, 0.25 * getGlow());
    }
    if (getSuctionPhase() === 'crossing') {
      fly = Math.max(fly, 0.9);
    }
    fly = Math.min(1, fly + getGlow() * 0.06);
    fly *= 1 - getStillness() * 0.5;

    const cur = mat.current.uniforms.uWarp.value as number;
    mat.current.uniforms.uWarp.value = THREE.MathUtils.lerp(
      cur,
      fly,
      1 - Math.pow(0.012, dt),
    );
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={20} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
