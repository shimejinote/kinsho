'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getRift } from './suctionInput';
import { getWarpDivePattern } from './warpPattern';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Dimensional crossing precursor — soft planar shear, refractive slit,
 * cool chromatic fringe. Reads as a reality-fold / light membrane,
 * not cartoon thunderbolts. Brief, low intensity, before A flash.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uRift;
uniform float uTime;
uniform vec3 uTint;

void main() {
  float rift = clamp(uRift, 0.0, 1.0);
  if (rift < 0.008) discard;

  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.05;
  float r = length(p);

  // Soft shear: space folds slightly as the membrane opens
  float shearAmp = 0.028 * rift;
  float shear =
    sin(p.y * 9.0 + uTime * 1.6) * shearAmp
    + sin(p.y * 21.0 - uTime * 2.4 + p.x * 3.0) * shearAmp * 0.35;
  vec2 q = p + vec2(shear, shear * 0.25);

  // Portal-aligned light sheet (slightly tilted slit through the void)
  float tilt = 0.11;
  float dMem = abs(q.y - tilt * q.x);
  float core = exp(-dMem * 72.0);
  float sheet = exp(-dMem * 14.0) * 0.32;
  float halo = exp(-dMem * 5.5) * 0.12;

  // Chromatic fringe — cool cyan / violet offset along the membrane
  float fringe = 0.014 * (0.6 + 0.4 * rift);
  float cyanEdge = exp(-abs(q.y - tilt * q.x - fringe) * 48.0);
  float violetEdge = exp(-abs(q.y - tilt * q.x + fringe) * 48.0);

  // Faint radial energy ring where the sheet meets the portal aperture
  float ring = exp(-pow((r - 0.36) * 7.0, 2.0));
  float radialWhisper =
    exp(-abs(atan(q.y, q.x) - tilt * 1.4) * 3.5) * ring * 0.18;

  // Soft planar folds — brief reality shimmer, not bolts
  float folds =
    exp(-abs(sin(q.y * 12.0 + uTime * 1.1 + q.x * 1.8)) * 9.0) * 0.12
    + exp(-abs(sin(q.x * 8.5 - uTime * 0.7)) * 11.0) * 0.06;

  // Gentle breath — mysterious, not flickering strobes
  float breath =
    0.82 + 0.18 * sin(uTime * 4.2 + r * 3.0 + rift * 2.0);

  float a =
    (core * 0.75 + sheet * 1.35 + halo * 1.2 + folds * 1.1 + radialWhisper * 1.4)
    * rift * breath;
  a *= 0.6 + 0.5 * ring;
  // Keep periphery quiet so the scene stays readable
  a *= 1.0 - smoothstep(0.72, 1.35, r) * 0.55;
  a = clamp(a, 0.0, 0.62);

  vec3 cyan = vec3(0.5, 0.88, 1.0);
  vec3 violet = vec3(0.7, 0.48, 1.0);
  vec3 cold = vec3(0.88, 0.94, 1.0);
  vec3 col = mix(cyan, cold, clamp(core * 0.7, 0.0, 1.0));
  col = mix(col, violet, violetEdge * 0.45);
  col += cyan * cyanEdge * 0.5;
  col += violet * folds * 0.5;
  col *= 1.0 + rift * 0.45;

  // Per-pattern membrane signature.
  col = mix(col, uTint * (0.6 + 0.8 * core), 0.5);

  gl_FragColor = vec4(col, a);
}
`;

const tmpRift = new THREE.Vector3();

export default function DimensionalRift() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uRift: { value: 0 },
      uTime: { value: 0 },
      uTint: { value: new THREE.Vector3(0.55, 0.85, 1.0) },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    // Soft follow — membrane opens/closes, not snappy bolt flashes
    const ease = 1 - Math.pow(0.0002, dt);
    mat.current.uniforms.uRift.value = THREE.MathUtils.lerp(
      mat.current.uniforms.uRift.value as number,
      getRift(),
      ease,
    );
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    const rc = getWarpDivePattern().visual.riftColor;
    (mat.current.uniforms.uTint.value as THREE.Vector3).lerp(
      tmpRift.set(rc[0], rc[1], rc[2]),
      1 - Math.pow(0.02, dt),
    );
  });

  return (
    <mesh renderOrder={28} frustumCulled={false}>
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
