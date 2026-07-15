'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { JOURNEY_ASSETS } from './assets';
import { journeyNoise } from './glsl';
import type { JourneyLayerProps } from './types';

const earthVert = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const earthFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform sampler2D uDayMap;
uniform sampler2D uNightMap;
uniform vec3 uSunDir;
uniform float uLayerOpacity;
uniform float uCloud;

${journeyNoise}

void main() {
  vec3 day = texture2D(uDayMap, vUv).rgb;
  vec3 night = texture2D(uNightMap, vUv).rgb;
  vec3 n = normalize(vNormal);
  float ndl = clamp(dot(n, normalize(uSunDir)), 0.0, 1.0);
  float terminator = smoothstep(-0.08, 0.22, ndl);

  vec3 lit = day * (0.18 + ndl * 0.95);
  vec3 city = night * vec3(1.0, 0.92, 0.75) * 1.35;
  vec3 col = mix(city, lit, terminator);

  float clouds = fbm(normalize(vWorldPos) * 3.8 + vec3(uCloud, 0.0, uCloud * 0.4));
  clouds = smoothstep(0.12, 0.62, clouds);
  col = mix(col, vec3(0.95, 0.97, 1.0), clouds * 0.28 * terminator);

  float fres = pow(1.0 - max(0.0, n.z), 2.4);
  col += vec3(0.35, 0.55, 0.95) * fres * 0.2;

  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

const atmoFrag = /* glsl */ `
precision highp float;
varying vec3 vNormal;
uniform float uLayerOpacity;
uniform vec3 uSunDir;

void main() {
  vec3 n = normalize(vNormal);
  float fresnel = pow(1.0 - abs(dot(n, vec3(0.0, 0.0, 1.0))), 2.6);
  float sun = pow(max(0.0, dot(n, normalize(uSunDir))), 4.0);
  vec3 col = mix(vec3(0.25, 0.55, 1.0), vec3(0.85, 0.95, 1.0), sun);
  float alpha = fresnel * (0.45 + sun * 0.4) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/**
 * NASA Blue Marble + Black Marble Earth with a thin atmosphere shell.
 */
export default function EarthLayer({ director, stage }: JourneyLayerProps) {
  const dayMap = useTexture(JOURNEY_ASSETS.earthDay);
  const nightMap = useTexture(JOURNEY_ASSETS.earthNight);
  const planet = useRef<THREE.Group>(null);
  const earthMat = useRef<THREE.ShaderMaterial>(null);
  const atmoMat = useRef<THREE.ShaderMaterial>(null);
  const sunDir = useMemo(() => new THREE.Vector3(0.85, 0.25, 0.45).normalize(), []);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    nightMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 8;
    nightMap.anisotropy = 8;
  }, [dayMap, nightMap]);

  const earthUniforms = useMemo(
    () => ({
      uDayMap: { value: dayMap },
      uNightMap: { value: nightMap },
      uSunDir: { value: sunDir.clone() },
      uLayerOpacity: { value: 1 },
      uCloud: { value: 0 },
    }),
    [dayMap, nightMap, sunDir],
  );

  const atmoUniforms = useMemo(
    () => ({
      uLayerOpacity: { value: 1 },
      uSunDir: { value: sunDir.clone() },
    }),
    [sunDir],
  );

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.progress;
    const w = frame.weight;
    if (earthMat.current) {
      earthMat.current.uniforms.uLayerOpacity.value = w;
      earthMat.current.uniforms.uCloud.value = state.clock.elapsedTime * 0.04;
    }
    if (atmoMat.current) {
      atmoMat.current.uniforms.uLayerOpacity.value = w;
    }
    if (planet.current) {
      planet.current.rotation.y = state.clock.elapsedTime * 0.08 + t * 0.35;
      planet.current.position.set(
        0.35 + t * 0.1,
        0.05,
        THREE.MathUtils.lerp(-4.4, -2.55, t),
      );
      const s = THREE.MathUtils.lerp(1.35, 1.95, t);
      planet.current.scale.setScalar(s);
    }
  });

  return (
    <group>
      <ambientLight intensity={0.2} color="#7eb6ff" />
      <directionalLight
        position={[6, 2, 3]}
        intensity={1.4}
        color="#fff2d8"
      />
      <group ref={planet}>
        <mesh>
          <sphereGeometry args={[1.2, 96, 64]} />
          <shaderMaterial
            ref={earthMat}
            vertexShader={earthVert}
            fragmentShader={earthFrag}
            uniforms={earthUniforms}
            transparent
          />
        </mesh>
        <mesh scale={1.045}>
          <sphereGeometry args={[1.2, 64, 48]} />
          <shaderMaterial
            ref={atmoMat}
            vertexShader={earthVert}
            fragmentShader={atmoFrag}
            uniforms={atmoUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      </group>
    </group>
  );
}

useTexture.preload(JOURNEY_ASSETS.earthDay);
useTexture.preload(JOURNEY_ASSETS.earthNight);
