'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
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
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Radial wind-cut streaks from the portal rim — like shearing air while warping in.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uWarp;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  float ang = atan(p.y, p.x);

  float warp = clamp(uWarp, 0.0, 1.0);
  if (warp < 0.004) discard;

  // Portal keep-out + far fade — wind lives in the annulus outside the seal
  float rim = 0.095;
  float inner = smoothstep(rim * 0.82, rim * 1.15, r);
  float outer = 1.0 - smoothstep(0.55, 0.98, r);
  float band = inner * outer;
  if (band < 0.01) discard;

  float speed = 2.2 + warp * 14.0;
  float rush = uTime * speed;

  // Many radial slashes — thin blades cutting air outward
  float blades = 0.0;
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float slot = hash(fi * 19.1 + 2.7);
    float count = 9.0 + floor(slot * 7.0);
    float phase = hash(fi * 7.3) * 6.28318;
    float spin = ang * count + phase - rush * (0.55 + slot * 1.4);
    float spoke = pow(0.5 + 0.5 * sin(spin), 48.0 + warp * 40.0);

    // Length varies; brighter near rim (leading edge of the cut)
    float along = smoothstep(rim, rim + 0.08, r) * (1.0 - smoothstep(0.35, 0.85, r));
    float len = along * (0.55 + 0.45 * hash(fi * 3.1 + floor(rush * 0.15 + slot * 8.0)));
    blades += spoke * len * (0.55 + slot);
  }
  blades = clamp(blades, 0.0, 2.2);

  // Shear ribbons — slightly curved streaks (wind peeling off the rim)
  float shear = 0.0;
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    float off = hash(fj * 11.9) * 6.28318;
    float curl = ang + log(max(r, 0.08)) * (1.2 + fj * 0.35) - rush * (0.8 + fj * 0.25) + off;
    float rib = pow(0.5 + 0.5 * sin(curl * (14.0 + fj * 3.0)), 22.0);
    float fade = smoothstep(rim, 0.22, r) * (1.0 - smoothstep(0.4, 0.9, r));
    shear += rib * fade * (0.4 + 0.2 * fj);
  }

  // Expanding shock rings — discrete wind fronts
  float rings = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float pulse = fract(rush * (0.08 + fk * 0.02) + hash(fk * 5.5));
    float rr = mix(rim * 1.05, 0.92, pow(pulse, 0.7));
    float ring = exp(-pow((r - rr) * mix(55.0, 28.0, pulse), 2.0));
    ring *= 1.0 - pulse;
    rings += ring * (0.7 - fk * 0.15);
  }

  float wind = blades * 1.15 + shear * 0.55 + rings * 1.35;
  wind *= band * warp;

  // Cool air / rift tint
  vec3 cold = vec3(0.65, 0.82, 1.0);
  vec3 rift = vec3(0.55, 0.4, 1.0);
  vec3 col = mix(cold, rift, 0.25 + warp * 0.35);
  col *= wind;

  // Soft rim highlight where air is "cut" off the seal
  float lip = exp(-pow((r - rim) * 40.0, 2.0)) * warp;
  col += vec3(0.85, 0.9, 1.0) * lip * 0.55;
  col += cold * rings * 0.35;

  float alpha = clamp(wind * 0.55 + lip * 0.4 + rings * 0.25, 0.0, 0.85) * warp;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(col, alpha);
}
`;

export default function WarpWind() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWarp: { value: 0 },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const dt = Math.min(delta, 0.05);
    const suck = getSuction();
    let fly = THREE.MathUtils.smoothstep(suck, 0.02, 0.88);
    fly = fly * fly;
    if (getSuctionPhase() === 'restoring') {
      fly = Math.max(fly, getGlow() * 0.2);
    }
    if (getSuctionPhase() === 'crossing') {
      fly = Math.max(fly, 0.85);
    }
    fly = Math.min(1, fly + getGlow() * 0.05);
    fly *= 1 - getStillness() * 0.85;
    fly *= 1 - getArrivalFreeze();

    const cur = mat.current.uniforms.uWarp.value as number;
    mat.current.uniforms.uWarp.value = THREE.MathUtils.lerp(
      cur,
      fly,
      1 - Math.pow(0.02, dt),
    );
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh renderOrder={10} position={[0, 0, 0.02]} frustumCulled={false}>
      {/* Large disk around the portal; wind lives outside the seal */}
      <planeGeometry args={[7.2, 7.2]} />
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
