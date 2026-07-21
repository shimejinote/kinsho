'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { JourneyDirector } from '../journey/JourneyDirector';
import type { JourneyStageId } from '../journey/timeline';
import { glslNoise } from './noise.glsl';
import { getActiveSky, mulberry32, type PickedSky } from './dailySky';
import { getFieldTimeScale, getCrossing, resetSuction, tickSuction } from './suctionInput';
import { getStarGenesis } from './voidGenesis';
import { loadGlyphAtlas, PROSE_TARGET, type GlyphAtlas } from './glyphAtlas';
import {
  getFieldMode,
  subscribeFieldMode,
} from './glyphStarsMode';
import { resetProseField, setProseField } from './proseField';
import {
  disposeSporeTextures,
  loadSporeTextures,
  type SporeTextures,
} from './sporeTextures';

/**
 * Starfield motes (GPU points).
 * Glyph mode: same orbits as the starfield; each mote is a letter. On dive the
 * Glyph / mushroom modes: same orbits; dive enlarges readability while
 * gravitational lensing bends paths and both spiral into the central hole.
 */
const DEFAULT_COUNT = PROSE_TARGET;

/** World-space radius around the portal where stars must not appear. */
const CLEAR_RADIUS = 0.78;

const EMPTY_TEX = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
  t.colorSpace = THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
})();

