'use client';

import { useFrame } from '@react-three/fiber';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ComponentType,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import {
  AnimalsLayer,
  AtmosphereLayer,
  CityLayer,
  EarthLayer,
  ForestLayer,
  GrasslandLayer,
  MyceliumLayer,
  PeopleLayer,
  SkyCloudsLayer,
  SolarLayer,
  SpaceLayer,
  type JourneyLayerProps,
} from './layers';
import { useJourneyActiveKey, useJourneyDirector } from './JourneyDirector';
import { useJourneyQuality } from './JourneyQuality';
import { prefetchAroundActive } from './prefetch';
import { JOURNEY_STAGES, type JourneyStageId } from './timeline';

export type { JourneyLayerProps };

export type JourneyLayerRegistration = {
  id: JourneyStageId;
  component: ComponentType<JourneyLayerProps>;
};

type MaterialState = {
  material: THREE.Material;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
};

type LightState = {
  light: THREE.Light;
  intensity: number;
};

/**
 * Default crossfade adapter for ordinary Three materials. Custom shaders can
 * expose a `uLayerOpacity` uniform and are updated by this boundary too.
 */
export function JourneyLayerBoundary({
  id,
  children,
}: {
  id: JourneyStageId;
  children: ReactNode;
}) {
  const director = useJourneyDirector();
  const group = useRef<THREE.Group>(null);
  const materialStates = useRef<MaterialState[]>([]);
  const lightStates = useRef<LightState[]>([]);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    const seen = new Set<THREE.Material>();
    const states: MaterialState[] = [];
    const lights: LightState[] = [];

    root.traverse((object) => {
      if (object instanceof THREE.Light) {
        lights.push({ light: object, intensity: object.intensity });
      }
      if (
        !(
          object instanceof THREE.Mesh ||
          object instanceof THREE.Points ||
          object instanceof THREE.LineSegments
        )
      ) {
        return;
      }
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (!material || seen.has(material)) return;
        seen.add(material);
        states.push({
          material,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      });
    });
    materialStates.current = states;
    lightStates.current = lights;

    return () => {
      states.forEach(({ material, opacity, transparent, depthWrite }) => {
        material.opacity = opacity;
        material.transparent = transparent;
        material.depthWrite = depthWrite;
      });
      lights.forEach(({ light, intensity }) => {
        light.intensity = intensity;
      });
    };
  }, []);

  useFrame(() => {
    const weight = director.getLayerFrame(id).weight;
    if (group.current) group.current.visible = weight > 0.001;

    materialStates.current.forEach((state) => {
      const shader = state.material as THREE.ShaderMaterial;
      if (shader.uniforms?.uLayerOpacity) {
        shader.uniforms.uLayerOpacity.value = weight;
        return;
      }
      state.material.opacity = state.opacity * weight;
      state.material.transparent = weight < 0.999 || state.transparent;
      state.material.depthWrite = weight >= 0.999 && state.depthWrite;
    });
    lightStates.current.forEach(({ light, intensity }) => {
      light.intensity = intensity * weight;
    });
  });

  return <group ref={group}>{children}</group>;
}

function PlaceholderLayer({
  director,
  stage,
}: JourneyLayerProps) {
  const group = useRef<THREE.Group>(null);
  const seed = useMemo(
    () => JOURNEY_STAGES.findIndex((item) => item.id === stage.id) + 1,
    [stage.id],
  );

  useFrame(() => {
    const frame = director.getLayerFrame(stage.id);
    if (!group.current) return;
    group.current.rotation.y = seed * 0.37 + frame.progress * 0.35;
    group.current.position.z = -2 - frame.progress * stage.cameraSpeed;
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.45} />
      <pointLight position={[2, 2, 2]} intensity={2} color={stage.fog} />
      <mesh>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshStandardMaterial
          color={stage.background}
          emissive={stage.fog}
          emissiveIntensity={0.18}
          roughness={0.72}
          wireframe
        />
      </mesh>
    </group>
  );
}

/**
 * Merge map for all stage implementations. Prefer additive edits per stage id
 * so concurrent workers do not wipe each other's layers.
 */
const IMPLEMENTED_LAYERS: Partial<
  Record<JourneyStageId, ComponentType<JourneyLayerProps>>
> = {
  space: SpaceLayer,
  solar: SolarLayer,
  earth: EarthLayer,
  atmosphere: AtmosphereLayer,
  sky: SkyCloudsLayer,
  city: CityLayer,
  people: PeopleLayer,
  grassland: GrasslandLayer,
  animals: AnimalsLayer,
  forest: ForestLayer,
  mycelium: MyceliumLayer,
};

export const JOURNEY_LAYER_REGISTRY: readonly JourneyLayerRegistration[] =
  JOURNEY_STAGES.map((stage) => ({
    id: stage.id,
    component: IMPLEMENTED_LAYERS[stage.id] ?? PlaceholderLayer,
  }));

export default function JourneyLayers() {
  const director = useJourneyDirector();
  const activeKey = useJourneyActiveKey();
  const { profile } = useJourneyQuality();
  const activeIds = activeKey.split(':') as JourneyStageId[];

  useEffect(() => {
    const [currentId, nextId] = activeKey.split(':') as JourneyStageId[];
    if (!currentId || !nextId) return;
    prefetchAroundActive(currentId, nextId);
  }, [activeKey]);

  return (
    <>
      {activeIds.map((id) => {
        const registration = JOURNEY_LAYER_REGISTRY.find((item) => item.id === id);
        const stage = JOURNEY_STAGES.find((item) => item.id === id);
        if (!registration || !stage) return null;
        const Layer = registration.component;
        return (
          <JourneyLayerBoundary key={`${id}:${profile.tier}`} id={id}>
            <Layer director={director} stage={stage} />
          </JourneyLayerBoundary>
        );
      })}
    </>
  );
}
