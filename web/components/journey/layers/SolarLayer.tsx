'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { journeyNoise } from './glsl';
import type { JourneyLayerProps } from './types';

const sunVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorldPos;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const sunFrag = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uLayerOpacity;

${journeyNoise}

void main() {
  vec3 n = normalize(vNormal);
  float noise = fbm(normalize(vWorldPos) * 3.5 + vec3(uTime * 0.12, 0.0, uTime * 0.08));
  vec3 core = vec3(1.0, 0.72, 0.22);
  vec3 limb = vec3(1.0, 0.35, 0.05);
  float rim = pow(1.0 - max(0.0, n.z), 1.6);
  vec3 col = mix(core, limb, rim * 0.65 + noise * 0.2);
  col += vec3(1.0, 0.9, 0.5) * (0.15 + noise * 0.25);
  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

const coronaFrag = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vWorldPos;
uniform float uTime;
uniform float uLayerOpacity;

${journeyNoise}

void main() {
  vec3 n = normalize(vNormal);
  float fresnel = pow(1.0 - abs(n.z), 2.8);
  float plasma = fbm(normalize(vWorldPos) * 2.2 + vec3(uTime * 0.25, uTime * 0.1, 0.0));
  float stream = pow(max(0.0, plasma), 2.4);
  vec3 col = mix(vec3(1.0, 0.55, 0.12), vec3(1.0, 0.9, 0.45), stream);
  float alpha = fresnel * (0.35 + stream * 0.65) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

const marsVert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vLocal;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocal = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const marsFrag = /* glsl */ `
precision highp float;
varying vec3 vNormal;
varying vec3 vLocal;
uniform float uTime;
uniform float uLayerOpacity;
uniform vec3 uLightDir;

${journeyNoise}

void main() {
  vec3 p = normalize(vLocal);
  float continents = fbm(p * 3.2 + 4.0);
  float craters = smoothstep(0.55, 0.72, fbm(p * 8.5 + 12.0));
  float polar = smoothstep(0.72, 0.92, abs(p.y));

  vec3 rust = vec3(0.62, 0.28, 0.14);
  vec3 dune = vec3(0.78, 0.48, 0.28);
  vec3 dark = vec3(0.32, 0.16, 0.1);
  vec3 ice = vec3(0.86, 0.9, 0.95);

  vec3 albedo = mix(rust, dune, smoothstep(-0.2, 0.55, continents));
  albedo = mix(albedo, dark, craters * 0.55);
  albedo = mix(albedo, ice, polar);

  float ndl = max(0.08, dot(normalize(vNormal), normalize(uLightDir)));
  vec3 col = albedo * (0.22 + ndl * 0.95);
  col += vec3(1.0, 0.55, 0.25) * pow(max(0.0, 1.0 - abs(normalize(vNormal).z)), 3.0) * 0.08;
  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

/**
 * Procedural Sun + Mars fly-by (no public sphere maps in the journey asset pack).
 */
export default function SolarLayer({ director, stage }: JourneyLayerProps) {
  const root = useRef<THREE.Group>(null);
  const sunMat = useRef<THREE.ShaderMaterial>(null);
  const coronaNear = useRef<THREE.ShaderMaterial>(null);
  const coronaFar = useRef<THREE.ShaderMaterial>(null);
  const marsMat = useRef<THREE.ShaderMaterial>(null);
  const mars = useRef<THREE.Group>(null);
  const lightDir = useMemo(() => new THREE.Vector3(1.1, 0.35, 0.55).normalize(), []);

  const sunUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLayerOpacity: { value: 1 } }),
    [],
  );
  const coronaNearUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLayerOpacity: { value: 1 } }),
    [],
  );
  const coronaFarUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uLayerOpacity: { value: 1 } }),
    [],
  );
  const marsUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLayerOpacity: { value: 1 },
      uLightDir: { value: lightDir.clone() },
    }),
    [lightDir],
  );

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const t = frame.progress;
    const w = frame.weight;
    const time = state.clock.elapsedTime;

    const push = (
      mat: THREE.ShaderMaterial | null,
      uniforms: { uTime: { value: number }; uLayerOpacity: { value: number } },
    ) => {
      if (!mat) return;
      uniforms.uTime.value = time;
      uniforms.uLayerOpacity.value = w;
    };
    push(sunMat.current, sunUniforms);
    push(coronaNear.current, coronaNearUniforms);
    push(coronaFar.current, coronaFarUniforms);
    if (marsMat.current) {
      marsUniforms.uTime.value = time;
      marsUniforms.uLayerOpacity.value = w;
    }
    if (mars.current) {
      mars.current.rotation.y = time * 0.18 + t * 0.6;
      mars.current.position.set(
        THREE.MathUtils.lerp(1.6, -0.35, t),
        0.15 + Math.sin(t * Math.PI) * 0.08,
        THREE.MathUtils.lerp(-3.2, -1.4, t),
      );
      mars.current.scale.setScalar(THREE.MathUtils.lerp(0.72, 1.05, t));
    }
    if (root.current) {
      root.current.position.x = THREE.MathUtils.lerp(0.2, -0.15, t);
      root.current.rotation.y = t * 0.12;
    }
  });

  return (
    <group ref={root}>
      <ambientLight intensity={0.18} color="#ffb48a" />
      <pointLight position={[-3.2, 0.8, -2.4]} intensity={4.2} color="#ff9a42" distance={28} />
      <pointLight position={[2.4, 0.4, -1.2]} intensity={1.1} color="#ff6240" distance={18} />

      <group position={[-3.4, 0.65, -4.8]}>
        <mesh>
          <sphereGeometry args={[1.35, 64, 48]} />
          <shaderMaterial
            ref={sunMat}
            vertexShader={sunVert}
            fragmentShader={sunFrag}
            uniforms={sunUniforms}
            transparent
          />
        </mesh>
        <mesh scale={1.28}>
          <sphereGeometry args={[1.35, 48, 32]} />
          <shaderMaterial
            ref={coronaNear}
            vertexShader={sunVert}
            fragmentShader={coronaFrag}
            uniforms={coronaNearUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh scale={1.55}>
          <sphereGeometry args={[1.35, 32, 24]} />
          <shaderMaterial
            ref={coronaFar}
            vertexShader={sunVert}
            fragmentShader={coronaFrag}
            uniforms={coronaFarUniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.BackSide}
          />
        </mesh>
      </group>

      <group ref={mars}>
        <mesh>
          <sphereGeometry args={[0.85, 64, 48]} />
          <shaderMaterial
            ref={marsMat}
            vertexShader={marsVert}
            fragmentShader={marsFrag}
            uniforms={marsUniforms}
            transparent
          />
        </mesh>
      </group>
    </group>
  );
}