const vertex = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uSuck;
uniform float uRestore;
uniform float uGlow;
uniform float uPixelRatio;
uniform float uColors;
uniform float uClearR;
uniform float uSpeedScale;
uniform float uYAmpScale;
uniform float uSizeScale;
uniform float uTwinkleScale;
uniform float uRadiusMin;
uniform float uRadiusSpan;
uniform float uShellPow;
uniform float uStretchLo;
uniform float uStretchHi;
uniform float uZBias;
uniform float uNoiseAmp;
uniform float uYPhase;
uniform float uSpinSign;
uniform float uRadiusJitter;
uniform float uGenesis;
uniform float uGlyphOn;
uniform float uMushroomOn;
uniform float uProse;
uniform float uSporeBloom;
uniform float uDissolve;
uniform float uProseCount;
attribute float aProse;
attribute float aGlyphId;
attribute float aOrder;
varying float vDim;
varying float vGlow;
varying float vPick;
varying float vStreak;
varying float vTemp;
varying float vLum;
varying float vTrailAng;
varying float vGlyph;
varying float vProseVis;
varying float vSettle;
varying float vSporeKind;
varying float vSpin;

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
  vProseVis = 1.0;
  vGlyph = 0.0;
  vSettle = 0.0;
  float id = aSeed.x * 6.2831853;
  float shell = pow(aSeed.y, uShellPow);
  float speed = (0.006 + aSeed.z * 0.012) * uSpeedScale;

  float jitter = (aSeed.z - 0.5) * uRadiusJitter;
  float radius = uRadiusMin + shell * uRadiusSpan * (1.0 + jitter);
  float stretch = mix(uStretchLo, uStretchHi, fract(aSeed.z * 4.91 + aSeed.x));
  float t = uTime * speed * uSpinSign + id;
  vec3 orbit;
  orbit.x = cos(t) * radius;
  orbit.z = sin(t) * radius * stretch + uZBias;
  orbit.y =
    sin(t * uYPhase + shell * 9.0) * radius * 0.4 * uYAmpScale
    + (aSeed.x - 0.5) * radius * 0.12
    + 0.1;

  vec3 np = orbit * 0.25 + vec3(0.0, uTime * 0.008, aSeed.x * 3.0);
  orbit += vec3(snoise(np), snoise(np + 21.0), snoise(np + 54.0)) * uNoiseAmp;
  orbit = keepClear(orbit, uClearR);

  float suck = clamp(uSuck, 0.0, 1.0);
  float rest = clamp(uRestore, 0.0, 1.0);
  float re = rest * rest * (3.0 - 2.0 * rest);

  // Dive ramps: lensing first, then infall past the photon ring
  float dive = smoothstep(0.04, 0.92, suck);
  dive = dive * dive * dive;
  float fly = dive * pow(suck, 1.85);
  float lens = smoothstep(0.02, 0.55, suck);
  lens = lens * lens * (3.0 - 2.0 * lens);
  // Late absorb — stars/glyphs cross the photon sphere into the hole
  float pinch = pow(smoothstep(0.22, 0.98, suck), 1.35);
  float absorb = pinch * pinch * (3.0 - 2.0 * pinch);

  float rayAng = aSeed.x * 6.2831853 + aSeed.z * 1.7;
  float clearR = uClearR;

  // Pick mushroom/spore kind early — dive motion depends on it
  float sporeKind = 0.0;
  if (uMushroomOn > 0.5) {
    float roll = fract(aSeed.x * 7.13 + aSeed.z * 3.91 + aSeed.y * 1.7);
    if (roll < 0.26) sporeKind = 0.0;
    else if (roll < 0.44) sporeKind = 1.0;
    else if (roll < 0.60) sporeKind = 2.0;
    else if (roll < 0.74) sporeKind = 3.0;
    else if (roll < 0.82) sporeKind = 5.0;
    else if (roll < 0.89) sporeKind = 7.0;
    else if (roll < 0.95) sporeKind = 4.0;
    else sporeKind = 6.0;
  }

  vec3 center = orbit;
  float glowPop = 0.0;
  float streak = 0.0;
  float trailAng = atan(orbit.y + 1e-4, orbit.x + 1e-4);

  float sporeBloom = 0.0;
  if (uMushroomOn > 0.5) {
    float sb = clamp(uSporeBloom, 0.0, 1.0);
    sporeBloom = sb * sb * (3.0 - 2.0 * sb);
  }

  if (rest > 0.001) {
    vec3 bang = bangExpand(orbit, re, uColors, aSeed, shell);
    bang = keepClear(bang, clearR);
    // Rebirth from the swallowed state near the horizon
    vec3 fromHole = vec3(cos(rayAng), sin(rayAng), 0.0)
      * mix(0.02, length(orbit.xy), pow(re, 0.65));
    fromHole.z = mix(0.0, orbit.z, re);
    fromHole = keepClear(fromHole, clearR * smoothstep(0.15, 0.7, re));
    center = mix(fromHole, bang, smoothstep(0.0, 0.55, re));
    center = mix(center, orbit, pow(re, 1.65));
    center = keepClear(center, clearR);
    glowPop = max(uGlow, rest * 0.85);
    streak = (1.0 - re) * 0.45;
    trailAng = atan(center.y + 1e-4, center.x + 1e-4);
  } else if (suck > 0.001) {
    // --- Gravitational lens + infall (Schwarzschild-flavored) ---
    vec2 xy0 = orbit.xy;
    float b0 = max(length(xy0), 1e-4);
    float ang0 = atan(xy0.y, xy0.x);

    float rs = clearR * 0.38;   // horizon scale
    float rPh = clearR * 0.70;  // photon-ring pile-up just outside the seal
    float impact = rs / max(b0, rs * 0.32);
    float deflect = lens * impact * (0.55 + absorb * 1.1);

    // Frame dragging: light paths wind around the hole
    float drag = lens * (1.15 + absorb * 3.8) * impact;
    float ang = ang0
      - drag * (0.6 + shell * 0.55)
      - log(b0 / max(rPh, 1e-3) + 1.0) * lens * 1.45 * (0.45 + aSeed.z);

    // Radial compression toward the photon ring, then fall to center
    float bLens = b0 * (1.0 - deflect * 0.58);
    float ringW = exp(-pow((b0 - rPh) * 2.35, 2.0)) * lens * (1.0 - absorb);
    bLens = mix(bLens, mix(b0, rPh, 0.72), ringW * 0.58);
    // Tangential shear near the critical orbit (Einstein-ring stretch)
    ang += sin(ang0 * 3.0 + uTime * 1.6 + shell * 4.0) * ringW * 0.14;

    ang -= absorb * (2.6 + shell * 2.2 + aSeed.x * 1.4);
    float bFall = mix(bLens, 0.0, absorb);
    bFall = max(bFall, 0.008 * (1.0 - absorb));

    center.x = cos(ang) * bFall;
    center.y = sin(ang) * bFall;
    center.z = mix(orbit.z, mix(-0.12, 0.06, aSeed.z), absorb);

    // Open the keep-out as matter crosses the horizon
    float clearGate = mix(1.0, 0.04, absorb);
    center = keepClear(center, clearR * clearGate);

    // Shear streaks while lensing; radial infall streaks when absorbed
    float shear = lens * (1.0 - absorb) * (0.35 + impact * 0.9);
    float infall = absorb * (0.75 + fly * 0.55);
    streak = (shear * 0.9 + infall * 1.25) * max(fly, lens * 0.65);
    // Motion toward center → wake trails outward (+radial)
    trailAng = ang + 3.14159265;

    glowPop = lens * (0.22 + ringW * 1.35)
      + absorb * (0.5 + fly * 0.45)
      + uGlow * 0.3;
    glowPop += ringW * 0.85 * (1.0 - absorb * 0.45);

    // --- Mushroom ritual: long spiral, late soft crush (≠ glyph / white pile) ---
    if (uMushroomOn > 0.5) {
      // Crush only late — bloom alone must not yank everything to the hole
      float mushCrush = pow(smoothstep(0.38, 0.99, absorb), 1.85);
      mushCrush = mushCrush * mushCrush * (3.0 - 2.0 * mushCrush);

      // Bodies shed into spores as bloom rises
      if (sporeKind < 0.5 && sporeBloom > 0.22) {
        float shed = smoothstep(0.22, 0.82, sporeBloom);
        if (fract(aSeed.y * 13.7 + aSeed.x) < shed * 0.88) {
          sporeKind = 1.0 + floor(fract(aSeed.z * 5.3) * 3.0); // a/b/c
        }
      }
      // Late dive: prefer trails & sparks
      if (sporeBloom > 0.55 && sporeKind > 0.5 && fract(aSeed.x * 9.1) > 0.55) {
        sporeKind = mix(4.0, 7.0, step(0.5, fract(aSeed.z * 3.3)));
      }

      float burst = sin(clamp(sporeBloom, 0.0, 1.0) * 3.14159265);
      float isBody = 1.0 - step(0.5, sporeKind);
      vec2 xy = center.xy;
      float br = max(length(xy), 1e-4);
      float bang = atan(xy.y, xy.x);

      // Soft outward spray early; hold radius while spiraling
      float kick = burst * mix(0.85, 0.12, isBody) * (0.35 + shell * 0.9 + aSeed.y);
      br += kick * (1.0 - mushCrush) * clearR * 0.42;
      // Drift inward gradually with bloom (not a snap)
      br *= mix(1.0, 0.62, sporeBloom * (1.0 - mushCrush) * 0.55);

      // Slow mycelial helix — readable spiral before the vacuum
      bang -= sporeBloom * (2.1 + aSeed.x * 2.8) * mix(1.0, 0.4, isBody);
      bang -= mushCrush * (1.8 + aSeed.y * 1.2);
      bang += sin(uTime * 1.6 + shell * 6.0) * burst * 0.22;

      // Soft floor — avoid stacking every mote on one pixel
      br *= mix(1.0, 0.06 + aSeed.z * 0.05, mushCrush);
      center.xy = vec2(cos(bang), sin(bang)) * max(br, 0.012 + (1.0 - mushCrush) * 0.02);
      center.z = mix(center.z, mix(-0.14, 0.08, aSeed.z), sporeBloom * 0.45 + mushCrush * 0.35);

      streak = max(streak, burst * 0.7 + mushCrush * 0.85);
      trailAng = bang + 3.14159265;
      // Keep glow modest so additive blend doesn't bleach into a white clot
      glowPop = mix(glowPop * 0.55, burst * 0.45 + mushCrush * 0.35, 0.65);
    }
  } else {
    center = orbit;
    glowPop = 0.0;
    streak = 0.0;
  }

  glowPop = max(glowPop, uGlow * step(0.02, suck + rest));

  // Boot: universe births from the portal — staggered outward bloom
  float birth = fract(aSeed.x * 4.17 + aSeed.y * 2.91 + aSeed.z * 1.53);
  float gGate = smoothstep(birth * 0.62, birth * 0.62 + 0.38, clamp(uGenesis, 0.0, 1.0));
  gGate = gGate * gGate * (3.0 - 2.0 * gGate);
  center = mix(vec3(0.0), center, gGate);

  // Glyph: enlarge for readability. Mushroom: puff spores then crush (not the same).
  float reveal = 0.0;
  if (uGlyphOn > 0.5) {
    float t = clamp(uProse, 0.0, 1.0);
    reveal = t * t * (3.0 - 2.0 * t);
  }

  // Keep-out only while still outside; absorb opens the disk into the hole
  float xyR = length(center.xy);
  float inClear =
    (1.0 - smoothstep(clearR * 0.92, clearR, xyR))
    * (1.0 - absorb)
    * (1.0 - step(0.001, rest));

  vec4 mv = modelViewMatrix * vec4(center, 1.0);
  gl_Position = projectionMatrix * mv;

  float rank = fract(aSeed.x * 7.13 + aSeed.z * 3.91);
  float mid = pow(rank, 2.15);
  float lum = pow(rank, 4.4);

  float sz = mix(0.5, 1.25, mid) + lum * 2.9;
  sz = max(sz, step(0.001, rest) * (1.1 + lum * 2.2));
  sz *= 1.0 + streak * 4.2;
  // Collapse into the horizon — shrink hard late in the dive
  sz *= mix(1.0, 0.06 + mid * 0.1, absorb);
  sz *= uSizeScale;
  sz *= mix(1.0, 1.15, uGlyphOn);
  // Mushroom field: bodies + smaller spores / occasional clouds
  if (uMushroomOn > 0.5) {
    // Dive streaks prefer trail sprites
    if (streak > 0.18 && sporeKind > 0.5) sporeKind = 4.0;

    float kindScale = 1.0;
    if (sporeKind < 0.5) kindScale = 1.0;
    else if (sporeKind < 3.5) kindScale = 0.36;
    else if (sporeKind < 4.5) kindScale = 0.72;
    else if (sporeKind < 5.5) kindScale = 0.48;
    else if (sporeKind < 6.5) kindScale = 1.25;
    else kindScale = 0.55;
    // Per-mote size jitter so the field doesn't look stamped
    kindScale *= mix(0.72, 1.28, fract(aSeed.z * 9.17 + aSeed.x * 2.3));
    sz *= 1.85 * kindScale;
    // Fade size early on approach so the hole never reads as a white clot
    float mushFade = pow(smoothstep(0.28, 0.95, absorb), 1.25);
    sz *= mix(1.0, 0.08 + mid * 0.06, mushFade);
  }
  sz *= 2.4 * uPixelRatio;
  sz *= 1.0 - inClear;
  sz *= mix(0.15, 1.0, gGate);

  float depthScale = 2.8 / max(0.55, -mv.z);
  float starPx = clamp(sz * depthScale, 0.0, 80.0);
  // Glyph: enlarge letters. Mushroom: bodies shrink / spores puff then crush.
  float enlarge = 1.0;
  if (uGlyphOn > 0.5) {
    enlarge = mix(1.0, 3.8, reveal * (1.0 - absorb * 0.92));
  } else if (uMushroomOn > 0.5) {
    float isBody = 1.0 - step(0.5, sporeKind);
    float puff = sin(sporeBloom * 3.14159265) * (1.0 - isBody) * 0.85;
    float bodyShrink = mix(1.0, 0.42, sporeBloom * isBody);
    float crushSz = pow(smoothstep(0.4, 1.0, absorb), 1.6);
    enlarge = bodyShrink * (1.0 + puff) * mix(1.0, 0.12, crushSz);
  }
  gl_PointSize = clamp(starPx * enlarge, 0.0, 96.0);

  float calm = 1.0 - clamp(max(suck, rest) * 1.15, 0.0, 1.0);
  float twPhase = uTime * (1.15 + aSeed.x * 4.2) + aSeed.y * 6.28318;
  float twinkle = 1.0 + (0.05 + lum * 0.16) * sin(twPhase) * calm * uTwinkleScale;

  float baseDim = 0.1 + 0.22 * mid + 0.78 * lum;
  vDim = baseDim * twinkle * (1.0 - inClear);
  vDim = max(vDim, glowPop * 0.9);
  vDim *= 1.0 + streak * 0.5;
  vDim *= mix(1.0, 0.12, absorb * absorb);
  vDim *= gGate;
  // Slightly brighter as letters enlarge into focus
  vDim *= mix(1.0, 1.25, reveal * uGlyphOn);
  // Mushroom: gentle bloom lift, then dim hard before the hole (no white clot)
  if (uMushroomOn > 0.5) {
    float mushDim = pow(smoothstep(0.25, 0.92, absorb), 1.35);
    vDim *= mix(1.0, 1.08 + sporeBloom * 0.22, 1.0 - mushDim);
    vDim *= mix(1.0, 0.05, mushDim);
  }
  vGlow = glowPop * (1.05 + lum * 0.85) * (1.0 - inClear);
  vPick = aSeed.x;
  vStreak = streak * (1.0 - inClear);
  vTemp = clamp(0.22 + fract(aSeed.z * 5.17 + aSeed.x * 2.63) * 0.78, 0.0, 1.0);
  vLum = lum;
  vTrailAng = trailAng;
  vGlyph = aGlyphId;
  vProseVis = max(uGlyphOn, uMushroomOn);
  vSettle = mix(0.2, 1.0, reveal) * uGlyphOn + sporeBloom * uMushroomOn;
  vSporeKind = sporeKind;
  // Unique tilt per mote (+ frantic spin during spore bloom)
  float spin = fract(aSeed.y * 5.91 + aSeed.x * 2.37 + aSeed.z * 1.13) * 6.2831853;
  spin += (aSeed.z - 0.5) * 1.4;
  float tumble = uTime * mix(0.12, 0.85, fract(aSeed.x * 4.7)) * (0.35 + aSeed.y);
  tumble *= uMushroomOn * (1.0 - smoothstep(0.08, 0.45, streak));
  tumble += sporeBloom * uTime * (2.8 + aSeed.y * 3.5) * uMushroomOn;
  vSpin = spin + tumble;
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
varying float vGlyph;
varying float vProseVis;
varying float vSettle;
varying float vSporeKind;
varying float vSpin;
uniform float uColors;
uniform float uLayerOpacity;
uniform vec3 uStarCool;
uniform vec3 uStarWarm;
uniform vec3 uStarHeat;
uniform sampler2D uAtlas;
uniform float uGlyphOn;
uniform float uMushroomOn;
uniform sampler2D uMushroom;
uniform sampler2D uSporeA;
uniform sampler2D uSporeB;
uniform sampler2D uSporeC;
uniform sampler2D uSporeTrail;
uniform sampler2D uSporeCloud;
uniform sampler2D uSporeDrip;
uniform sampler2D uSporeSpark;
uniform float uProse;
uniform float uAtlasCols;
uniform float uAtlasRows;
uniform float uGlyphCount;

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
  if (vDim < 0.001 && vStreak < 0.001) discard;

  float st = clamp(vStreak, 0.0, 1.0);

  // +Y = outward from portal; wake trails back toward the gate
  float ca = cos(vTrailAng);
  float sa = sin(vTrailAng);
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  vec2 p = vec2(uv.x * ca + uv.y * sa, -uv.x * sa + uv.y * ca);

  // Warp streaks — shaped modes skip meteor needles
  float shaped = max(step(0.5, uGlyphOn), step(0.5, uMushroomOn));
  float meteor = step(0.001, st) * (1.0 - shaped);
  float thin = mix(1.0, mix(0.12, 0.055, meteor), st);
  p.x /= thin;
  float d = length(p);
  if (d > 1.2 && st < 0.02 && shaped < 0.5) discard;
  if (abs(p.x) > 1.25 || abs(p.y) > 1.3) discard;

  float core = exp(-d * d * 7.0);
  float halo = exp(-d * d * mix(2.4, 1.6, vLum)) * mix(0.35, 0.55, vLum);
  float spark = pow(max(0.0, 1.0 - d), 10.0);

  // Bright head forward (+Y), long fading train behind
  float tip = exp(-p.x * p.x * 28.0) * exp(-pow(max(0.0, p.y), 2.0) * 6.5);
  float wake = exp(-p.x * p.x * mix(10.0, 36.0, st))
    * exp(-pow(max(0.0, -p.y), mix(1.25, 0.85, meteor)) * mix(5.5, 0.35, st))
    * smoothstep(mix(1.2, 1.55, meteor), -0.35, p.y);
  float trail = mix(0.0, tip * 1.15 + wake * mix(1.0, 1.55, meteor), st);
  trail *= 1.0 + meteor * 1.15;

  float shape = core + halo + spark * (0.35 + vLum * 0.35);
  shape = max(shape * (1.0 - st * 0.6), trail);

  // Glyph mode: always glyph-shaped (prose never waits to "ink in")
  if (uGlyphOn > 0.5) {
    float gi = floor(vGlyph + 0.001);
    float gcol = mod(gi, uAtlasCols);
    float grow = floor(gi / uAtlasCols);
    float pad = mix(0.04, 0.01, vSettle);
    vec2 gp = clamp(gl_PointCoord, 0.001 + pad, 0.999 - pad);
    gp = (gp - 0.5) / mix(0.82, 0.92, vSettle) + 0.5;
    gp = clamp(gp, 0.001, 0.999);
    vec2 cell = (vec2(gcol, grow) + gp) / vec2(uAtlasCols, uAtlasRows);
    float glyph = texture2D(uAtlas, cell).a;
    float edge = mix(0.32, 0.52, vSettle);
    float glyphShape = smoothstep(0.06, edge, glyph) * (1.05 + vLum * 0.35)
      + core * mix(0.18, 0.08, vSettle);
    shape = mix(shape, glyphShape, 1.0);
  }

  // Mushroom field: shimeji bodies + spore sprites from /images/spores
  vec3 mushTint = vec3(-1.0);
  if (uMushroomOn > 0.5) {
    float kind = floor(vSporeKind + 0.001);

    // Per-particle spin (and optional mirror) — breaks the stamped look
    float spin = vSpin;
    float caS = cos(spin);
    float saS = sin(spin);
    vec2 pc = gl_PointCoord - 0.5;
    vec2 rp = vec2(pc.x * caS - pc.y * saS, pc.x * saS + pc.y * caS);
    if (fract(vPick * 11.3) > 0.5) rp.x = -rp.x;
    vec2 mp = vec2(rp.x + 0.5, 1.0 - (rp.y + 0.5));

    // Trail / spark while streaking: mostly follow motion, keep a bit of unique twist
    if ((kind > 3.5 && kind < 4.5) || (kind > 6.5 && st > 0.12)) {
      float ca2 = cos(vTrailAng + spin * 0.25);
      float sa2 = sin(vTrailAng + spin * 0.25);
      vec2 q = gl_PointCoord * 2.0 - 1.0;
      vec2 r = vec2(q.x * ca2 + q.y * sa2, -q.x * sa2 + q.y * ca2);
      vec2 aligned = vec2(r.y * 0.5 + 0.5, 1.0 - (r.x * 0.5 + 0.5));
      mp = mix(mp, aligned, smoothstep(0.08, 0.4, st));
    }

    if (kind < 0.5) {
      float aspect = 0.74;
      mp.x = (mp.x - 0.5) / aspect + 0.5;
      float inFrame = step(0.0, mp.x) * step(mp.x, 1.0) * step(0.0, mp.y) * step(mp.y, 1.0);
      vec4 mushTex = texture2D(uMushroom, clamp(mp, 0.001, 0.999));
      float mush = max(mushTex.a, mushTex.r) * inFrame;
      shape = smoothstep(0.08, 0.42, mush) * (1.05 + vLum * 0.3);
      trail *= 0.12;
      float t = fract(vPick * 2.6180339 + vLum * 0.37);
      float t2 = fract(vPick * 7.13 + vTemp * 1.1);
      vec3 band = t < 0.5
        ? mix(uStarCool, uStarWarm, t * 2.0)
        : mix(uStarWarm, uStarHeat, (t - 0.5) * 2.0);
      mushTint = mix(band, mix(uStarHeat, uStarCool, t2), 0.32);
      mushTint = mix(mushTint, mushTint * mushTint * vec3(1.12, 1.08, 1.15), 0.22);
    } else {
      vec4 spore;
      if (kind < 1.5) spore = texture2D(uSporeA, clamp(mp, 0.001, 0.999));
      else if (kind < 2.5) spore = texture2D(uSporeB, clamp(mp, 0.001, 0.999));
      else if (kind < 3.5) spore = texture2D(uSporeC, clamp(mp, 0.001, 0.999));
      else if (kind < 4.5) spore = texture2D(uSporeTrail, clamp(mp, 0.001, 0.999));
      else if (kind < 5.5) spore = texture2D(uSporeDrip, clamp(mp, 0.001, 0.999));
      else if (kind < 6.5) spore = texture2D(uSporeCloud, clamp(mp, 0.001, 0.999));
      else spore = texture2D(uSporeSpark, clamp(mp, 0.001, 0.999));

      float sporeA = spore.a;
      // Ignore any residual near-gray plate (baked checker leftovers)
      float chroma = max(spore.r, max(spore.g, spore.b)) - min(spore.r, min(spore.g, spore.b));
      float plate = (1.0 - smoothstep(0.02, 0.12, chroma))
        * (1.0 - smoothstep(0.85, 1.0, max(spore.r, max(spore.g, spore.b))));
      sporeA *= 1.0 - plate * 0.95;
      shape = smoothstep(0.02, 0.45, sporeA) * (0.95 + vLum * 0.35);
      trail *= 0.08;
      vec3 skyLean = mix(uStarCool, mix(uStarWarm, uStarHeat, fract(vPick * 3.1)), fract(vPick * 5.7));
      mushTint = mix(spore.rgb, spore.rgb * skyLean * 1.4, 0.38);
      mushTint = max(mushTint, vec3(0.06));
    }
  }

  vec3 tint;
  float n = floor(uColors + 0.001);
  if (mushTint.x >= 0.0) {
    tint = mushTint;
  } else if (n < 1.0) {
    vec3 cool = mix(uStarCool, uStarWarm, clamp(vDim * 1.1, 0.0, 1.0));
    float heat = clamp(st * 0.85 + meteor * st * 0.55, 0.0, 1.0);
    tint = mix(cool, uStarHeat, heat);
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
  sky?: PickedSky;
  journey?: {
    director: JourneyDirector;
    stageId: JourneyStageId;
  };
};

