'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyDirector } from '../journey/JourneyDirector';
import type { JourneyStageId } from '../journey/timeline';
import { glslNoise } from './noise.glsl';
import { resetSuction, tickSuction } from './suctionInput';

/**
 * Starfield motes (GPU points).
 * Long-press: atmospheric re-entry — stars streak front→back, faster as you hold.
 * Full commit: colored bang choruses, then drift again.
 */
const DEFAULT_COUNT = 25000;

const vertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uSuck;
uniform float uRestore;
uniform float uGlow;
uniform float uPixelRatio;
uniform float uColors;
varying float vDim;
varying float vGlow;
varying float vPick;
varying float vStreak;

${glslNoise}

vec3 bangExpand(vec3 orbit, float re, float cycle, vec3 seed, float shell) {
  vec3 dir = orbit / max(length(orbit), 1e-4);
  float homeR = length(orbit);
  float ang = atan(orbit.z, orbit.x);
  float elev = asin(clamp(dir.y, -1.0, 1.0));

  float delay = fract(seed.x * 3.17 + seed.z * 1.91) * 0.45;
  float localT = clamp((re - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  localT = localT * localT * (3.0 - 2.0 * localT);

  // 0..7 choreography index
  float c = mod(max(floor(cycle + 0.001) - 1.0, 0.0), 8.0);
  vec3 p = dir * homeR * pow(localT, 0.5);

  if (c < 0.5) {
    float e = pow(localT, 0.55);
    p = dir * homeR * e;
    p = mix(p, orbit, pow(localT, 2.2));
  } else if (c < 1.5) {
    float band = floor(seed.y * 5.0) / 5.0;
    float wave = smoothstep(band, band + 0.2, localT);
    float boom = 1.0 + 0.35 * sin(3.14159 * wave) * (1.0 - localT);
    p = dir * homeR * wave * boom;
    p = mix(p, orbit, pow(localT, 1.8));
  } else if (c < 2.5) {
    float petal = abs(cos(ang * 2.5 + seed.x * 6.28));
    float gate = smoothstep(0.15, 0.85, localT + petal * 0.35);
    p = dir * homeR * pow(gate, 0.7);
    p.y *= mix(0.2, 1.0, localT);
    p = mix(p, orbit, pow(localT, 1.6));
  } else if (c < 3.5) {
    float up = sin(localT * 3.14159);
    p = dir * homeR * pow(localT, 0.5);
    p.y += homeR * 0.55 * up * (0.5 + seed.z);
    p = mix(p, orbit, pow(localT, 1.5));
  } else if (c < 4.5) {
    float jet = sign(orbit.y + 0.001);
    vec3 jdir = normalize(mix(dir, vec3(0.0, jet, 0.0), 0.75));
    float stage = smoothstep(0.0, 0.45, localT);
    float fan = smoothstep(0.4, 1.0, localT);
    p = mix(jdir * homeR * 0.3 * stage, dir * homeR, fan);
    p = mix(p, orbit, pow(localT, 1.7));
  } else if (c < 5.5) {
    float twist = (1.0 - localT) * (2.2 + seed.x * 2.0);
    float ca = cos(twist);
    float sa = sin(twist);
    vec3 spun = vec3(dir.x * ca - dir.z * sa, dir.y, dir.x * sa + dir.z * ca);
    p = spun * homeR * pow(localT, 0.48);
    p = mix(p, orbit, pow(localT, 1.55));
  } else if (c < 6.5) {
    float lat = abs(elev) / 1.5708;
    float ringT = clamp((localT - lat * 0.5) / 0.5, 0.0, 1.0);
    p = dir * homeR * pow(ringT, 0.6);
    p = mix(p, orbit, pow(localT, 1.65));
  } else {
    float ripple = 0.5 + 0.5 * sin(localT * 18.0 - shell * 9.0);
    float e = pow(localT, 0.4);
    float boom = 1.0 + 0.5 * ripple * (1.0 - localT);
    vec3 scatter = vec3(seed.x - 0.5, seed.z - 0.5, seed.y - 0.5) * homeR * 0.2 * (1.0 - localT);
    p = dir * homeR * e * boom + scatter;
    p = mix(p, orbit, pow(localT, 1.4));
  }

  return p;
}

void main(){
  float id = aSeed.x * 6.2831853;
  float shell = aSeed.y;
  float speed = 0.006 + aSeed.z * 0.012;

  float radius = 1.6 + shell * 3.2;
  float t = uTime * speed + id;
  vec3 orbit;
  orbit.x = cos(t) * radius;
  orbit.z = sin(t) * radius - 0.4;
  orbit.y = sin(t * 0.55 + shell * 9.0) * radius * 0.4 + 0.1;

  vec3 np = orbit * 0.25 + vec3(0.0, uTime * 0.008, 0.0);
  orbit += vec3(snoise(np), snoise(np + 21.0), snoise(np + 54.0)) * 0.28;

  float suck = clamp(uSuck, 0.0, 1.0);
  float rest = clamp(uRestore, 0.0, 1.0);
  float re = rest * rest * (3.0 - 2.0 * rest);

  vec3 center = orbit;
  float glowPop = 0.0;
  float streak = 0.0;

  // Entry speed: long ease-in (余韻) then a firm dive — overall slower than before
  float dive = smoothstep(0.12, 0.85, suck);
  dive = dive * dive * dive; // stays gentle, then guuutt
  float fly = dive * pow(suck, 1.6);
  float scroll = uTime * (0.2 + fly * 14.0) * (0.5 + aSeed.z * 0.85);
  float depth = fract(aSeed.x * 2.13 + aSeed.z * 0.77 + shell * 0.29 - scroll);
  float z = mix(-16.0, 10.0, depth);
  float rad = (0.45 + shell * 2.7 + aSeed.z * 0.5);
  rad *= mix(1.3, 0.8, abs(depth - 0.5) * 1.4);
  float spin = id + uTime * (0.02 + fly * 0.18);
  vec3 entry = vec3(cos(spin) * rad, sin(spin * 1.07) * rad * 0.58, z);

  if (rest > 0.001) {
    vec3 bang = bangExpand(orbit, re, uColors, aSeed, shell);
    vec3 fromEntry = normalize(vec3(entry.x, entry.y, 0.001)) * length(orbit);
    fromEntry.z = mix(entry.z, orbit.z, re);
    center = mix(fromEntry, bang, smoothstep(0.0, 0.55, re));
    center = mix(center, orbit, pow(re, 1.65));
    glowPop = max(uGlow, rest * 0.85);
    streak = (1.0 - re) * 0.25;
  } else if (suck > 0.001) {
    // Linger in calm space first, then pull into the tunnel
    float w = smoothstep(0.08, 0.55, suck);
    w = w * w * (3.0 - 2.0 * w);
    center = mix(orbit, entry, w);
    float heat = exp(-pow((z - 3.2) * 0.28, 2.0));
    glowPop = fly * (0.2 + heat * 1.4) * w + uGlow * 0.4;
    streak = fly * w;
  } else {
    center = orbit;
    glowPop = 0.0;
    streak = 0.0;
  }

  glowPop = max(glowPop, uGlow * step(0.02, suck + rest));

  vec4 mv = modelViewMatrix * vec4(center, 1.0);
  gl_Position = projectionMatrix * mv;

  float sz = mix(1.2, 2.8, aSeed.z);
  sz = max(sz, step(0.001, rest) * mix(1.2, 2.8, aSeed.z));
  sz *= 1.0 + streak * 2.4;
  sz *= 2.4 * uPixelRatio;
  gl_PointSize = clamp(sz * (2.8 / max(0.6, -mv.z)), 0.5, 56.0);

  vDim = 0.2 + 0.45 * aSeed.z;
  vDim = max(vDim, glowPop * 0.9);
  vDim *= 1.0 + streak * 0.7;
  vGlow = glowPop * (1.1 + aSeed.z * 0.6);
  vPick = aSeed.x;
  vStreak = streak;
}
`;

const fragment = /* glsl */ `
precision highp float;
varying float vDim;
varying float vGlow;
varying float vPick;
varying float vStreak;
uniform float uColors;
uniform float uLayerOpacity;

vec3 paletteColor(float idx) {
  float i = floor(idx + 0.001);
  if (i < 0.5) return vec3(1.00, 0.92, 0.55);
  if (i < 1.5) return vec3(0.45, 0.85, 1.00);
  if (i < 2.5) return vec3(1.00, 0.35, 0.45);
  if (i < 3.5) return vec3(0.55, 1.00, 0.50);
  if (i < 4.5) return vec3(0.85, 0.45, 1.00);
  if (i < 5.5) return vec3(1.00, 0.60, 0.20);
  if (i < 6.5) return vec3(0.40, 0.55, 1.00);
  return vec3(1.00, 0.75, 0.90);
}

void main(){
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  // Stretch into a dash while re-entering (meteor trail)
  uv.y *= mix(1.0, 0.22, clamp(vStreak, 0.0, 1.0));
  float d = length(uv);
  if (d > 1.0) discard;

  float core = exp(-d * d * 7.0);
  float halo = exp(-d * d * 2.0) * 0.45;
  float spark = pow(max(0.0, 1.0 - d), 10.0);
  float shape = core + halo + spark * 0.4;

  vec3 tint;
  float n = floor(uColors + 0.001);
  if (n < 1.0) {
    // Idle cool stars; entry heat leans amber without washing to white
    vec3 cool = mix(vec3(0.72, 0.82, 1.0), vec3(1.0, 0.9, 0.7), clamp(vDim * 1.1, 0.0, 1.0));
    vec3 heat = vec3(1.0, 0.55, 0.22);
    tint = mix(cool, heat, clamp(vStreak * 0.85, 0.0, 1.0));
  } else {
    float slot = floor(fract(vPick * 1.718) * n);
    tint = paletteColor(slot);
  }

  float lit = vDim * 1.1 + vGlow * 2.4;
  vec3 col = tint * shape * lit;
  col += tint * spark * vGlow * 1.8;

  float alpha = clamp(shape * (vDim * 1.2 + vGlow * 0.85), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha * uLayerOpacity);
}
`;

type ParticleSwarmProps = {
  count?: number;
  journey?: {
    director: JourneyDirector;
    stageId: JourneyStageId;
  };
};

export default function ParticleSwarm({
  journey,
  count = DEFAULT_COUNT,
}: ParticleSwarmProps = {}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const particleCount = Math.max(500, Math.floor(count));

  useEffect(() => {
    if (journey) return;
    resetSuction();
    return () => resetSuction();
  }, [journey]);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      seeds[i * 3 + 0] = Math.random();
      seeds[i * 3 + 1] = Math.pow(Math.random(), 0.6);
      seeds[i * 3 + 2] = Math.random();
    }
    return { positions, seeds };
  }, [particleCount]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSuck: { value: 0 },
      uRestore: { value: 0 },
      uGlow: { value: 0 },
      uPixelRatio: { value: 1 },
      uColors: { value: 0 },
      uLayerOpacity: { value: 1 },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const un = mat.current.uniforms;
    un.uTime.value = state.clock.elapsedTime;
    un.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 2);

    if (journey) {
      const frame = journey.director.getLayerFrame(journey.stageId);
      un.uSuck.value = THREE.MathUtils.smoothstep(frame.progress, 0.45, 1);
      un.uRestore.value = 0;
      un.uGlow.value = frame.progress * 0.35;
      un.uColors.value = 0;
      un.uLayerOpacity.value = frame.weight;
      return;
    }

    const frame = tickSuction(delta);
    // During bang, keep suck at 0 so entry/orbit don't fight the restore choreography
    un.uSuck.value = frame.phase === 'restoring' ? 0 : frame.strength;
    un.uRestore.value = frame.restore;
    un.uGlow.value = frame.glow;
    un.uColors.value = frame.cycle;
    un.uLayerOpacity.value = 1;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
      </bufferGeometry>
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  );
}
