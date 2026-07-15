'use client';

import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useJourneyQuality } from '../JourneyQuality';
import type { JourneyLayerProps } from './types';
import HdriDome from './HdriDome';
import { ASSET, hash2 } from './shared';

const REPEAT = 8;

const grassVert = /* glsl */ `
attribute vec3 aInstanceOffset;
attribute vec3 aInstanceScale;
attribute float aPhase;
uniform float uTime;
uniform float uWind;
varying vec2 vUv;
varying float vTip;

void main() {
  vUv = uv;
  vTip = uv.y;
  float sway = sin(uTime * 2.1 + aPhase + position.y * 3.0) * uWind * uv.y;
  vec3 transformed = position;
  transformed.x += sway;
  transformed.z += cos(uTime * 1.6 + aPhase) * uWind * 0.55 * uv.y;
  transformed *= aInstanceScale;
  transformed += aInstanceOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
`;

const grassFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying float vTip;
uniform float uLayerOpacity;
uniform vec3 uColorA;
uniform vec3 uColorB;

void main() {
  vec3 col = mix(uColorA, uColorB, vTip);
  float alpha = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
  alpha *= uLayerOpacity;
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export default function GrasslandLayer({ director, stage }: JourneyLayerProps) {
  const { profile } = useJourneyQuality();
  const bladeCount = profile.grassBlades;
  const groundMat = useRef<THREE.MeshStandardMaterial>(null);
  const grassMat = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);

  const [map, normalMap, roughnessMap] = useTexture([...ASSET.grassRock]);

  useLayoutEffect(() => {
    for (const tex of [map, normalMap, roughnessMap]) {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(REPEAT, REPEAT);
      tex.anisotropy = profile.tier === 'high' ? 4 : 2;
      tex.colorSpace = tex === map ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    }
  }, [map, normalMap, roughnessMap, profile.tier]);

  const bladeGeo = useMemo(() => {
    const base = new THREE.PlaneGeometry(0.05, 0.42, 1, 3);
    base.translate(0, 0.21, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.attributes.position = base.attributes.position;
    geo.attributes.normal = base.attributes.normal;
    geo.attributes.uv = base.attributes.uv;

    const offsets = new Float32Array(bladeCount * 3);
    const scales = new Float32Array(bladeCount * 3);
    const phases = new Float32Array(bladeCount);
    for (let i = 0; i < bladeCount; i++) {
      const x = (hash2(i, 1) - 0.5) * 28;
      const z = THREE.MathUtils.lerp(4, -26, hash2(i, 2));
      const lane = Math.abs(x) < 1.1 ? (x < 0 ? -1.25 : 1.25) : x;
      offsets[i * 3] = lane;
      offsets[i * 3 + 1] = -1.15;
      offsets[i * 3 + 2] = z;
      const h = 0.65 + hash2(i, 3) * 0.9;
      scales[i * 3] = 0.7 + hash2(i, 4) * 0.6;
      scales[i * 3 + 1] = h;
      scales[i * 3 + 2] = 0.7 + hash2(i, 5) * 0.6;
      phases[i] = hash2(i, 6) * Math.PI * 2;
    }
    geo.setAttribute(
      'aInstanceOffset',
      new THREE.InstancedBufferAttribute(offsets, 3),
    );
    geo.setAttribute(
      'aInstanceScale',
      new THREE.InstancedBufferAttribute(scales, 3),
    );
    geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
    geo.instanceCount = bladeCount;
    base.dispose();
    return geo;
  }, [bladeCount]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0.12 },
      uLayerOpacity: { value: 1 },
      uColorA: { value: new THREE.Color('#3f6b2d') },
      uColorB: { value: new THREE.Color('#9db85a') },
    }),
    [],
  );

  useEffect(() => () => bladeGeo.dispose(), [bladeGeo]);

  useFrame(() => {
    const frame = director.getLayerFrame(stage.id);
    if (grassMat.current) {
      grassMat.current.uniforms.uTime.value = frame.stageElapsed;
      grassMat.current.uniforms.uWind.value = 0.1 + frame.progress * 0.14;
    }
    if (group.current) {
      group.current.position.z = frame.progress * stage.cameraSpeed * 0.85;
    }
    if (groundMat.current) {
      const offset = frame.stageElapsed * stage.cameraSpeed * 0.08;
      map.offset.set(0, offset);
      normalMap.offset.set(0, offset);
      roughnessMap.offset.set(0, offset);
    }
  });

  return (
    <group>
      <HdriDome url={ASSET.skyHdri} exposure={0.5} yaw={-0.2} />
      <ambientLight intensity={0.55} color="#e7f2ff" />
      <hemisphereLight args={['#cfe8ff', '#6a7d4a', 0.8]} />
      <directionalLight position={[3, 7, 2]} intensity={1.25} color="#fff4d2" />

      <group ref={group}>
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.16, -8]}
          receiveShadow={profile.shadows}
          raycast={() => null}
        >
          <planeGeometry args={[48, 60]} />
          <meshStandardMaterial
            ref={groundMat}
            map={map}
            normalMap={normalMap}
            roughnessMap={roughnessMap}
            roughness={1}
            metalness={0.02}
            normalScale={new THREE.Vector2(0.9, 0.9)}
          />
        </mesh>

        <mesh geometry={bladeGeo} frustumCulled={false} raycast={() => null}>
          <shaderMaterial
            ref={grassMat}
            vertexShader={grassVert}
            fragmentShader={grassFrag}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

useTexture.preload(ASSET.grassRock[0]);
useTexture.preload(ASSET.grassRock[1]);
useTexture.preload(ASSET.grassRock[2]);
