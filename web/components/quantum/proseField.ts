/** Shared glyph-mode page formation amount (0..1) for blackout / UI. */

let amount = 0;

export function setProseField(v: number) {
  amount = Math.min(1, Math.max(0, v));
}

export function getProseField() {
  return amount;
}

export function resetProseField() {
  amount = 0;
}
