'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyDirector } from '../journey/JourneyDirector';
import type { JourneyStageId } from '../journey/timeline';
import { glslNoise } from './noise.glsl';
import { getFieldTimeScale, resetSuction, tickSuction } from './suctionInput';

/**
 * Starfield motes (GPU points).
 * Idle: irregular drift with gentle per-star speed variety, luminosity hierarchy,
 * spectral tint + twinkle.
 * Long-press: dimensional warp — stars birth at the portal rim, fall forward
 * in depth, and streak radially outward; keep-out disk stays empty.
 * Full commit: colored bang choruses, then drift again.
 */
const DEFAULT_COUNT = 25000;

/** World-space radius around the portal where stars must not appear. */
const CLEAR_RADIUS = 0.78;

const vertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uSuck;
uniform float uRestore;
uniform float uGlow;
uniform float uPixelRatio;
uniform float uColors;
uniform float uClearR;
varying float vDim;
varying float vGlow;
varying float vPick;
varying float vStreak;
varying float vTemp;
varying float vLum;
varying float vTrailAng;

${glslNoise}

vec3 bangExpand(vec3 orbit, float re, float cycle, vec3 seed, float shell) {
  vec3 dir = orbit / max(length(orbit), 1e-4);
  float homeR = length(orbit);
  float ang = atan(orbit.z, orbit.x);
  float elev = asin(clamp(dir.y, -1.0, 1.0));

  float delay = fract(seed.x * 3.17 + seed.z * 1.91) * 0.45;
  float localT = clamp((re - delay) / max(0.001, 1.0 - delay), 0.0, 1.0);
  localT = localT * localT * (3.0 - 2.0 * localT);

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

// Push XY outside the portal keep-out disk (screen-center clear zone).
vec3 keepClear(vec3 p, float clearR) {
  vec2 xy = p.xy;
  float r = length(xy);
  if (r < clearR) {
    xy *= clearR / max(r, 1e-4);
    p.xy = xy;
  }
  return p;
}

void main(){
  float id = aSeed.x * 6.2831853;
  float shell = aSeed.y;

  // Gentle idle speed variety (seed-driven): crawl → soft drift; some reverse
  float speedHash = fract(aSeed.z * 0.73 + aSeed.x * 2.17);
  float speed = mix(0.018, 0.085, pow(speedHash, 0.75));
  float spinDir = fract(aSeed.x * 5.33 + aSeed.z) > 0.38 ? 1.0 : -1.0;

  float radius = 1.6 + shell * 3.2;
  float phase0 = id + aSeed.z * 5.1 + shell * 2.3;
  float t = uTime * speed + phase0;

  // Soft uneven angular rate — irregular but calm
  float angJitter =
    sin(uTime * (0.18 + aSeed.z * 0.45) + id * 2.0) * (0.04 + aSeed.x * 0.1)
    + cos(uTime * (0.08 + shell * 0.25) + aSeed.z * 8.0) * 0.05;
  float ang = t * spinDir + angJitter;

  // Subtle radial breathing — breaks concentric circles without agitation
  float ecc = 0.06 + fract(aSeed.x * 3.71 + aSeed.z) * 0.18;
  float rWobble = 1.0
    + ecc * 0.35 * sin(t * (0.35 + aSeed.z * 0.7) + id)
    + (0.02 + aSeed.x * 0.05) * sin(t * (0.7 + shell * 0.9) + aSeed.z * 9.0);
  float rXZ = radius * rWobble;
  float stretchZ = mix(0.75, 1.12, fract(aSeed.z * 4.91));

  vec3 orbit;
  orbit.x = cos(ang) * rXZ;
  orbit.z = sin(ang) * rXZ * stretchZ - 0.4;
  // Soft vertical wander (per-star rate & amp)
  float yRate = 0.15 + fract(aSeed.x * 8.13) * 0.45;
  float yAmp = radius * (0.06 + fract(aSeed.z * 5.27) * 0.12);
  orbit.y = sin(t * yRate + shell * 9.0) * yAmp
    + cos(uTime * (0.1 + aSeed.z * 0.28) + id) * yAmp * 0.35
    + 0.1;

  // Light organic drift noise — varied, not chaotic
  float nSpeed = 0.02 + aSeed.z * 0.045;
  vec3 np = orbit * 0.2 + vec3(uTime * nSpeed, uTime * nSpeed * 0.7, aSeed.x * 10.0);
  float nAmp = 0.08 + aSeed.z * 0.12 + shell * 0.02;
  orbit += vec3(snoise(np), snoise(np + 21.0), snoise(np + 54.0)) * nAmp;
  orbit = keepClear(orbit, uClearR);

  float suck = clamp(uSuck, 0.0, 1.0);
  float rest = clamp(uRestore, 0.0, 1.0);
  float re = rest * rest * (3.0 - 2.0 * rest);

  // Slow dimensional warp ramp (time spent entering the rift)
  float dive = smoothstep(0.04, 0.92, suck);
  dive = dive * dive * dive;
  float fly = dive * pow(suck, 1.85);

  // Stable ray angle from portal center (screen XY)
  float rayAng = aSeed.x * 6.2831853 + aSeed.z * 1.7;
  float clearR = uClearR * mix(1.0, 1.08, fly);

  // Birth at rim (u~0) → rush outward; also rise from behind the gate toward the eye
  float scroll = uTime * (0.05 + fly * 9.5) * (0.35 + aSeed.z * 1.1);
  float u = fract(aSeed.x * 2.13 + aSeed.z * 0.77 + shell * 0.29 - scroll);
  float outward = pow(u, 0.55);
  // Bias density toward the rim so the gate feels like the source
  float rimBias = exp(-outward * 2.4);
  float rMax = clearR + 0.2 + shell * 6.2 + aSeed.z * 1.4;
  float rWarp = mix(clearR + 0.02, rMax, outward);

  vec3 stream;
  stream.x = cos(rayAng) * rWarp;
  stream.y = sin(rayAng) * rWarp;
  // Behind aperture → toward camera (portal at z≈0, camera at +z)
  stream.z = mix(-1.6 - shell * 0.8, 2.8 + aSeed.z * 1.2, pow(outward, 0.75));

  vec3 center = orbit;
  float glowPop = 0.0;
  float streak = 0.0;
  float trailAng = atan(orbit.y + 1e-4, orbit.x + 1e-4);

  if (rest > 0.001) {
    vec3 bang = bangExpand(orbit, re, uColors, aSeed, shell);
    bang = keepClear(bang, clearR);
    vec3 fromWarp = vec3(cos(rayAng), sin(rayAng), 0.0) * length(orbit.xy);
    fromWarp.z = mix(stream.z, orbit.z, re);
    fromWarp = keepClear(fromWarp, clearR);
    center = mix(fromWarp, bang, smoothstep(0.0, 0.55, re));
    center = mix(center, orbit, pow(re, 1.65));
    center = keepClear(center, clearR);
    glowPop = max(uGlow, rest * 0.85);
    streak = (1.0 - re) * 0.45;
    trailAng = atan(center.y + 1e-4, center.x + 1e-4);
  } else if (suck > 0.001) {
    float w = smoothstep(0.03, 0.42, suck);
    w = w * w * (3.0 - 2.0 * w);
    center = mix(orbit, stream, w);
    center = keepClear(center, clearR);
    // Brighter near the rim (source of the warp), streaks strengthen as they flee
    glowPop = fly * w * (0.35 + rimBias * 1.1 + outward * 0.35) + uGlow * 0.3;
    streak = fly * w * mix(0.7, 1.35, outward);
    trailAng = rayAng;
    vec2 radDir = normalize(center.xy + 1e-4);
    center.xy += radDir * streak * 0.5;
    center = keepClear(center, clearR);
  } else {
    center = orbit;
    glowPop = 0.0;
    streak = 0.0;
  }

  glowPop = max(glowPop, uGlow * step(0.02, suck + rest));

  // Hard hide anything that still sits in the keep-out disk
  float xyR = length(center.xy);
  float inClear = 1.0 - smoothstep(clearR * 0.92, clearR, xyR);

  vec4 mv = modelViewMatrix * vec4(center, 1.0);
  gl_Position = projectionMatrix * mv;

  float rank = fract(aSeed.x * 7.13 + aSeed.z * 3.91);
  float mid = pow(rank, 2.15);
  float lum = pow(rank, 4.4);

  float sz = mix(0.5, 1.25, mid) + lum * 2.9;
  sz = max(sz, step(0.001, rest) * (1.1 + lum * 2.2));
  sz *= 1.0 + streak * 4.2;
  sz *= 2.4 * uPixelRatio;
  sz *= 1.0 - inClear;
  gl_PointSize = clamp(sz * (2.8 / max(0.6, -mv.z)), 0.0, 80.0);

  float calm = 1.0 - clamp(max(suck, rest) * 1.15, 0.0, 1.0);
  float twPhase = uTime * (1.15 + aSeed.x * 4.2) + aSeed.y * 6.28318;
  float twinkle = 1.0 + (0.05 + lum * 0.16) * sin(twPhase) * calm;

  float baseDim = 0.1 + 0.22 * mid + 0.78 * lum;
  vDim = baseDim * twinkle * (1.0 - inClear);
  vDim = max(vDim, glowPop * 0.9);
  vDim *= 1.0 + streak * 0.5;
  vGlow = glowPop * (1.05 + lum * 0.85) * (1.0 - inClear);
  vPick = aSeed.x;
  vStreak = streak * (1.0 - inClear);
  vTemp = clamp(0.22 + fract(aSeed.z * 5.17 + aSeed.x * 2.63) * 0.78, 0.0, 1.0);
  vLum = lum;
  vTrailAng = trailAng;
}
`;

const fragment = /* glsl */ `
precision highp float;
varying float vDim;
varying float vGlow;
varying float vPick;
varying float vStreak;
varying float vTemp;
varying float vLum;
varying float vTrailAng;
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

vec3 spectralTint(float t) {
  vec3 kStar = vec3(1.00, 0.70, 0.48);
  vec3 gStar = vec3(1.00, 0.93, 0.78);
  vec3 aStar = vec3(0.86, 0.91, 1.00);
  vec3 bStar = vec3(0.62, 0.76, 1.00);
  if (t < 0.32) return mix(kStar, gStar, t / 0.32);
  if (t < 0.62) return mix(gStar, aStar, (t - 0.32) / 0.30);
  return mix(aStar, bStar, (t - 0.62) / 0.38);
}

void main(){
  if (vDim < 0.001 && vStreak < 0.001) discard;

  float st = clamp(vStreak, 0.0, 1.0);

  // +Y = outward from portal; wake trails back toward the gate
  float ca = cos(vTrailAng);
  float sa = sin(vTrailAng);
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  vec2 p = vec2(uv.x * ca + uv.y * sa, -uv.x * sa + uv.y * ca);

  float thin = mix(1.0, 0.12, st);
  p.x /= thin;
  float d = length(p);
  if (d > 1.2 && st < 0.02) discard;
  if (abs(p.x) > 1.25 || abs(p.y) > 1.3) discard;

  float core = exp(-d * d * 7.0);
  float halo = exp(-d * d * mix(2.4, 1.6, vLum)) * mix(0.35, 0.55, vLum);
  float spark = pow(max(0.0, 1.0 - d), 10.0);

  // Bright outer tip, soft afterimage toward portal (inward = -Y)
  float tip = exp(-p.x * p.x * 24.0) * exp(-pow(max(0.0, p.y), 2.0) * 5.5);
  float wake = exp(-p.x * p.x * mix(10.0, 32.0, st))
    * exp(-pow(max(0.0, -p.y), 1.25) * mix(5.5, 0.9, st))
    * smoothstep(1.2, -0.15, p.y);
  float trail = mix(0.0, tip * 0.9 + wake, st);

  float shape = core + halo + spark * (0.35 + vLum * 0.35);
  shape = max(shape * (1.0 - st * 0.6), trail);

  vec3 tint;
  float n = floor(uColors + 0.001);
  if (n < 1.0) {
    vec3 spectral = spectralTint(vTemp);
    spectral = mix(spectral, vec3(1.0), vLum * 0.28);
    // Dimensional wash: violet-cyan rift light while warping
    vec3 rift = mix(spectral, vec3(0.55, 0.72, 1.0), 0.45);
    rift = mix(rift, vec3(0.72, 0.45, 1.0), st * 0.35);
    tint = mix(spectral, rift, st * 0.8);
  } else {
    float slot = floor(fract(vPick * 1.718) * n);
    tint = paletteColor(slot);
  }

  float lit = vDim * 1.15 + vGlow * 2.4;
  vec3 col = tint * shape * lit;
  col += tint * spark * vGlow * 1.8;
  col += tint * trail * (0.5 + vDim) * (0.85 + st * 0.7);

  float alpha = clamp(
    shape * (vDim * 1.25 + vGlow * 0.85) + trail * (0.4 + vDim),
    0.0,
    1.0
  );
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
  const fieldTime = useRef(0);
  const particleCount = Math.max(500, Math.floor(count));

  useEffect(() => {
    if (journey) return;
    resetSuction();
    fieldTime.current = 0;
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
      uClearR: { value: CLEAR_RADIUS },
    }),
    [],
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const un = mat.current.uniforms;
    const d = Math.min(delta, 0.05);
    un.uPixelRatio.value = Math.min(state.gl.getPixelRatio(), 2);
    un.uClearR.value = CLEAR_RADIUS;

    if (journey) {
      un.uTime.value = state.clock.elapsedTime;
      const frame = journey.director.getLayerFrame(journey.stageId);
      un.uSuck.value = THREE.MathUtils.smoothstep(frame.progress, 0.45, 1);
      un.uRestore.value = 0;
      un.uGlow.value = frame.progress * 0.35;
      un.uColors.value = 0;
      un.uLayerOpacity.value = frame.weight;
      return;
    }

    const frame = tickSuction(d);
    if (fieldTime.current <= 0) {
      fieldTime.current = state.clock.elapsedTime;
    }
    fieldTime.current += d * getFieldTimeScale();
    un.uTime.value = fieldTime.current;
    un.uSuck.value =
      frame.phase === 'restoring' ? 0 : frame.phase === 'crossing' ? 1 : frame.strength;
    un.uRestore.value = frame.restore;
    un.uGlow.value = frame.glow;
    un.uColors.value = frame.cycle;
    un.uLayerOpacity.value = 1;
  }, -1);

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
