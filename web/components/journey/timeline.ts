import * as THREE from 'three';

export const JOURNEY_STAGE_SECONDS = 5;
export const JOURNEY_CROSSFADE_SECONDS = 1;

export const JOURNEY_STAGE_IDS = [
  'space',
  'solar',
  'earth',
  'atmosphere',
  'sky',
  'city',
  'people',
  'grassland',
  'animals',
  'forest',
  'mycelium',
] as const;

export type JourneyStageId = (typeof JOURNEY_STAGE_IDS)[number];

export type JourneyStageDefinition = {
  id: JourneyStageId;
  label: string;
  background: string;
  fog: string;
  fogNear: number;
  fogFar: number;
  exposure: number;
  cameraSpeed: number;
  cameraAnchor: readonly [number, number, number];
};

export const JOURNEY_STAGES: readonly JourneyStageDefinition[] = [
  { id: 'space', label: '宇宙', background: '#02030a', fog: '#060817', fogNear: 35, fogFar: 90, exposure: 0.78, cameraSpeed: 0.16, cameraAnchor: [0, 0.2, 5.2] },
  { id: 'solar', label: '太陽 / 火星', background: '#100806', fog: '#25100b', fogNear: 28, fogFar: 80, exposure: 0.9, cameraSpeed: 0.24, cameraAnchor: [0.35, 0.28, 5.05] },
  { id: 'earth', label: '地球', background: '#04111d', fog: '#102b3a', fogNear: 24, fogFar: 75, exposure: 0.94, cameraSpeed: 0.3, cameraAnchor: [0.55, 0.38, 4.8] },
  { id: 'atmosphere', label: '大気圏', background: '#123653', fog: '#477e9e', fogNear: 18, fogFar: 64, exposure: 1.02, cameraSpeed: 0.72, cameraAnchor: [0.45, 0.48, 4.55] },
  { id: 'sky', label: '空と雲', background: '#78b7e5', fog: '#bedcf0', fogNear: 16, fogFar: 58, exposure: 1.12, cameraSpeed: 0.48, cameraAnchor: [0.1, 0.62, 4.4] },
  { id: 'city', label: '大都会', background: '#8aa6b8', fog: '#a9b7bf', fogNear: 13, fogFar: 52, exposure: 1.0, cameraSpeed: 0.62, cameraAnchor: [-0.35, 0.55, 4.5] },
  { id: 'people', label: '人々', background: '#b1aa9d', fog: '#c8c0b3', fogNear: 12, fogFar: 48, exposure: 1.04, cameraSpeed: 0.34, cameraAnchor: [-0.58, 0.48, 4.7] },
  { id: 'grassland', label: '草原', background: '#8fc6dc', fog: '#c3d9d0', fogNear: 17, fogFar: 58, exposure: 1.1, cameraSpeed: 0.58, cameraAnchor: [-0.5, 0.5, 4.95] },
  { id: 'animals', label: '動物たち', background: '#9dc9d2', fog: '#c9ddd3', fogNear: 15, fogFar: 54, exposure: 1.08, cameraSpeed: 0.42, cameraAnchor: [-0.2, 0.5, 5.12] },
  { id: 'forest', label: '森林', background: '#9ec8f0', fog: '#c5ddf5', fogNear: 18, fogFar: 48, exposure: 1.18, cameraSpeed: 0.8, cameraAnchor: [0, 0.55, 5] },
  { id: 'mycelium', label: '菌床世界', background: '#10051b', fog: '#35144b', fogNear: 13, fogFar: 50, exposure: 0.92, cameraSpeed: 0.28, cameraAnchor: [0.2, 0.38, 5.15] },
] as const;

export const JOURNEY_DURATION_SECONDS =
  JOURNEY_STAGES.length * JOURNEY_STAGE_SECONDS;

export type JourneySnapshot = {
  elapsed: number;
  cycle: number;
  stageIndex: number;
  stage: JourneyStageDefinition;
  nextStage: JourneyStageDefinition;
  stageElapsed: number;
  stageProgress: number;
  transitionProgress: number;
  cameraSpeed: number;
  playing: boolean;
};

export type JourneyLayerFrame = {
  elapsed: number;
  stageElapsed: number;
  progress: number;
  weight: number;
  isCurrent: boolean;
  isNext: boolean;
};

const smoothstep = (value: number) => {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};

export function createJourneySnapshot(
  elapsed: number,
  cycle: number,
  playing: boolean,
): JourneySnapshot {
  const wrapped =
    ((elapsed % JOURNEY_DURATION_SECONDS) + JOURNEY_DURATION_SECONDS) %
    JOURNEY_DURATION_SECONDS;
  const stageIndex = Math.floor(wrapped / JOURNEY_STAGE_SECONDS);
  const stageElapsed = wrapped - stageIndex * JOURNEY_STAGE_SECONDS;
  const stageProgress = stageElapsed / JOURNEY_STAGE_SECONDS;
  const transitionProgress = smoothstep(
    (stageElapsed - (JOURNEY_STAGE_SECONDS - JOURNEY_CROSSFADE_SECONDS)) /
      JOURNEY_CROSSFADE_SECONDS,
  );
  const stage = JOURNEY_STAGES[stageIndex];
  const nextStage = JOURNEY_STAGES[(stageIndex + 1) % JOURNEY_STAGES.length];

  return {
    elapsed: wrapped,
    cycle,
    stageIndex,
    stage,
    nextStage,
    stageElapsed,
    stageProgress,
    transitionProgress,
    cameraSpeed: THREE.MathUtils.lerp(
      stage.cameraSpeed,
      nextStage.cameraSpeed,
      transitionProgress,
    ),
    playing,
  };
}
