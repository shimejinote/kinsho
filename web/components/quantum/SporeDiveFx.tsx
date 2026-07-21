'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { getMushroomField } from './glyphStarsMode';
import { getActiveSky } from './dailySky';
import {
  getArrivalFreeze,
  getGlow,
  getSuction,
  getSuctionPhase,
  getStillness,
} from './suctionInput';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Mushroom-dive only: spore bloom rings + mycelial swirl into the portal.
 * Distinct from glyph enlarge / starfield warp.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uAmount;
uniform float uTime;
uniform vec3 uWarm;
uniform vec3 uHeat;
uniform vec3 uCool;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float amt = clamp(uAmount, 0.0, 1.0);
  if (amt < 0.008) discard;

  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.06;
  float r = length(p);
  float ang = atan(p.y, p.x);

  // Burst then collapse — opposite of a readable page forming
  float burst = sin(clamp(amt, 0.0, 1.0) * 3.14159);
  float crush = pow(smoothstep(0.35, 1.0, amt), 1.4);

  // Expanding then contracting spore rings
  float rings = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float pulse = fract(uTime * (0.35 + fi * 0.08) + fi * 0.17 + amt * 0.6);
    float rr = mix(0.12, mix(0.85, 0.08, crush), pow(pulse, 0.65));
    float ring = exp(-pow((r - rr) * mix(28.0, 55.0, crush), 2.0));
    ring *= (1.0 - pulse) * (0.55 + burst * 0.7);
    rings += ring * (0.85 - fi * 0.12);
  }

  // Mycelial log-spiral threads
  float threads = 0.0;
  for (int j = 0; j < 5; j++) {
    float fj = float(j);
    float curl = ang * (3.0 + fj) - log(max(r, 0.06)) * (2.2 + fj * 0.4)
      - uTime * (1.2 + fj * 0.35) * (0.6 + amt);
    float rib = pow(0.5 + 0.5 * sin(curl), mix(18.0, 40.0, amt));
    float band = smoothstep(0.95, 0.1, r) * smoothstep(0.04, 0.14, r);
    threads += rib * band * (0.35 + burst * 0.45);
  }

  // Soft spore motes near the portal lip
  float motes = 0.0;
  for (int k = 0; k < 6; k++) {
    float fk = float(k);
    float h = hash(vec2(fk * 3.1, floor(uTime * 2.0 + fk)));
    float a0 = h * 6.28318 + uTime * (0.4 + h);
    float rad = mix(0.16, 0.55, fract(h * 7.2)) * mix(1.2, 0.25, crush);
    vec2 c = vec2(cos(a0), sin(a0)) * rad;
    float d = length(p - c);
    motes += exp(-d * d * mix(90.0, 220.0, crush)) * (0.5 + burst * 0.8);
  }

  float fx = (rings * 1.1 + threads * 0.55 + motes * 0.9) * amt;
  fx *= 1.0 - smoothstep(0.92, 1.15, r);

  vec3 col = mix(uWarm, uHeat, burst * 0.55 + rings * 0.25);
  col = mix(col, uCool, threads * 0.2);
  col *= fx;

  float alpha = clamp(fx * mix(0.35, 0.75, burst), 0.0, 0.82) * amt;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export default function SporeDiveFx() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const amount = useRef(0);
  const sky = useMemo(() => getActiveSky(), []);
  const uniforms = useMemo(
    () => ({
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uWarm: { value: new THREE.Vector3(...sky.starWarm) },
      uHeat: { value: new THREE.Vector3(...sky.starHeat) },
      uCool: { value: new THREE.Vector3(...sky.starCool) },
    }),
    [sky],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const mush = getMushroomField();
    const suck = getSuction();
    let target = 0;
    if (mush) {
      // Later / softer envelope so rings don't peak into a white flash
      target = THREE.MathUtils.smoothstep(suck, 0.08, 0.94);
      target = target * target * (3 - 2 * target);
      if (getSuctionPhase() === 'crossing') target = Math.max(target, 0.78);
      if (getSuctionPhase() === 'restoring') target = Math.max(target, getGlow() * 0.2);
      target *= 1 - getStillness() * 0.5;
      target *= 1 - getArrivalFreeze() * 0.9;
      target *= 0.72;
    }
    amount.current = THREE.MathUtils.lerp(
      amount.current,
      target,
      1 - Math.pow(0.008, dt),
    );
    mat.current.uniforms.uAmount.value = amount.current;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    const live = getActiveSky();
    (mat.current.uniforms.uWarm.value as THREE.Vector3).set(...live.starWarm);
    (mat.current.uniforms.uHeat.value as THREE.Vector3).set(...live.starHeat);
    (mat.current.uniforms.uCool.value as THREE.Vector3).set(...live.starCool);
  });

  return (
    <mesh renderOrder={18} frustumCulled={false}>
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
