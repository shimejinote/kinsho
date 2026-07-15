'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import Link from 'next/link';
import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { JourneyAudioProvider, useJourneyAudio } from './JourneyAudio';
import {
  JourneyDirectorProvider,
  useJourneyDirector,
  useJourneySnapshot,
} from './JourneyDirector';
import JourneyEffects from './JourneyEffects';
import JourneyLayers from './JourneyLayers';
import { JourneyQualityProvider, useJourneyQuality } from './JourneyQuality';
import { JOURNEY_DURATION_SECONDS, JOURNEY_STAGES } from './timeline';

function JourneyClock() {
  const director = useJourneyDirector();
  useFrame((_, delta) => director.advance(delta), -100);
  return null;
}

function JourneyCamera() {
  const director = useJourneyDirector();
  const { profile } = useJourneyQuality();
  const camera = useThree((state) => state.camera);
  const path = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        JOURNEY_STAGES.map(
          (stage) => new THREE.Vector3(...stage.cameraAnchor),
        ),
        true,
        'catmullrom',
        0.32,
      ),
    [],
  );
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const snapshot = director.getSnapshot();
    path.getPointAt(snapshot.elapsed / JOURNEY_DURATION_SECONDS, position);
    const lerp = profile.reducedMotion ? 0.04 : profile.cameraLerp;
    camera.position.lerp(position, lerp);
    target.set(camera.position.x * 0.12, 0.05, -3.5);
    camera.lookAt(target);
    if (camera instanceof THREE.PerspectiveCamera) {
      const speedBoost = profile.reducedMotion
        ? 0
        : snapshot.cameraSpeed * 3;
      camera.fov = THREE.MathUtils.lerp(camera.fov, 46 + speedBoost, 0.08);
      camera.updateProjectionMatrix();
    }
  }, -50);

  return null;
}

function JourneyEnvironment() {
  const director = useJourneyDirector();
  const { scene, gl } = useThree();
  const background = useMemo(() => new THREE.Color(), []);
  const fogColor = useMemo(() => new THREE.Color(), []);
  const currentColor = useMemo(() => new THREE.Color(), []);
  const nextColor = useMemo(() => new THREE.Color(), []);

  useFrame(() => {
    const snapshot = director.getSnapshot();
    const mix = snapshot.transitionProgress;
    background.lerpColors(
      currentColor.set(snapshot.stage.background),
      nextColor.set(snapshot.nextStage.background),
      mix,
    );
    fogColor.lerpColors(
      currentColor.set(snapshot.stage.fog),
      nextColor.set(snapshot.nextStage.fog),
      mix,
    );
    scene.background = background;

    if (!(scene.fog instanceof THREE.Fog)) {
      scene.fog = new THREE.Fog(fogColor, snapshot.stage.fogNear, snapshot.stage.fogFar);
    }
    scene.fog.color.copy(fogColor);
    scene.fog.near = THREE.MathUtils.lerp(
      snapshot.stage.fogNear,
      snapshot.nextStage.fogNear,
      mix,
    );
    scene.fog.far = THREE.MathUtils.lerp(
      snapshot.stage.fogFar,
      snapshot.nextStage.fogFar,
      mix,
    );
    gl.toneMappingExposure = THREE.MathUtils.lerp(
      snapshot.stage.exposure,
      snapshot.nextStage.exposure,
      mix,
    );
  }, -40);

  return null;
}

function QualityCanvasSync() {
  const { profile } = useJourneyQuality();
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    gl.shadowMap.enabled = profile.shadows;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, profile.dprMax),
    );
  }, [gl, profile.dprMax, profile.shadows]);

  return null;
}

function controlButtonClass(active = false) {
  return [
    'pointer-events-auto rounded-full border px-3 py-1 text-xs backdrop-blur transition',
    active
      ? 'border-white/45 bg-white/15 text-white'
      : 'border-white/25 bg-black/25 text-white/85 hover:border-white/40 hover:text-white',
  ].join(' ');
}

function JourneyHud() {
  const director = useJourneyDirector();
  const snapshot = useJourneySnapshot();
  const { profile, cycleTier, setBloom, setDof } = useJourneyQuality();
  const audio = useJourneyAudio();
  const overallProgress = snapshot.elapsed / JOURNEY_DURATION_SECONDS;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 text-white">
      <div className="absolute left-5 top-5 text-[11px] tracking-[0.24em] text-white/75">
        {String(snapshot.stageIndex + 1).padStart(2, '0')} / 11
        <span className="ml-3 text-white">{snapshot.stage.label}</span>
      </div>

      <div className="absolute inset-x-5 bottom-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className={controlButtonClass()}
          onClick={() => {
            audio.unlock();
            director.setPlaying(!snapshot.playing);
          }}
        >
          {snapshot.playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          className={controlButtonClass(!audio.muted)}
          onClick={() => audio.toggleMuted()}
          title={
            audio.unlocked
              ? audio.muted
                ? 'Unmute ambience'
                : 'Mute ambience'
              : 'Unlock audio (silent until assets attach)'
          }
        >
          {audio.muted ? 'Muted' : 'Sound'}
        </button>
        <button
          type="button"
          className={controlButtonClass()}
          onClick={() => {
            audio.unlock();
            cycleTier();
          }}
          title="Cycle render quality (also toggles bloom / DOF)"
        >
          {profile.label}
        </button>
        <button
          type="button"
          className={controlButtonClass(profile.bloom)}
          onClick={() => {
            audio.unlock();
            setBloom(!profile.bloom);
          }}
          title="Toggle bloom"
        >
          Bloom
        </button>
        <button
          type="button"
          className={controlButtonClass(profile.dof)}
          onClick={() => {
            audio.unlock();
            setDof(!profile.dof);
          }}
          title="Toggle depth of field"
        >
          DOF
        </button>

        <div className="h-px min-w-[4rem] flex-1 overflow-hidden bg-white/20">
          <div
            className="h-full origin-left bg-white/75"
            style={{ transform: `scaleX(${overallProgress})` }}
          />
        </div>
        <Link
          href="/apps/"
          className="pointer-events-auto text-[11px] tracking-[0.18em] text-white/70 hover:text-white"
          onClick={() => audio.unlock()}
        >
          APPS
        </Link>
      </div>
    </div>
  );
}

function JourneyCanvas() {
  const { profile } = useJourneyQuality();

  return (
    <Canvas
      key={profile.tier}
      dpr={[1, profile.dprMax]}
      shadows={profile.shadows}
      camera={{ position: [0, 0.2, 5.2], fov: 46, near: 0.1, far: 100 }}
      gl={{
        antialias: profile.antialias,
        powerPreference: 'high-performance',
        alpha: false,
      }}
      style={{ touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.shadowMap.enabled = profile.shadows;
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <QualityCanvasSync />
      <JourneyClock />
      <JourneyCamera />
      <JourneyEnvironment />
      <Suspense fallback={null}>
        <JourneyLayers />
        <JourneyEffects />
      </Suspense>
    </Canvas>
  );
}

export default function WorldJourneyScene() {
  return (
    <JourneyDirectorProvider>
      <JourneyQualityProvider>
        <JourneyAudioProvider>
          <main className="fixed inset-0 h-dvh w-screen overflow-hidden bg-black">
            <JourneyCanvas />
            <JourneyHud />
          </main>
        </JourneyAudioProvider>
      </JourneyQualityProvider>
    </JourneyDirectorProvider>
  );
}
