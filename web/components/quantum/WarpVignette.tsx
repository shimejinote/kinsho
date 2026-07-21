'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import {
  getArrivalFreeze,
  getFlash,
  getGlow,
  getSuction,
  getSuctionPhase,
  getStillness,
} from './suctionInput';
import { getWarpDivePattern } from './warpPattern';
import { getProseField } from './proseField';
import { getGlyphStars, getMushroomField } from './glyphStarsMode';
import { getActiveSky } from './dailySky';

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

/**
 * Portal press immersion:
 * soft dark well at center + suck spiral in the empty corona
 * (just outside the portal, inside the star keep-out — no content there).
 * Spiral densifies the sky tint rather than painting opaque ink.
 */
const fragDark = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uWarp;
uniform float uTime;
uniform float uWell;
uniform float uVortex;
uniform float uSuckSpin;
uniform vec3 uDark;
uniform vec3 uSky;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.06;
  float r = length(p);
  float warp = clamp(uWarp, 0.0, 1.0);
  float spinAmt = clamp(uSuckSpin, 0.0, 1.0);
  if (warp < 0.002 && spinAmt < 0.002) discard;

  float ang = atan(p.y, p.x);

  // Soft circular well — darkest at portal (original immersion).
  float radius = mix(0.42, 0.72, warp) / max(0.35, uWell);
  float well = 1.0 - smoothstep(0.0, radius, r);
  well = pow(well, mix(1.15, 0.85, warp) * mix(1.0, 1.4, clamp(uWell - 1.0, 0.0, 1.0)));

  // Pattern vortex (maelstrom only): carve spiral into the well core.
  if (uVortex > 0.001) {
    float arms = 0.5 + 0.5 * sin(ang * 3.0 + r * 15.0 - uTime * 2.6);
    well *= mix(1.0, 0.5 + 0.85 * arms, uVortex * warp);
  }

  float breath = 0.94 + 0.06 * sin(uTime * 2.1 + r * 4.0);
  float aWell = well * warp * mix(0.55, 0.9, warp) * breath;

  // Soft suck spiral — corona only; densifies void rather than inking black.
  float corona = smoothstep(0.14, 0.22, r) * (1.0 - smoothstep(0.32, 0.46, r));
  float wind = ang * 5.0 - r * 22.0 - uTime * mix(2.4, 5.5, warp);
  float arms = pow(0.5 + 0.5 * sin(wind), 2.1);
  float wind2 = ang * 8.0 + r * 14.0 + uTime * mix(1.6, 4.0, warp);
  float coil = pow(0.5 + 0.5 * sin(wind2), 2.8);
  float swirl = corona * mix(arms, arms * 0.7 + coil * 0.45, 0.5) * spinAmt;
  swirl = clamp(swirl * mix(0.55, 0.85, warp), 0.0, 1.0);

  // Sky-matched density: slightly deeper than the day's void, not pure black.
  vec3 skyDeep = uSky * 0.55;
  vec3 wellCol = mix(uDark, mix(uDark, uSky, 0.35) + vec3(0.015, 0.03, 0.08), warp * 0.35);
  vec3 col = mix(wellCol, skyDeep, swirl * 0.55);
  float a = clamp(max(aWell, swirl * 0.42), 0.0, 0.88);

  gl_FragColor = vec4(col, a);
}
`;

const fragBright = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uWarp;
uniform float uTime;
uniform float uGain;
uniform float uWhite;
uniform float uFlash;
uniform float uVortex;
uniform vec3 uBright;

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= 1.06;
  float r = length(p);
  float warp = clamp(uWarp, 0.0, 1.0);
  float white = clamp(uWhite * uFlash, 0.0, 1.0);
  if (warp < 0.002 && white < 0.002) discard;

  // Outer lift — brighter toward the frame, hollow at the portal
  float outer = smoothstep(mix(0.22, 0.12, warp), 1.15, r);
  outer *= 1.0 - smoothstep(0.0, 0.2, 1.0 - r) * 0.15;
  float pulse = 0.9 + 0.1 * sin(uTime * 1.6 - r * 5.0);
  float a = outer * warp * mix(0.12, 0.42, warp) * pulse * uGain;

  // Maelstrom: glowing accretion arms counter-rotate in the periphery.
  if (uVortex > 0.001) {
    float ang = atan(p.y, p.x);
    float arms = 0.5 + 0.5 * sin(ang * 3.0 - r * 12.0 + uTime * 2.2);
    a *= mix(1.0, 0.4 + 1.25 * arms, uVortex * warp);
  }

  a = clamp(a, 0.0, 0.62);
  vec3 col = mix(uBright * 0.6, uBright, outer);

  // Lightspeed whiteout: flood the whole frame to white at flash peak.
  float bloom = white * (0.85 + 0.15 * r);
  col = mix(col, vec3(1.0), bloom);
  a = max(a, bloom * 0.97);

  gl_FragColor = vec4(col, a);
}
`;

