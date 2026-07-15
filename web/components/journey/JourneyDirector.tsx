'use client';

import {
  createContext,
  useContext,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  createJourneySnapshot,
  JOURNEY_CROSSFADE_SECONDS,
  JOURNEY_DURATION_SECONDS,
  JOURNEY_STAGE_SECONDS,
  JOURNEY_STAGES,
  type JourneyLayerFrame,
  type JourneySnapshot,
  type JourneyStageId,
} from './timeline';

type Listener = () => void;

/**
 * The sole owner of journey time and derived stage state.
 * It is intentionally independent of React's render cadence: R3F advances it,
 * render layers read it, and React subscribers are only needed for DOM UI.
 */
export class JourneyDirector {
  private snapshot: JourneySnapshot = createJourneySnapshot(0, 0, true);
  private listeners = new Set<Listener>();
  private activeListeners = new Set<Listener>();
  private activeKey = this.makeActiveKey(this.snapshot);

  getSnapshot = () => this.snapshot;
  getServerSnapshot = () => createJourneySnapshot(0, 0, true);
  getActiveKey = () => this.activeKey;
  getServerActiveKey = () => 'space:solar';

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  subscribeActive = (listener: Listener) => {
    this.activeListeners.add(listener);
    return () => this.activeListeners.delete(listener);
  };

  advance(delta: number) {
    if (!this.snapshot.playing) return;
    const safeDelta = Math.min(Math.max(delta, 0), 0.1);
    const total = this.snapshot.elapsed + safeDelta;
    const looped = total >= JOURNEY_DURATION_SECONDS;
    this.setSnapshot(
      createJourneySnapshot(
        looped ? total % JOURNEY_DURATION_SECONDS : total,
        this.snapshot.cycle + (looped ? 1 : 0),
        true,
      ),
    );
  }

  seek(elapsed: number) {
    this.setSnapshot(
      createJourneySnapshot(elapsed, this.snapshot.cycle, this.snapshot.playing),
    );
  }

  setPlaying(playing: boolean) {
    if (playing === this.snapshot.playing) return;
    this.setSnapshot({ ...this.snapshot, playing });
  }

  getLayerFrame(id: JourneyStageId): JourneyLayerFrame {
    const snapshot = this.snapshot;
    const index = JOURNEY_STAGES.findIndex((stage) => stage.id === id);
    const isCurrent = index === snapshot.stageIndex;
    const isNext =
      index === (snapshot.stageIndex + 1) % JOURNEY_STAGES.length;

    return {
      elapsed: snapshot.elapsed,
      stageElapsed: isCurrent
        ? snapshot.stageElapsed
        : isNext
          ? Math.max(
              0,
              snapshot.stageElapsed -
                (JOURNEY_STAGE_SECONDS - JOURNEY_CROSSFADE_SECONDS),
            )
          : 0,
      progress: isCurrent
        ? snapshot.stageProgress
        : isNext
          ? snapshot.transitionProgress *
            (JOURNEY_CROSSFADE_SECONDS / JOURNEY_STAGE_SECONDS)
          : 0,
      weight: isCurrent
        ? 1 - snapshot.transitionProgress
        : isNext
          ? snapshot.transitionProgress
          : 0,
      isCurrent,
      isNext,
    };
  }

  private makeActiveKey(snapshot: JourneySnapshot) {
    return `${snapshot.stage.id}:${snapshot.nextStage.id}`;
  }

  private setSnapshot(snapshot: JourneySnapshot) {
    this.snapshot = snapshot;
    const nextActiveKey = this.makeActiveKey(snapshot);
    if (nextActiveKey !== this.activeKey) {
      this.activeKey = nextActiveKey;
      this.activeListeners.forEach((listener) => listener());
    }
    this.listeners.forEach((listener) => listener());
  }
}

const JourneyDirectorContext = createContext<JourneyDirector | null>(null);

export function JourneyDirectorProvider({ children }: { children: ReactNode }) {
  const directorRef = useRef<JourneyDirector | null>(null);
  if (!directorRef.current) directorRef.current = new JourneyDirector();

  return (
    <JourneyDirectorContext.Provider value={directorRef.current}>
      {children}
    </JourneyDirectorContext.Provider>
  );
}

export function useJourneyDirector() {
  const director = useContext(JourneyDirectorContext);
  if (!director) {
    throw new Error('useJourneyDirector must be used inside JourneyDirectorProvider');
  }
  return director;
}

export function useJourneySnapshot() {
  const director = useJourneyDirector();
  return useSyncExternalStore(
    director.subscribe,
    director.getSnapshot,
    director.getServerSnapshot,
  );
}

export function useJourneyActiveKey() {
  const director = useJourneyDirector();
  return useSyncExternalStore(
    director.subscribeActive,
    director.getActiveKey,
    director.getServerActiveKey,
  );
}
