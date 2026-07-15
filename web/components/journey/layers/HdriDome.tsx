'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = normalize(world.xyz);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform sampler2D uMap;
uniform float uExposure;
uniform float uLayerOpacity;
uniform float uYaw;

vec2 dirToUv(vec3 dir) {
  float yaw = atan(dir.z, dir.x) + uYaw;
  float pitch = asin(clamp(dir.y, -1.0, 1.0));
  return vec2(yaw * 0.15915494309 + 0.5, pitch * 0.31830988618 + 0.5);
}

void main() {
  vec3 dir = normalize(vDir);
  vec3 hdr = texture2D(uMap, dirToUv(dir)).rgb * uExposure;
  // Soft tone map so HDR backdrops do not crush ACES globals.
  vec3 col = hdr / (hdr + vec3(1.0));
  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

/**
 * Local equirect dome — does not touch scene.background / scene.environment,
 * so adjacent journey layers can crossfade without fighting global state.
 */
export default function HdriDome({
  url,
  radius = 42,
  exposure = 0.55,
  yaw = 0,
}: {
  url: string;
  radius?: number;
  exposure?: number;
  yaw?: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const texture = useLoader(RGBELoader, url);

  useLayoutEffect(() => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.LinearSRGBColorSpace;
  }, [texture]);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uExposure: { value: exposure },
      uLayerOpacity: { value: 1 },
      uYaw: { value: yaw },
    }),
    [texture, exposure, yaw],
  );

  useFrame(() => {
    if (!mat.current) return;
    mat.current.uniforms.uExposure.value = exposure;
    mat.current.uniforms.uYaw.value = yaw;
  });

  return (
    <mesh scale={[-1, 1, 1]} frustumCulled={false} raycast={() => null}>
      <sphereGeometry args={[radius, 48, 24]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        transparent
      />
    </mesh>
  );
}
