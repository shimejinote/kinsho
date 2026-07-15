'use client';

import {
  Bloom,
  DepthOfField,
  EffectComposer,
  Vignette,
} from '@react-three/postprocessing';
import { useJourneyQuality } from './JourneyQuality';

/**
 * Quality-gated post stack. Bloom/DOF follow the active profile (and optional
 * overrides from the quality controls).
 */
export default function JourneyEffects() {
  const { profile } = useJourneyQuality();

  if (!profile.bloom && !profile.dof) return null;

  if (profile.bloom && profile.dof) {
    return (
      <EffectComposer
        multisampling={profile.tier === 'high' ? 2 : 0}
        enableNormalPass={false}
      >
        <Bloom
          intensity={profile.tier === 'high' ? 0.42 : 0.28}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.35}
          mipmapBlur
        />
        <DepthOfField
          focusDistance={0.028}
          focalLength={0.025}
          bokehScale={profile.tier === 'high' ? 2.1 : 1.5}
          height={480}
        />
        <Vignette eskil={false} offset={0.18} darkness={0.48} />
      </EffectComposer>
    );
  }

  if (profile.bloom) {
    return (
      <EffectComposer
        multisampling={profile.tier === 'high' ? 2 : 0}
        enableNormalPass={false}
      >
        <Bloom
          intensity={profile.tier === 'high' ? 0.42 : 0.28}
          luminanceThreshold={0.82}
          luminanceSmoothing={0.35}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.18} darkness={0.48} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <DepthOfField
        focusDistance={0.028}
        focalLength={0.025}
        bokehScale={1.5}
        height={480}
      />
      <Vignette eskil={false} offset={0.18} darkness={0.48} />
    </EffectComposer>
  );
}
