/**
 * note → kinsho inbound detection.
 * Cross-origin View Transitions are impossible; we bridge mood instead.
 */

const NOTE_HOST =
  /^(?:[a-z0-9-]+\.)*(?:note\.com|note\.mu)$/i;

export function isNoteInbound(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const q = new URLSearchParams(window.location.search);
    const from = (q.get('from') || '').toLowerCase();
    const utm = (q.get('utm_source') || '').toLowerCase();
    if (from === 'note' || utm === 'note') return true;
  } catch {
    /* ignore */
  }

  try {
    const ref = document.referrer;
    if (!ref) return false;
    return NOTE_HOST.test(new URL(ref).hostname);
  } catch {
    return false;
  }
}
