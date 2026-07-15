'use client';

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import ParticleSwarm from '../../quantum/ParticleSwarm';
import { useJourneyQuality } from '../JourneyQuality';
import { journeyNoise } from './glsl';
import type { JourneyLayerProps } from './types';

const nebulaVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const nebulaFrag = /* glsl */ `
precision highp float;
varying vec3 vDir;
uniform float uTime;
uniform float uLayerOpacity;
uniform float uDive;

${journeyNoise}

void main() {
  vec3 dir = normalize(vDir);
  float n = fbm(dir * 2.4 + vec3(0.0, uTime * 0.018, uTime * 0.012));
  float ridge = 1.0 - abs(n);
  ridge = pow(ridge, 3.2);

  vec3 deep = vec3(0.02, 0.03, 0.08);
  vec3 nebA = vec3(0.18, 0.08, 0.36);
  vec3 nebB = vec3(0.05, 0.22, 0.42);
  vec3 col = mix(deep, nebA, smoothstep(0.15, 0.75, n * 0.5 + 0.5));
  col = mix(col, nebB, ridge * 0.55);
  col += vec3(0.55, 0.7, 1.0) * pow(max(0.0, n), 4.0) * 0.12;

  float pole = abs(dir.y);
  col *= 0.55 + 0.45 * smoothstep(1.0, 0.15, pole);

  float alpha = (0.22 + ridge * 0.38) * (1.0 - uDive * 0.55) * uLayerOpacity;
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`;

/**
 * Opening cosmos: GPU starfield from ParticleSwarm plus a soft nebula shell.
 */
export default function SpaceLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const nebula = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uLayerOpacity: { value: 1 },
      uDive: { value: 0 },
    }),
    [],
  );
  const nebulaSegments = profile.tier === 'light' ? [32, 20] : [48, 32];

  useFrame((state) => {
    const frame = director.getLayerFrame(stage.id);
    const dive = THREE.MathUtils.smoothstep(frame.progress, 0.4, 1);
    if (nebula.current) {
      nebula.current.uniforms.uTime.value = state.clock.elapsedTime;
      nebula.current.uniforms.uLayerOpacity.value = frame.weight;
      nebula.current.uniforms.uDive.value = dive;
    }
    if (group.current) {
      group.current.rotation.y = frame.progress * 0.08;
      group.current.position.z = -dive * 1.2;
    }
  });

  return (
    <group ref={group}>
      <mesh scale={48} raycast={() => null} frustumCulled={false}>
        <sphereGeometry args={[1, nebulaSegments[0], nebulaSegments[1]]} />
        <shaderMaterial
          ref={nebula}
          vertexShader={nebulaVert}
          fragmentShader={nebulaFrag}
          uniforms={uniforms}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <ParticleSwarm
        count={profile.particleCount}
        journey={{ director, stageId: stage.id }}
      />
      <ambientLight intensity={0.12} color="#8aa4ff" />
      <pointLight position={[4, 2, 2]} intensity={0.55} color="#6ec8ff" distance={40} />
    </group>
  );
}
