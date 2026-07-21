'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  getCycleBoost,
  getGlow,
  getSuction,
  isWarpAutoPlaying,
  isWarpBusy,
  resetSuction,
  setSuctionHolding,
  triggerWarpPlayback,
} from './suctionInput';
import {
  getPortalReveal,
  getPortalWhoosh,
  isPortalReady,
} from './voidGenesis';

/** Pointer hold shorter than this → one-click auto ritual (not a cancelable long-press). */
const CLICK_MS = 280;

/** ~500円玉 */
const SCALE = 0.3;

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/**
 * Void seal — black-hole aperture with photon-ring light.
 * Idle: maelstrom core. Long-press: opens as a dimensional warp gate;
 * light paths twist harder as suction deepens.
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uHover;
uniform float uSuck; // 0..1 long-press — opens the dimensional aperture
uniform float uReveal; // boot whoosh opacity 0..1

void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r0 = length(p);
  float ang0 = atan(p.y, p.x);

  float veil = 1.0 - smoothstep(0.62, 1.0, r0);
  veil *= veil;
  if (veil < 0.002) discard;

  float suck = clamp(uSuck, 0.0, 1.0);
  float boost = suck * suck * (3.0 - 2.0 * suck);

  float swirlZone = smoothstep(0.5, 0.4, r0) * smoothstep(0.0, 0.1, r0);
  float spin = uTime * (0.85 + uHover * 0.7 + boost * 2.2);

  // Gravitational UV warp — light bends harder near the horizon
  float pull = pow(smoothstep(0.48, 0.0, r0), 1.35) * (1.0 + boost * 1.15);
  float twist = (1.8 + 5.5 * pull + boost * 6.5) * spin * 0.35;
  float r = r0 + pull * (0.14 + boost * 0.12) * sin(ang0 * 4.0 - spin * 2.0);
  r = max(r * (1.0 - pull * (0.6 + boost * 0.28)), 0.001);
  float ang = ang0 + log(r0 * 6.0 + 0.15) * (2.8 + boost * 2.2) - twist - pull * 4.2;

  float grooves = 0.0;
  grooves += pow(0.5 + 0.5 * sin(ang * (6.0 + boost * 4.0) + log(r) * 7.0), 3.2);
  grooves += pow(0.5 + 0.5 * sin(ang * 9.0 - log(r) * 5.5 + spin), 4.0) * 0.7;
  grooves += pow(0.5 + 0.5 * sin(ang * 3.0 + log(r) * 9.0 - spin * 1.3), 2.2) * 0.5;
  grooves /= 2.2;
  grooves = mix(grooves, pow(grooves, 0.65), boost);

  float tiers = abs(sin(log(r * 14.0 + 0.2) * (9.0 + boost * 5.0) - ang * 2.0 - spin * 1.5));
  tiers = pow(1.0 - tiers, 4.0);

  float streaks = pow(0.5 + 0.5 * sin(ang * (14.0 + boost * 8.0) - 1.0 / max(r, 0.04) + spin * 3.0), 6.0);

  float maelstrom = grooves * 0.7 + tiers * 0.55 + streaks * (0.4 + boost * 0.5);
  maelstrom *= swirlZone * (1.0 + boost * 0.85);
  float drain = pow(smoothstep(0.45, 0.0, r0), 1.1);

  float core = 1.0 - smoothstep(0.18, 0.34, r0);
  core = max(core, maelstrom * 0.9 + drain * 0.85);

  // Photon ring — thin bright critical orbit (Einstein ring cue)
  float ringR = mix(0.48, 0.42, boost);
  float ring = exp(-pow((r0 - ringR) * mix(38.0, 52.0, boost), 2.0));
  float photon = exp(-pow((r0 - mix(0.40, 0.36, boost)) * 70.0, 2.0)) * boost;
  float travel = 0.55 + 0.45 * sin(ang0 * 2.0 - uTime * (1.4 + boost * 1.2));

  // Idle warm brass → warp: cool rift rim (other-dimension gate)
  vec3 ringWarm = vec3(0.92, 0.58, 0.22);
  vec3 ringRift = vec3(0.55, 0.78, 1.0);
  vec3 ringCol = mix(ringWarm, ringRift, boost * 0.85) * ring * (0.65 + 0.5 * travel);
  ringCol += mix(vec3(1.0, 0.85, 0.55), vec3(0.9, 0.82, 1.0), boost)
    * pow(ring, 1.8) * travel * (0.55 + boost * 0.45);
  ringCol += vec3(0.95, 0.9, 1.0) * photon * (1.1 + travel * 0.5);

  float lip = exp(-pow((r0 - 0.36) * 28.0, 2.0)) * 0.35;
  lip *= 1.0 - swirlZone * grooves * (0.35 + boost * 0.25);
  vec3 lipCol = mix(vec3(0.55, 0.28, 0.08), vec3(0.2, 0.12, 0.35), boost) * lip;

  float halo = exp(-pow((r0 - 0.55) * 8.0, 2.0)) * (0.12 + 0.1 * uHover + boost * 0.18);
  vec3 haloCol = mix(vec3(0.7, 0.35, 0.1), vec3(0.35, 0.25, 0.75), boost) * halo;

  float orbit2 = exp(-pow((r0 - 0.58) * 22.0, 2.0)) * 0.2;
  orbit2 *= 0.5 + 0.5 * sin(ang0 * 3.0 + uTime * 0.7);
  vec3 orbitCol = mix(vec3(0.85, 0.5, 0.18), vec3(0.5, 0.55, 1.0), boost) * orbit2;

  // Outer keep-out corona — claims space so the star clear zone reads as portal aura
  float corona = exp(-pow((r0 - 0.72) * 6.0, 2.0)) * boost * 0.55;
  vec3 coronaCol = vec3(0.25, 0.35, 0.85) * corona;
  coronaCol += vec3(0.55, 0.35, 0.95) * pow(corona, 1.5) * 0.6;

  float trough = (1.0 - grooves) * swirlZone;
  vec3 bruise = mix(vec3(0.045, 0.012, 0.01), vec3(0.02, 0.015, 0.06), boost) * trough;
  bruise += mix(vec3(0.1, 0.02, 0.015), vec3(0.08, 0.04, 0.18), boost)
    * tiers * swirlZone * (0.4 + boost * 0.35);
  float ridge = smoothstep(0.35, 0.75, grooves) * (1.0 - drain);
  bruise += vec3(0.14, 0.05, 0.02) * ridge * swirlZone * (0.25 + boost * 0.2);

  // Event horizon — pure void past the photon ring
  float aperture = pow(smoothstep(0.42, 0.0, r0), 1.4) * (0.55 + boost * 0.85);
  float horizon = pow(smoothstep(0.28, 0.0, r0), 1.8) * boost;
  vec3 beyond = vec3(0.015, 0.02, 0.055) * aperture * (1.0 - horizon);
  beyond += vec3(0.1, 0.04, 0.22) * aperture * boost * (0.35 + 0.55 * grooves) * (1.0 - horizon);

  vec3 col = bruise + beyond;
  col += lipCol + ringCol + haloCol + orbitCol + coronaCol;

  // Deepen the hole — swallow light inside the critical orbit
  col *= 1.0 - core * (0.97 + boost * 0.025);
  col *= 1.0 - horizon * 0.98;
  col *= 1.0 - maelstrom * (0.75 + drain * 0.35 + boost * 0.15);
  col *= 1.0 - streaks * swirlZone * (0.45 + boost * 0.25);

  float alpha = max(core * 0.98, ring * 1.4 + photon * 1.6 + lip + halo * 1.2 + orbit2);
  alpha = max(alpha, swirlZone * (0.88 + maelstrom * 0.2));
  alpha = max(alpha, corona * 1.1 + aperture * 0.4 * boost + horizon * 0.92);
  alpha *= veil;
  alpha *= clamp(uReveal, 0.0, 1.0);
  alpha = clamp(alpha * (0.85 + 0.2 * uHover + boost * 0.12), 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = {
  /** When false, seal is visual-only (DOM / parent drives suction + navigation). */
  interactive?: boolean;
};

