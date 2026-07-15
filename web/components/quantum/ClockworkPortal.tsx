'use client';

import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  getCycleBoost,
  getGlow,
  getSuction,
  resetSuction,
  setSuctionHolding,
} from './suctionInput';

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
 * Void seal — frame/ring light preserved.
 * Inside: maelstrom — UV sucked inward along a log spiral (seamless).
 */
const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uHover;
uniform float uSuck; // 0..1 long-press drain — amps the inner vortex

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

  // --- Maelstrom warp (harder while sucking) ---
  float pull = pow(smoothstep(0.48, 0.0, r0), 1.35) * (1.0 + boost * 0.8);
  float twist = (1.8 + 4.5 * pull + boost * 5.0) * spin * 0.35;
  float r = r0 + pull * (0.12 + boost * 0.08) * sin(ang0 * 4.0 - spin * 2.0);
  r = max(r * (1.0 - pull * (0.55 + boost * 0.2)), 0.001);
  float ang = ang0 + log(r0 * 6.0 + 0.15) * (2.8 + boost * 1.6) - twist - pull * 3.5;

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

  float ringR = 0.48;
  float ring = exp(-pow((r0 - ringR) * 38.0, 2.0));
  float travel = 0.55 + 0.45 * sin(ang0 * 2.0 - uTime * (1.4 + boost * 1.2));
  vec3 ringCol = vec3(0.92, 0.58, 0.22) * ring * (0.65 + 0.5 * travel);
  ringCol += vec3(1.0, 0.85, 0.55) * pow(ring, 1.8) * travel * (0.55 + boost * 0.25);

  float lip = exp(-pow((r0 - 0.36) * 28.0, 2.0)) * 0.35;
  lip *= 1.0 - swirlZone * grooves * (0.35 + boost * 0.25);
  vec3 lipCol = vec3(0.55, 0.28, 0.08) * lip;

  float halo = exp(-pow((r0 - 0.55) * 8.0, 2.0)) * (0.12 + 0.1 * uHover + boost * 0.1);
  vec3 haloCol = vec3(0.7, 0.35, 0.1) * halo;

  float orbit2 = exp(-pow((r0 - 0.58) * 22.0, 2.0)) * 0.2;
  orbit2 *= 0.5 + 0.5 * sin(ang0 * 3.0 + uTime * 0.7);
  vec3 orbitCol = vec3(0.85, 0.5, 0.18) * orbit2;

  float trough = (1.0 - grooves) * swirlZone;
  vec3 bruise = vec3(0.045, 0.012, 0.01) * trough;
  bruise += vec3(0.1, 0.02, 0.015) * tiers * swirlZone * (0.4 + boost * 0.35);
  float ridge = smoothstep(0.35, 0.75, grooves) * (1.0 - drain);
  bruise += vec3(0.14, 0.05, 0.02) * ridge * swirlZone * (0.25 + boost * 0.2);

  vec3 col = bruise;
  col += lipCol + ringCol + haloCol + orbitCol;

  col *= 1.0 - core * (0.97 + boost * 0.02);
  col *= 1.0 - maelstrom * (0.75 + drain * 0.35 + boost * 0.15);
  col *= 1.0 - streaks * swirlZone * (0.45 + boost * 0.25);

  float alpha = max(core * 0.98, ring * 1.4 + lip + halo * 1.2 + orbit2);
  alpha = max(alpha, swirlZone * (0.88 + maelstrom * 0.2));
  alpha *= veil;
  alpha = clamp(alpha * (0.85 + 0.2 * uHover), 0.0, 1.0);

  gl_FragColor = vec4(col, alpha);
}
`;

type Props = {
  /** When false, seal is visual-only (DOM / parent drives suction + navigation). */
  interactive?: boolean;
};

/**
 * Void portal button.
 * Long-press: dust is sucked in. Short tap: navigate to /apps.
 */
export default function ClockworkPortal({ interactive = true }: Props) {
  const router = useRouter();
  const group = useRef<THREE.Group>(null);
  const mat = useRef<THREE.ShaderMaterial>(null);
  const hover = useRef(0);
  const holding = useRef(false);
  const downAt = useRef(0);
  const [hovered, setHovered] = useState(false);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHover: { value: 0 },
      uSuck: { value: 0 },
    }),
    [],
  );

  useEffect(() => {
    if (!interactive) return;
    resetSuction();
    const endHold = () => {
      holding.current = false;
      setSuctionHolding(false);
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
    const pressBoost = holding.current || suck > 0.02 ? 1 : 0;
    hover.current +=
      ((hovered || holding.current || suck > 0.02 ? 1 : 0) - hover.current) *
      (1 - Math.pow(0.001, dt));

    if (group.current) {
      const s = SCALE * (1 + hover.current * 0.08 + pressBoost * 0.04);
      group.current.scale.setScalar(
        THREE.MathUtils.lerp(group.current.scale.x || s, s, 0.14),
      );
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
    }

    if (interactive) {
      document.body.style.cursor = hovered || holding.current ? 'pointer' : '';
    }
  });

  return (
    <group
      ref={group}
      scale={SCALE}
      onPointerDown={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              holding.current = true;
              downAt.current = performance.now();
              setSuctionHolding(true);
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              const held = performance.now() - downAt.current;
              holding.current = false;
              setSuctionHolding(false);
              if (held < 280) router.push('/apps/');
            }
          : undefined
      }
      onPointerOver={
        interactive
          ? (e: ThreeEvent<PointerEvent>) => {
              e.stopPropagation();
              setHovered(true);
            }
          : undefined
      }
      onPointerOut={interactive ? () => setHovered(false) : undefined}
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