function nextWarpAmount(delta: number, cur: number) {
  const dt = Math.min(delta, 0.05);
  const suck = getSuction();
  let fly = THREE.MathUtils.smoothstep(suck, 0.01, 0.82);
  fly = fly * fly * (3 - 2 * fly);
  if (getSuctionPhase() === 'restoring') {
    fly = Math.max(fly, 0.2 * getGlow());
  }
  if (getSuctionPhase() === 'crossing') {
    fly = Math.max(fly, 0.92);
  }
  fly = Math.min(1, fly + getGlow() * 0.05);
  fly *= 1 - getStillness() * 0.45;
  fly *= 1 - getArrivalFreeze() * 0.95;
  return THREE.MathUtils.lerp(cur, fly, 1 - Math.pow(0.014, dt));
}

const tmpDark = new THREE.Vector3();
const tmpBright = new THREE.Vector3();
const tmpSky = new THREE.Vector3();

/**
 * Screen-space immersion on portal press:
 * center well + soft sky-tinted spiral in the empty portal corona.
 */
export default function WarpVignette() {
  const darkMat = useRef<THREE.ShaderMaterial>(null);
  const brightMat = useRef<THREE.ShaderMaterial>(null);
  const amount = useRef(0);

  const darkUniforms = useMemo(
    () => ({
      uWarp: { value: 0 },
      uTime: { value: 0 },
      uWell: { value: 1 },
      uVortex: { value: 0 },
      uSuckSpin: { value: 0 },
      uDark: { value: new THREE.Vector3(0, 0, 0.02) },
      uSky: { value: new THREE.Vector3(0.012, 0.012, 0.031) },
    }),
    [],
  );
  const brightUniforms = useMemo(
    () => ({
      uWarp: { value: 0 },
      uTime: { value: 0 },
      uGain: { value: 1 },
      uWhite: { value: 0 },
      uFlash: { value: 0 },
      uVortex: { value: 0 },
      uBright: { value: new THREE.Vector3(0.42, 0.58, 0.98) },
    }),
    [],
  );

  useFrame((state, delta) => {
    amount.current = nextWarpAmount(delta, amount.current);
    const t = state.clock.elapsedTime;
    const proseDim = getGlyphStars() ? getProseField() : 0;
    const mush = getMushroomField();
    const w = amount.current * (1 - proseDim * 0.28);
    const vis = getWarpDivePattern().visual;
    const ease = 1 - Math.pow(0.02, Math.min(delta, 0.05));
    // Mycelial dive: warmer well + stronger corona spin (≠ glyph page dim)
    const vortex = (vis.vortex ?? 0) + (mush ? 0.55 * w : 0);
    const whiteout = vis.whiteout ?? 0;
    const flash = getFlash();
    // Corona suck spin — early and clear on first entry
    const suckSpin = Math.min(
      1,
      THREE.MathUtils.smoothstep(w, 0.03, 0.5) * 1.2 +
        THREE.MathUtils.smoothstep(w, 0.4, 0.9) * 0.25 +
        (mush ? 0.35 * w : 0),
    );
    if (darkMat.current) {
      darkMat.current.uniforms.uWarp.value = w;
      darkMat.current.uniforms.uTime.value = t;
      darkMat.current.uniforms.uSuckSpin.value = THREE.MathUtils.lerp(
        darkMat.current.uniforms.uSuckSpin.value as number,
        suckSpin * (1 - proseDim * 0.2),
        ease,
      );
      darkMat.current.uniforms.uWell.value = THREE.MathUtils.lerp(
        darkMat.current.uniforms.uWell.value as number,
        vis.wellTight * (mush ? 1.12 : 1),
        ease,
      );
      darkMat.current.uniforms.uVortex.value = THREE.MathUtils.lerp(
        darkMat.current.uniforms.uVortex.value as number,
        vortex * (1 - proseDim * 0.35),
        ease,
      );
      const skyLive = getActiveSky();
      const dark = mush
        ? [
            Math.min(1, vis.vigDark[0] * 0.7 + skyLive.starHeat[0] * 0.12),
            Math.min(1, vis.vigDark[1] * 0.7 + skyLive.starHeat[1] * 0.06),
            Math.min(1, vis.vigDark[2] * 0.85),
          ]
        : vis.vigDark;
      (darkMat.current.uniforms.uDark.value as THREE.Vector3).lerp(
        tmpDark.set(dark[0], dark[1], dark[2]),
        ease,
      );
      const bg = skyLive.background;
      (darkMat.current.uniforms.uSky.value as THREE.Vector3).lerp(
        tmpSky.set(bg[0], bg[1], bg[2]),
        ease,
      );
    }
    if (brightMat.current) {
      brightMat.current.uniforms.uWarp.value = w * (1 - proseDim * 0.3);
      brightMat.current.uniforms.uTime.value = t;
      brightMat.current.uniforms.uFlash.value = flash * (1 - proseDim * 0.35);
      brightMat.current.uniforms.uGain.value = THREE.MathUtils.lerp(
        brightMat.current.uniforms.uGain.value as number,
        vis.outerGain * (1 - proseDim * 0.3) * (mush ? 1.15 : 1),
        ease,
      );
      brightMat.current.uniforms.uWhite.value = THREE.MathUtils.lerp(
        brightMat.current.uniforms.uWhite.value as number,
        whiteout * (1 - proseDim * 0.3),
        ease,
      );
      brightMat.current.uniforms.uVortex.value = THREE.MathUtils.lerp(
        brightMat.current.uniforms.uVortex.value as number,
        vortex * (1 - proseDim * 0.35),
        ease,
      );
      const sky = getActiveSky();
      const bright = mush
        ? [
            THREE.MathUtils.lerp(vis.vigBright[0], sky.starHeat[0], 0.55),
            THREE.MathUtils.lerp(vis.vigBright[1], sky.starWarm[1], 0.5),
            THREE.MathUtils.lerp(vis.vigBright[2], sky.starHeat[2], 0.4),
          ]
        : vis.vigBright;
      (brightMat.current.uniforms.uBright.value as THREE.Vector3).lerp(
        tmpBright.set(bright[0], bright[1], bright[2]),
        ease,
      );
    }
  });

  return (
    <group>
      <mesh renderOrder={19} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={darkMat}
          vertexShader={vert}
          fragmentShader={fragDark}
          uniforms={darkUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </mesh>
      <mesh renderOrder={20} frustumCulled={false}>
        <planeGeometry args={[2, 2]} />
        <shaderMaterial
          ref={brightMat}
          vertexShader={vert}
          fragmentShader={fragBright}
          uniforms={brightUniforms}
          transparent
          depthTest={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