/**
 * Void portal button.
 * Click/tap: play full warp ritual once (suck → A+E flash → restore).
 * Long-press: same suck while held; release before commit cancels.
 */
export default function ClockworkPortal({ interactive = true }: Props) {
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const hover = useRef(0);
  const holding = useRef(false);
  /** True only for a press that started suction (guards double pointerup). */
  const activePress = useRef(false);
  const downAt = useRef(0);
  const [hovered, setHovered] = useState(false);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uSuck: { value: 0 },
      uReveal: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    if (!interactive) return;
    resetSuction();
    const endHold = () => {
      // Clear long-press drive immediately. Defer arm clear so the portal's
      // onPointerUp can still claim a short click in the same release.
      holding.current = false;
      setSuctionHolding(false);
      queueMicrotask(() => {
        activePress.current = false;
      });
    };
    window.addEventListener('pointerup', endHold);
    window.addEventListener('blur', endHold);
    return () => {
      endHold();
      resetSuction();
      document.body.style.cursor = '';
      window.removeEventListener('pointerup', endHold);
      window.removeEventListener('blur', endHold);
    };
  }, [interactive]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const suck = getSuction();
    const auto = isWarpAutoPlaying();
    const pressBoost = holding.current || auto || suck > 0.02 ? 1 : 0;
    hover.current +=
      ((hovered || holding.current || auto || suck > 0.02 ? 1 : 0) -
        hover.current) *
      (1 - Math.pow(0.001, dt));

    const whoosh = getPortalWhoosh();
    const reveal = getPortalReveal();
    const ready = isPortalReady();

    if (group.current) {
      const target =
        SCALE *
        Math.max(0.001, whoosh) *
        (1 + hover.current * 0.08 + pressBoost * 0.04 + suck * 0.22);
      // Snap toward whoosh (ぶわん) without fighting the overshoot curve
      group.current.scale.setScalar(
        THREE.MathUtils.lerp(group.current.scale.x || target, target, 0.22),
      );
      group.current.visible = reveal > 0.02;
    }

    if (mat.current) {
      const boost = getCycleBoost();
      mat.current.uniforms.uTime.value = state.clock.elapsedTime;
      mat.current.uniforms.uHover.value = Math.max(
        hover.current,
        pressBoost * 0.85,
        getGlow() * 0.35,
      );
      mat.current.uniforms.uSuck.value = Math.min(
        1,
        suck * (0.65 + (0.35 * Math.min(boost, 2.5)) / 2.5),
      );
      mat.current.uniforms.uReveal.value = reveal;
    }

    if (interactive) {
      document.body.style.cursor =
        ready && (hovered || holding.current || auto) ? 'pointer' : '';
    }
  });

  const live = interactive;

  return (
    <group
      ref={group}
      scale={0.001}
      visible={false}
      onPointerDown={
        live
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              if (!isPortalReady()) return;
              // Ignore while a ritual is already playing (debounce / double-fire).
              if (isWarpBusy()) return;
              activePress.current = true;
              holding.current = true;
              downAt.current = performance.now();
              setSuctionHolding(true);
            }
          : undefined
      }
      onPointerUp={
        live
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (!activePress.current) return;
              const held = performance.now() - downAt.current;
              activePress.current = false;
              holding.current = false;
              setSuctionHolding(false);
              if (!isPortalReady()) return;
              // Short click/tap → one-shot full ritual (survives release).
              // Longer press that releases early still cancels via holding=false.
              if (held < CLICK_MS) triggerWarpPlayback();
            }
          : undefined
      }
      onPointerOver={
        live
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              if (!isPortalReady()) return;
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={live ? () => setHovered(false) : undefined}
    >
      <mesh renderOrder={11}>
        <planeGeometry args={[2.2, 2.2]} />
        <shaderMaterial
          ref={mat}
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  );
}
