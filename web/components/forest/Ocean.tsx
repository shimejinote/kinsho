'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vViewDir;
uniform float uTime;

void main() {
  vUv = uv;
  vec3 p = position;
  float w1 = sin(p.x * 0.28 + uTime * 1.35) * 0.07;
  float w2 = sin(p.z * 0.42 + p.x * 0.18 - uTime * 0.95) * 0.055;
  float w3 = sin(p.x * 1.1 + p.z * 0.85 + uTime * 2.1) * 0.018;
  p.y += w1 + w2 + w3;

  // Analytic-ish normal from wave derivatives
  float dx = cos(p.x * 0.28 + uTime * 1.35) * 0.28 * 0.07
           + cos(p.z * 0.42 + p.x * 0.18 - uTime * 0.95) * 0.18 * 0.055;
  float dz = cos(p.z * 0.42 + p.x * 0.18 - uTime * 0.95) * 0.42 * 0.055
           + cos(p.x * 1.1 + p.z * 0.85 + uTime * 2.1) * 0.85 * 0.018;
  vec3 n = normalize(vec3(-dx, 1.0, -dz));
  vNormalW = normalize(mat3(modelMatrix) * n);

  vec4 world = modelMatrix * vec4(p, 1.0);
  vPos = p;
  vViewDir = normalize(cameraPosition - world.xyz);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNormalW;
varying vec3 vViewDir;
uniform float uTime;
uniform float uSea;
uniform float uLayerOpacity;

void main() {
  float deep = smoothstep(-8.0, -34.0, vPos.z);
  vec3 shallow = vec3(0.18, 0.55, 0.62);
  vec3 mid = vec3(0.08, 0.32, 0.58);
  vec3 abyss = vec3(0.04, 0.16, 0.38);
  vec3 col = mix(shallow, mid, deep);
  col = mix(col, abyss, deep * deep);

  float fresnel = pow(1.0 - max(0.0, dot(normalize(vNormalW), normalize(vViewDir))), 3.2);
  vec3 skyReflect = vec3(0.55, 0.75, 0.95);
  col = mix(col, skyReflect, fresnel * 0.55);

  float spark = pow(0.5 + 0.5 * sin(vPos.x * 4.0 + vPos.z * 2.6 - uTime * 3.2), 18.0);
  col += vec3(0.95, 0.98, 1.0) * spark * (0.15 + fresnel * 0.25);

  float shore = smoothstep(-9.0, -15.0, vPos.z);
  float foam = pow(0.5 + 0.5 * sin(vPos.x * 2.2 - uTime * 2.2 + vPos.z * 0.8), 2.5);
  col = mix(col, vec3(0.93, 0.97, 0.99), (1.0 - shore) * foam * 0.5);

  float alpha = mix(0.0, 0.97, clamp(uSea, 0.0, 1.0));
  alpha = max(alpha, smoothstep(0.15, 0.55, uSea) * 0.7);
  gl_FragColor = vec4(col, alpha * uLayerOpacity);
}
`;

/** Fresnel ocean beyond the tree line. */
export default function Ocean({
  seaRef,
}: {
  seaRef?: MutableRefObject<number>;
} = {}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSea: { value: 0 },
      uLayerOpacity: { value: 1 },
    }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uSea.value = seaRef?.current ?? 0;
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.22, -22]}
      raycast={() => null}
    >
      <planeGeometry args={[70, 48, 96, 64]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}
