/**
 * Void field appearance: star motes · word-dust · shimeji silhouettes.
 * Shared store so ParticleSwarm and the HUD toggle stay in sync.
 */

export type FieldMode = 'stars' | 'glyphs' | 'mushrooms';

const MODES: FieldMode[] = ['stars', 'glyphs', 'mushrooms'];

let fieldMode: FieldMode = 'stars';

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeFieldMode(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

/** @deprecated Prefer subscribeFieldMode */
export const subscribeGlyphStars = subscribeFieldMode;

export function getFieldMode(): FieldMode {
  return fieldMode;
}

export function setFieldMode(next: FieldMode) {
  if (fieldMode === next) return;
  fieldMode = next;
  notify();
}

export function cycleFieldMode(): FieldMode {
  const i = MODES.indexOf(fieldMode);
  fieldMode = MODES[(i + 1) % MODES.length]!;
  notify();
  return fieldMode;
}

/** True when drifting letters are active. */
export function getGlyphStars(): boolean {
  return fieldMode === 'glyphs';
}

export function setGlyphStars(next: boolean) {
  setFieldMode(next ? 'glyphs' : 'stars');
}

/** @deprecated Prefer cycleFieldMode — kept for old call sites. */
export function toggleGlyphStars(): boolean {
  cycleFieldMode();
  return fieldMode === 'glyphs';
}

export function getMushroomField(): boolean {
  return fieldMode === 'mushrooms';
}
