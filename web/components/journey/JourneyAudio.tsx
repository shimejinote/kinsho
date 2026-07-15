'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Silent audio gate: unlocks after the first user gesture so ambience can
 * attach later without autoplay policy failures. No audio files are required.
 */
type JourneyAudioApi = {
  muted: boolean;
  unlocked: boolean;
  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  unlock: () => void;
};

const JourneyAudioContext = createContext<JourneyAudioApi | null>(null);

export function JourneyAudioProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const unlockedRef = useRef(false);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;
    setUnlocked(true);
    // Future: resume AudioContext / start looped ambience here.
  }, []);

  const api = useMemo<JourneyAudioApi>(
    () => ({
      muted,
      unlocked,
      setMuted: (next) => {
        unlock();
        setMuted(next);
      },
      toggleMuted: () => {
        unlock();
        setMuted((current) => !current);
      },
      unlock,
    }),
    [muted, unlocked, unlock],
  );

  return (
    <JourneyAudioContext.Provider value={api}>
      {children}
    </JourneyAudioContext.Provider>
  );
}

export function useJourneyAudio() {
  const value = useContext(JourneyAudioContext);
  if (!value) {
    throw new Error('useJourneyAudio must be used inside JourneyAudioProvider');
  }
  return value;
}
