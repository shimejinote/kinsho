/**
 * Word-dust (glyph stars) vs classic mote starfield.
 * Shared store so ParticleSwarm and the HUD toggle stay in sync.
 */

let glyphStars = false;

const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeGlyphStars(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

export function getGlyphStars(): boolean {
  return glyphStars;
}

export function setGlyphStars(next: boolean) {
  if (glyphStars === next) return;
  glyphStars = next;
  notify();
}

export function toggleGlyphStars(): boolean {
  glyphStars = !glyphStars;
  notify();
  return glyphStars;
}
