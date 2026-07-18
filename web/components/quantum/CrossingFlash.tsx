'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getArrivalFreeze, getFlash, getStillness } from './suctionInput';
import { getActiveSky } from './dailySky';

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
uniform float uFreeze;
uniform vec3 uFzCore;
uniform vec3 uFzMid;
uniform vec3 uFzAccent;
uniform vec3 uFzDeep;

void main() {
  float flash = clamp(uFlash, 0.0, 1.0);
  float still = clamp(uStill, 0.0, 1.0);
  float frz = clamp(uFreeze, 0.0, 1.0);
  if (flash < 0.003 && still < 0.02 && frz < 0.02) discard;

  vec2 p = vUv * 2.0 - 1.0;
  p.y += 0.02;
  float r = length(p);

  float core = exp(-r * r * mix(3.2, 2.2, frz));
  float mid = exp(-r * r * mix(1.1, 0.7, frz));
  float ring = exp(-pow((r - mix(0.22, 0.3, frz)) * mix(9.0, 5.5, frz), 2.0));
  float outer = exp(-pow((r - 0.48) * 4.2, 2.0)) * 0.45;
  float nebula = exp(-r * r * 0.35) * (0.2 + 0.15 * sin(r * 18.0 + frz * 4.0));

  float a = flash * (core * mix(1.15, 0.55, frz) + mid * 0.4 + ring * mix(0.95, 0.55, frz) + outer * 0.28);
  a += still * mix(0.08, 0.14, frz) * (0.4 + 0.6 * core);
  a += frz * (nebula * 0.22 + ring * 0.18 + mid * 0.12);
  a = clamp(a, 0.0, mix(0.98, 0.42, frz));

  vec3 col = mix(uFzCore, uFzMid, ring * 0.5);
  col = mix(col, uFzAccent, frz * 0.35 + outer * 0.25);
  col = mix(col, uFzDeep, frz * mid * 0.25);
  col *= mix(1.0 + flash * 0.55, 1.05 + frz * 0.15, frz);

  gl_FragColor = vec4(col, a);
}
`;

export default function CrossingFlash() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const sky = useMemo(() => getActiveSky(), []);
  const uniforms = useMemo(
    () => ({
      uFlash: { value: 0 },
      uStill: { value: 0 },
      uFreeze: { value: 0 },
      uFzCore: { value: new THREE.Vector3(...sky.freeze.core) },
      uFzMid: { value: new THREE.Vector3(...sky.freeze.mid) },
      uFzAccent: { value: new THREE.Vector3(...sky.freeze.accent) },
      uFzDeep: { value: new THREE.Vector3(...sky.freeze.deep) },
    }),
    [sky],
  );

  useFrame((_, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const ease = 1 - Math.pow(0.00005, dt);
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
    mat.current.uniforms.uFreeze.value = THREE.MathUtils.lerp(
      mat.current.uniforms.uFreeze.value as number,
      getArrivalFreeze(),
      1 - Math.pow(0.02, dt),
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