export default function ParticleSwarm({
  journey,
  sky: skyProp,
  count = DEFAULT_COUNT,
}: ParticleSwarmProps = {}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const fieldTime = useRef(0);
  const typeAge = useRef(0);
  const sky = skyProp ?? getActiveSky();
  const [atlas, setAtlas] = useState<GlyphAtlas | null>(null);
  const [mushroomTex, setMushroomTex] = useState<THREE.Texture | null>(null);
  const [sporeTex, setSporeTex] = useState<SporeTextures | null>(null);
  // When atlas is ready, use every prose letter (full ~50k field).
  const particleCount = atlas?.letters.length
    ? atlas.letters.length
    : Math.max(
        500,
        Math.floor(count * (journey ? 1 : sky.densityScale)),
      );

  useEffect(() => {
    if (journey) return;
    resetSuction();
    resetProseField();
    fieldTime.current = 0;
    typeAge.current = 0;
    return () => {
      resetSuction();
      resetProseField();
    };
  }, [journey]);

  useEffect(() => {
    if (journey) return;
    let alive = true;
    loadGlyphAtlas()
      .then((a) => {
        if (alive) setAtlas(a);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [journey]);

  useEffect(() => {
    if (journey) return;
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      '/images/shimeji-silhouette.png',
      (tex) => {
        if (!alive) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.NoColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        tex.needsUpdate = true;
        setMushroomTex(tex);
      },
      undefined,
      () => {},
    );
    loadSporeTextures()
      .then((tex) => {
        if (!alive) {
          disposeSporeTextures(tex);
          return;
        }
        setSporeTex(tex);
      })
      .catch(() => {});
    return () => {
      alive = false;
      setMushroomTex((prev) => {
        prev?.dispose();
        return null;
      });
      setSporeTex((prev) => {
        disposeSporeTextures(prev);
        return null;
      });
    };
  }, [journey]);

  const { positions, seeds, proseFlags, glyphIds, orders } = useMemo(() => {
    const rng = mulberry32(sky.seed ^ 0x5f3759df);
    const positions = new Float32Array(particleCount * 3);
    const seeds = new Float32Array(particleCount * 3);
    const proseFlags = new Float32Array(particleCount);
    const glyphIds = new Float32Array(particleCount);
    const orders = new Float32Array(particleCount);
    const letters = atlas?.letters ?? [];
    const atlasCount = Math.max(1, atlas?.count ?? 1);
    const proseN = letters.length;

    for (let i = 0; i < particleCount; i++) {
      seeds[i * 3 + 0] = rng();
      seeds[i * 3 + 1] = rng();
      seeds[i * 3 + 2] = rng();
      if (i < proseN) {
        const L = letters[i]!;
        proseFlags[i] = 1;
        glyphIds[i] = L.atlasIndex;
        orders[i] = L.order;
      } else {
        proseFlags[i] = 0;
        glyphIds[i] = Math.floor(rng() * atlasCount);
        orders[i] = 0;
      }
    }
    return { positions, seeds, proseFlags, glyphIds, orders };
  }, [particleCount, sky.seed, atlas]);

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
      uSpeedScale: { value: sky.speedScale },
      uYAmpScale: { value: sky.yAmpScale },
      uSizeScale: { value: sky.sizeScale },
      uTwinkleScale: { value: sky.twinkleScale },
      uStarCool: { value: new THREE.Vector3(...sky.starCool) },
      uStarWarm: { value: new THREE.Vector3(...sky.starWarm) },
      uStarHeat: { value: new THREE.Vector3(...sky.starHeat) },
      uRadiusMin: { value: sky.field.radiusMin },
      uRadiusSpan: { value: sky.field.radiusSpan },
      uShellPow: { value: sky.field.shellPow },
      uStretchLo: { value: sky.field.stretchLo },
      uStretchHi: { value: sky.field.stretchHi },
      uZBias: { value: sky.field.zBias },
      uNoiseAmp: { value: sky.field.noiseAmp },
      uYPhase: { value: sky.field.yPhase },
      uSpinSign: { value: sky.field.spinSign },
      uRadiusJitter: { value: sky.field.radiusJitter },
      uGenesis: { value: 1 },
      uAtlas: { value: EMPTY_TEX },
      uGlyphOn: { value: 0 },
      uMushroomOn: { value: 0 },
      uMushroom: { value: EMPTY_TEX },
      uSporeA: { value: EMPTY_TEX },
      uSporeB: { value: EMPTY_TEX },
      uSporeC: { value: EMPTY_TEX },
      uSporeTrail: { value: EMPTY_TEX },
      uSporeCloud: { value: EMPTY_TEX },
      uSporeDrip: { value: EMPTY_TEX },
      uSporeSpark: { value: EMPTY_TEX },
      uAtlasCols: { value: 16 },
      uAtlasRows: { value: 1 },
      uGlyphCount: { value: 1 },
      uProse: { value: 0 },
      uSporeBloom: { value: 0 },
      uDissolve: { value: 0 },
      uProseCount: { value: 1 },
    }),
    [sky],
  );

  useEffect(() => {
    if (journey) return;
    const applyFieldMode = () => {
      if (!mat.current) return;
      const mode = getFieldMode();
      mat.current.uniforms.uGlyphOn.value =
        atlas && mode === 'glyphs' ? 1 : 0;
      mat.current.uniforms.uMushroomOn.value =
        mushroomTex && mode === 'mushrooms' ? 1 : 0;
    };
    if (atlas && mat.current) {
      const un = mat.current.uniforms;
      un.uAtlas.value = atlas.texture;
      un.uAtlasCols.value = atlas.cols;
      un.uAtlasRows.value = atlas.rows;
      un.uGlyphCount.value = atlas.count;
      un.uProseCount.value = atlas.letters.length;
    }
    if (mushroomTex && mat.current) {
      mat.current.uniforms.uMushroom.value = mushroomTex;
    }
    if (sporeTex && mat.current) {
      const un = mat.current.uniforms;
      un.uSporeA.value = sporeTex.a;
      un.uSporeB.value = sporeTex.b;
      un.uSporeC.value = sporeTex.c;
      un.uSporeTrail.value = sporeTex.trail;
      un.uSporeCloud.value = sporeTex.cloud;
      un.uSporeDrip.value = sporeTex.drip;
      un.uSporeSpark.value = sporeTex.spark;
    }
    applyFieldMode();
    return subscribeFieldMode(applyFieldMode);
  }, [journey, atlas, mushroomTex, sporeTex]);

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
      un.uGenesis.value = 1;
      un.uProse.value = 0;
      un.uDissolve.value = 0;
      setProseField(0);
      return;
    }

    if (atlas) {
      un.uAtlas.value = atlas.texture;
      un.uAtlasCols.value = atlas.cols;
      un.uAtlasRows.value = atlas.rows;
      un.uGlyphCount.value = atlas.count;
      un.uProseCount.value = atlas.letters.length;
    }
    if (mushroomTex) {
      un.uMushroom.value = mushroomTex;
    }
    if (sporeTex) {
      un.uSporeA.value = sporeTex.a;
      un.uSporeB.value = sporeTex.b;
      un.uSporeC.value = sporeTex.c;
      un.uSporeTrail.value = sporeTex.trail;
      un.uSporeCloud.value = sporeTex.cloud;
      un.uSporeDrip.value = sporeTex.drip;
      un.uSporeSpark.value = sporeTex.spark;
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
    un.uGenesis.value = getStarGenesis();

    // Glyph: enlarge drifting letters. Mushroom: spore-bloom ritual (separate curve).
    const glyph = (un.uGlyphOn.value as number) > 0.5;
    const mush = (un.uMushroomOn.value as number) > 0.5;
    let prose = 0;
    let bloom = 0;
    if (glyph || mush) {
      const typing = frame.phase === 'sucking' || frame.phase === 'crossing';
      // Mushroom bloom tracks a long spiral; glyph prose still types faster
      const typeSec = mush ? 3.6 : 2.8;
      if (typing) {
        typeAge.current = Math.min(typeAge.current + d, typeSec);
      } else {
        typeAge.current = Math.max(0, typeAge.current - d * 2.2);
      }
      const t = typeAge.current / typeSec;
      if (glyph) {
        prose = t;
        if (frame.phase === 'crossing') {
          prose = 1;
          typeAge.current = typeSec;
        }
      }
      if (mush) {
        // Ease-in bloom — spiral first, vacuum later (matches slow suck)
        bloom = t * t * (3 - 2 * t);
        if (frame.phase === 'crossing') {
          bloom = 1;
          typeAge.current = typeSec;
        }
      }
    } else {
      typeAge.current = 0;
    }
    un.uProse.value = prose;
    un.uSporeBloom.value = bloom;
    un.uDissolve.value = 0;
    setProseField(glyph ? prose : 0);
  }, -1);

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        <bufferAttribute attach="attributes-aProse" args={[proseFlags, 1]} />
        <bufferAttribute attach="attributes-aGlyphId" args={[glyphIds, 1]} />
        <bufferAttribute attach="attributes-aOrder" args={[orders, 1]} />
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
