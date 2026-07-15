'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { JourneyDirector } from '../journey/JourneyDirector';
import type { JourneyStageId } from '../journey/timeline';

const skyVert = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const skyFrag = /* glsl */ `
precision highp float;
varying vec3 vWorldPos;
uniform vec3 uSunDir;
uniform float uTime;
uniform float uSea;
uniform float uLayerOpacity;

void main() {
  vec3 dir = normalize(vWorldPos);
  float h = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

  vec3 zenith = mix(vec3(0.32, 0.58, 0.92), vec3(0.26, 0.52, 0.90), uSea);
  vec3 mid = mix(vec3(0.52, 0.76, 0.96), vec3(0.40, 0.70, 0.94), uSea);
  vec3 horizon = mix(vec3(0.86, 0.92, 0.98), vec3(0.68, 0.86, 0.95), uSea);
  vec3 col = mix(horizon, mid, smoothstep(0.0, 0.45, h));
  col = mix(col, zenith, smoothstep(0.4, 1.0, h));

  float sun = pow(max(0.0, dot(dir, normalize(uSunDir))), 80.0);
  float haze = pow(max(0.0, dot(dir, normalize(uSunDir))), 8.0);
  col += vec3(1.0, 0.95, 0.75) * sun * 1.6;
  col += vec3(1.0, 0.88, 0.6) * haze * 0.4;

  float band = dir.x * 2.0 + dir.z * 1.3 + uTime * 0.015;
  float cloud = smoothstep(0.4, 0.78, sin(band) * 0.5 + 0.5);
  cloud *= smoothstep(0.18, 0.55, h) * smoothstep(0.92, 0.55, h);
  col = mix(col, vec3(1.0), cloud * mix(0.2, 0.3, uSea));

  float seaHorizon = exp(-pow((h - 0.42) * 18.0, 2.0)) * uSea;
  col += vec3(0.55, 0.85, 1.0) * seaHorizon * 0.35;

  gl_FragColor = vec4(col, uLayerOpacity);
}
`;

/** Sky + sun + soft daylight for mid-poly trees. */
export default function DaySky({
  director,
  stageId,
}: {
  director?: JourneyDirector;
  stageId?: JourneyStageId;
} = {}) {
  const sunDir = useMemo(() => new THREE.Vector3(0.45, 0.82, 0.35).normalize(), []);
  const skyMat = useRef<THREE.ShaderMaterial>(null);
  const sunGroup = useRef<THREE.Group>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const uniforms = useMemo(
    () => ({
      uSunDir: { value: sunDir.clone() },
      uTime: { value: 0 },
      uSea: { value: 0 },
      uLayerOpacity: { value: 1 },
    }),
    [sunDir],
  );

  useFrame((state) => {
    const frame =
      director && stageId ? director.getLayerFrame(stageId) : undefined;
    const sea = frame ? THREE.MathUtils.smoothstep(frame.progress, 0.72, 1) : 0;
    const weight = frame?.weight ?? 1;
    if (skyMat.current) {
      skyMat.current.uniforms.uTime.value = state.clock.elapsedTime;
      skyMat.current.uniforms.uSea.value = sea;
      skyMat.current.uniforms.uLayerOpacity.value = weight;
    }
    if (sunGroup.current) {
      sunGroup.current.position.copy(sunDir).multiplyScalar(28);
    }
    if (hemi.current) {
      hemi.current.groundColor.set(sea > 0.5 ? '#3a8a8a' : '#6b5340');
      hemi.current.intensity = (0.9 + sea * 0.12) * weight;
    }
  });

  return (
    <group>
      <mesh raycast={() => null} frustumCulled={false}>
        <sphereGeometry args={[60, 48, 32]} />
        <shaderMaterial
          ref={skyMat}
          vertexShader={skyVert}
          fragmentShader={skyFrag}
          uniforms={uniforms}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>

      <group ref={sunGroup}>
        <mesh raycast={() => null}>
          <sphereGeometry args={[3.2, 20, 20]} />
          <meshBasicMaterial color="#ffe9a8" transparent opacity={0.32} depthWrite={false} />
        </mesh>
        <mesh raycast={() => null}>
          <sphereGeometry args={[1.25, 24, 24]} />
          <meshBasicMaterial color="#fff6d0" />
        </mesh>
      </group>

      <hemisphereLight ref={hemi} args={['#c4e0ff', '#6b5340', 0.9]} />
      <ambientLight intensity={0.38} color="#fff4e6" />
      <directionalLight
        position={[sunDir.x * 20, sunDir.y * 20, sunDir.z * 20]}
        intensity={1.55}
        color="#fff1c8"
      />
      <directionalLight position={[-5, 5, -2]} intensity={0.32} color="#a8c8ff" />
    </group>
  );
}
