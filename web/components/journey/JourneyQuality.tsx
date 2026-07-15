'use client';

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  detectQualityTier,
  nextQualityTier,
  prefersReducedMotion,
  profileForTier,
  type JourneyQualityProfile,
  type QualityTier,
} from './quality';

type JourneyQualityApi = {
  profile: JourneyQualityProfile;
  tier: QualityTier;
  setTier: (tier: QualityTier) => void;
  cycleTier: () => void;
  setBloom: (enabled: boolean) => void;
  setDof: (enabled: boolean) => void;
  bloomOverride: boolean | null;
  dofOverride: boolean | null;
};

const JourneyQualityContext = createContext<JourneyQualityApi | null>(null);

function subscribeReducedMotion(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', onStoreChange);
  return () => media.removeEventListener('change', onStoreChange);
}

export function JourneyQualityProvider({ children }: { children: ReactNode }) {
  const [tier, setTier] = useState<QualityTier>(() => detectQualityTier());
  const [bloomOverride, setBloomOverride] = useState<boolean | null>(null);
  const [dofOverride, setDofOverride] = useState<boolean | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    prefersReducedMotion,
    () => false,
  );

  const api = useMemo<JourneyQualityApi>(() => {
    const base = profileForTier(tier, reducedMotion);
    const profile: JourneyQualityProfile = {
      ...base,
      bloom: bloomOverride ?? base.bloom,
      dof: dofOverride ?? base.dof,
      reducedMotion,
    };
    return {
      profile,
      tier,
      setTier: (next) => {
        setBloomOverride(null);
        setDofOverride(null);
        setTier(next);
      },
      cycleTier: () => {
        setBloomOverride(null);
        setDofOverride(null);
        setTier((current) => nextQualityTier(current));
      },
      setBloom: (enabled) => setBloomOverride(enabled),
      setDof: (enabled) => setDofOverride(enabled),
      bloomOverride,
      dofOverride,
    };
  }, [tier, bloomOverride, dofOverride, reducedMotion]);

  return (
    <JourneyQualityContext.Provider value={api}>
      {children}
    </JourneyQualityContext.Provider>
  );
}

export function useJourneyQuality() {
  const value = useContext(JourneyQualityContext);
  if (!value) {
    throw new Error('useJourneyQuality must be used inside JourneyQualityProvider');
  }
  return value;
}
