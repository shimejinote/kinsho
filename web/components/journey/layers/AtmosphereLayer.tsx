'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJourneyQuality } from '../JourneyQuality';
import { journeyNoise } from './glsl';
import type { JourneyLayerProps } from './types';

const limbVert = /* glsl */ `
varying vec3 vPos;
varying vec2 vUv;
void main() {
  vUv = uv;
  vPos = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const limbFrag = /* glsl */ `
precision highp float;
varying vec3 vPos;
varying vec2 vUv;
uniform float uTime;
uniform float uHeat;
uniform float uLayerOpacity;

${journeyNoise}

void main() {
  float h = vUv.y;
  float limb = exp(-pow((h - 0.42) * 14.0, 2.0));
  float deep = smoothstep(0.55, 0.0, h);
  float haze = fbm(vec3(vUv * 4.0, uTime * 0.15));

  vec3 space = vec3(0.04, 0.08, 0.16);
  vec3 air = vec3(0.35, 0.62, 0.95);
  vec3 plasma = vec3(1.0, 0.45, 0.12);
  vec3 ground = vec3(0.12, 0.28, 0.42);

  vec3 col = mix(space, air, limb);
  col = mix(col, ground, deep * 0.85);
  col = mix(col, plasma, uHeat * (0.25 + haze * 0.35) * smoothstep(0.2, 0.7, h));
  col += vec3(0.8, 0.95, 1.0) * limb * 0.35;

  float alpha = (0.55 + limb * 0.45 + deep * 0.3) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

const streakVert = /* glsl */ `
attribute vec3 aSeed;
uniform float uTime;
uniform float uSpeed;
uniform float uPixelRatio;
varying float vLife;
varying float vHeat;

void main() {
  float id = aSeed.x;
  float lane = aSeed.y;
  float len = 0.4 + aSeed.z * 1.4;
  float scroll = fract(id + uTime * (0.35 + uSpeed * 2.4) * (0.5 + aSeed.z));
  float z = mix(8.0, -18.0, scroll);
  float x = (lane - 0.5) * 10.0;
  float y = (aSeed.z - 0.35) * 4.5 + sin(id * 40.0 + uTime) * 0.15;
  vec3 p = vec3(x, y, z);

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float sz = mix(1.5, 4.5, aSeed.z) * (1.0 + uSpeed * 2.0);
  gl_PointSize = clamp(sz * uPixelRatio * (180.0 / max(40.0, -mv.z)), 0.5, 48.0);
  vLife = smoothstep(0.0, 0.12, scroll) * smoothstep(1.0, 0.75, scroll);
  vHeat = uSpeed * (0.4 + aSeed.z);
}
`;

const streakFrag = /* glsl */ `
precision highp float;
varying float vLife;
varying float vHeat;
uniform float uLayerOpacity;

void main() {
  vec2 uv = gl_PointCoord * 2.0 - 1.0;
  uv.y *= 0.22;
  float d = length(uv);
  if (d > 1.0) discard;
  float core = exp(-d * d * 8.0);
  vec3 cool = vec3(0.75, 0.88, 1.0);
  vec3 hot = vec3(1.0, 0.55, 0.2);
  vec3 col = mix(cool, hot, clamp(vHeat, 0.0, 1.0)) * core * (1.2 + vHeat);
  float alpha = core * vLife * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

const heatFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uHeat;
uniform float uLayerOpacity;
uniform float uTime;

${journeyNoise}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = length(uv);
  float band = exp(-pow((uv.y + 0.15) * 2.8, 2.0));
  float noise = fbm(vec3(uv * 3.0, uTime * 0.8));
  float glow = band * (0.35 + noise * 0.45) * uHeat;
  vec3 col = mix(vec3(1.0, 0.55, 0.15), vec3(1.0, 0.2, 0.05), noise);
  float alpha = glow * (1.0 - smoothstep(0.55, 1.15, r)) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}
`;

/**
 * Curved Earth limb, plasma haze, and high-speed reentry streaks.
 */
export default function AtmosphereLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const streakCount = profile.atmosphereStreaks;
  const root = useRef<THREE.Group>(null);
  const limbMat = useRef<THREE.ShaderMaterial>(null);
  const streakMat = useRef<THREE.ShaderMaterial>(null);
  const heatMat = useRef<THREE.ShaderMaterial>(null);

  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(streakCount * 3);
    const seeds = new Float32Array(streakCount * 3);
    for (let i = 0; i < streakCount; i++) {
      seeds[i * 3] = Math.random();
      seeds[i * 3 + 1] = Math.random();
      seeds[i * 3 + 2] = Math.random();
    }
    return { positions, seeds };
  }, [streakCount]);

  const limbUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHeat: { value: 0 },
      uLayerOpacity: { value: 1 },
    }),
    [],
  );
  const streakUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSpeed: { value: 0 },
      uPixelRatio: { value: 1 },
      uLayerOpacity: { value: 1 },
    }),
    [],
  );
  const heatUniforms = useMemo(
    () => ({
      uHeat: { value: 0 },
      uLayerOpacity: { value: 1 },
      uTime: { value: 0 },
    }),
    [],
  );

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.progress;
    const w = frame.weight;
    const heat = THREE.MathUtils.smoothstep(t, 0.1, 0.85);
    const speed = THREE.MathUtils.lerp(0.35, 1.0, t);

    if (limbMat.current) {
      limbMat.current.uniforms.uTime.value = state.clock.elapsedTime;
      limbMat.current.uniforms.uHeat.value = heat;
      limbMat.current.uniforms.uLayerOpacity.value = w;
    }
    if (streakMat.current) {
      streakMat.current.uniforms.uTime.value = state.clock.elapsedTime;
      streakMat.current.uniforms.uSpeed.value = speed;
      streakMat.current.uniforms.uPixelRatio.value = Math.min(
        state.gl.getPixelRatio(),
        2,
      );
      streakMat.current.uniforms.uLayerOpacity.value = w;
    }
    if (heatMat.current) {
      heatMat.current.uniforms.uHeat.value = heat;
      heatMat.current.uniforms.uTime.value = state.clock.elapsedTime;
      heatMat.current.uniforms.uLayerOpacity.value = w;
    }
    if (root.current) {
      root.current.position.z = -t * stage.cameraSpeed * 0.35;
      root.current.rotation.z = Math.sin(t * Math.PI) * 0.04;
    }
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.25} color="#8ec8ff" />
      <pointLight position={[0, 1.5, 2]} intensity={1.8} color="#ff8a42" distance={20} />
      <pointLight position={[-2, 0.5, -2]} intensity={0.8} color="#5aa8ff" distance={24} />

      <mesh
        position={[0, -1.8, -6]}
        rotation={[0.55, 0, 0]}
        scale={[14, 8, 1]}
        raycast={() => null}
      >
        <planeGeometry args={[1, 1, 64, 32]} />
        <shaderMaterial
          ref={limbMat}
          vertexShader={limbVert}
          fragmentShader={limbFrag}
          uniforms={limbUniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -0.2, -1.2]} scale={[3.2, 1.8, 1]} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={heatMat}
          vertexShader={limbVert}
          fragmentShader={heatFrag}
          uniforms={heatUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[seeds, 3]} />
        </bufferGeometry>
        <shaderMaterial
          ref={streakMat}
          vertexShader={streakVert}
          fragmentShader={streakFrag}
          uniforms={streakUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
