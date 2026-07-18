'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getFlash, getStillness } from './suctionInput';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/** Soft cold flash for crossing pattern A (+ faint hush veil for E). */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uFlash;
uniform float uStill;

void main() {
  float flash = clamp(uFlash, 0.0, 1.0);
  float still = clamp(uStill, 0.0, 1.0);
  if (flash < 0.004 && still < 0.02) discard;

  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);

  // Soft center-weighted cold white (not a hard slam)
  float core = exp(-r * r * 1.8);
  float veil = 0.35 + 0.65 * core;
  float a = flash * veil * 0.72;

  // Stillness adds a faint hush veil (almost imperceptible alone)
  a += still * 0.06 * (0.5 + 0.5 * core);

  vec3 cold = vec3(0.82, 0.9, 1.0);
  vec3 white = vec3(0.95, 0.97, 1.0);
  vec3 col = mix(cold, white, flash);

  gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
}
`;

export default function CrossingFlash() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uFlash: { value: 0 },
      uStill: { value: 0 },
    }),
    [],
  );

  useFrame((_, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.pow(0.0008, dt);
    mat.current.uniforms.uFlash.value = THREE.MathUtils.lerp(
      mat.current.uniforms.uFlash.value as number,
      getFlash(),
      ease,
    );
    mat.current.uniforms.uStill.value = THREE.MathUtils.lerp(
      mat.current.uniforms.uStill.value as number,
      getStillness(),
      ease,
    );
  });

  return (
    <mesh renderOrder={30} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
