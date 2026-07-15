'use client';

import { useEnvironment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { JOURNEY_ASSETS } from './assets';
import { journeyNoise } from './glsl';
import type { JourneyLayerProps } from './types';

const skyVert = /* glsl */ `
varying vec3 vDir;
varying vec2 vUv;
void main() {
  vUv = uv;
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const skyFrag = /* glsl */ `
precision highp float;
varying vec3 vDir;
varying vec2 vUv;
uniform sampler2D uEnv;
uniform float uTime;
uniform float uLayerOpacity;
uniform vec3 uSunDir;

${journeyNoise}

vec2 dirToEquirect(vec3 d) {
  float u = atan(d.z, d.x) / (2.0 * 3.14159265) + 0.5;
  float v = asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5;
  return vec2(u, v);
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 env = texture2D(uEnv, dirToEquirect(dir)).rgb;
  env = pow(env, vec3(0.9));

  float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 zenith = vec3(0.28, 0.58, 0.95);
  vec3 horizon = vec3(0.78, 0.88, 0.98);
  vec3 procedural = mix(horizon, zenith, smoothstep(0.0, 1.0, h));

  float sun = pow(max(0.0, dot(dir, normalize(uSunDir))), 220.0);
  float haze = pow(max(0.0, dot(dir, normalize(uSunDir))), 12.0);
  procedural += vec3(1.0, 0.95, 0.8) * sun * 2.2;
  procedural += vec3(1.0, 0.85, 0.55) * haze * 0.35;

  float n = fbm(dir * 2.5 + vec3(uTime * 0.02, 0.0, uTime * 0.015));
  float clouds = smoothstep(0.18, 0.62, n);
  clouds *= smoothstep(0.12, 0.45, h) * smoothstep(0.95, 0.55, h);
  procedural = mix(procedural, vec3(1.0), clouds * 0.55);

  vec3 col = mix(procedural, env, 0.62);
  col = mix(col, vec3(1.0), clouds * 0.18);
  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

const cloudVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const cloudFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uLayerOpacity;
uniform float uLayer;
uniform vec3 uSunDir;

${journeyNoise}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float r = length(uv);
  if (r > 1.0) discard;

  vec3 p = vec3(vUv * (2.4 + uLayer), uTime * (0.03 + uLayer * 0.01));
  float n = fbm(p);
  float dens = smoothstep(0.28, 0.72, n) * smoothstep(1.0, 0.35, r);
  float light = 0.55 + 0.45 * max(0.0, dot(normalize(vec3(uv, 0.6)), normalize(uSunDir)));
  vec3 col = mix(vec3(0.72, 0.78, 0.88), vec3(1.0, 0.98, 0.95), light);
  float alpha = dens * (0.35 + 0.25 * (1.0 - uLayer)) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
}
`;

function CloudSheet({
  y,
  z,
  scale,
  layer,
  uniforms,
}: {
  y: number;
  z: number;
  scale: [number, number, number];
  layer: number;
  uniforms: {
    uTime: { value: number };
    uLayerOpacity: { value: number };
    uSunDir: { value: THREE.Vector3 };
  };
}) {
  const local = useMemo(
    () => ({
      uTime: uniforms.uTime,
      uLayerOpacity: uniforms.uLayerOpacity,
      uLayer: { value: layer },
      uSunDir: uniforms.uSunDir,
    }),
    [uniforms, layer],
  );

  return (
    <mesh position={[0, y, z]} rotation={[-0.42, 0, 0.08]} scale={scale} raycast={() => null}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={cloudVert}
        fragmentShader={cloudFrag}
        uniforms={local}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * Day sky with Poly Haven HDRI backdrop plus multi-layer procedural clouds.
 */
export default function SkyCloudsLayer({ director, stage }: JourneyLayerProps) {
  const envMap = useEnvironment({ files: JOURNEY_ASSETS.skyHdr });
  const skyMat = useRef<THREE.ShaderMaterial>(null);
  const sunDir = useMemo(() => new THREE.Vector3(0.42, 0.78, 0.38).normalize(), []);
  const cloudShared = useMemo(
    () => ({
      uTime: { value: 0 },
      uLayerOpacity: { value: 1 },
      uLayer: { value: 0 },
      uSunDir: { value: sunDir.clone() },
    }),
    [sunDir],
  );

  const skyUniforms = useMemo(
    () => ({
      uEnv: { value: envMap },
      uTime: { value: 0 },
      uLayerOpacity: { value: 1 },
      uSunDir: { value: sunDir.clone() },
    }),
    [envMap, sunDir],
  );

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.progress;
    const w = frame.weight;
    const time = state.clock.elapsedTime;
    if (skyMat.current) {
      skyMat.current.uniforms.uTime.value = time;
      skyMat.current.uniforms.uLayerOpacity.value = w;
    }
    cloudShared.uTime.value = time + t * 2.0;
    cloudShared.uLayerOpacity.value = w;
  });

  return (
    <group>
      <hemisphereLight
        args={['#b5d8ff', '#d8cfc0', 0.85]}
      />
      <directionalLight position={[8, 14, 4]} intensity={1.6} color="#fff4df" />

      <mesh scale={70} raycast={() => null} frustumCulled={false}>
        <sphereGeometry args={[1, 64, 40]} />
        <shaderMaterial
          ref={skyMat}
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={skyUniforms}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>

      <CloudSheet y={1.6} z={-6} scale={[18, 7, 1]} layer={0} uniforms={cloudShared} />
      <CloudSheet y={2.4} z={-9} scale={[22, 8, 1]} layer={0.45} uniforms={cloudShared} />
      <CloudSheet y={3.1} z={-12.5} scale={[28, 10, 1]} layer={0.85} uniforms={cloudShared} />

      <mesh position={sunDir.clone().multiplyScalar(36)} raycast={() => null}>
        <sphereGeometry args={[1.8, 24, 16]} />
        <meshBasicMaterial color="#fff2c8" transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
