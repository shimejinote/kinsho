'use client';

import AppsDirectory from './AppsDirectory';

type Props = {
  /** Embedded over the void canvas (same URL). */
  overlay?: boolean;
  /** SPA return to the portal — preferred over a route change. */
  onReenterVoid?: () => void;
  /** When false, content stays mounted but entrance motion waits (warm preload). */
  reveal?: boolean;
};

/**
 * Post-warp destination shell. UI lives in AppsDirectory;
 * QuantumMount still imports this module for iris / veil CSS.
 */
export default function CyberpunkAppsIndex(props: Props = {}) {
  return <AppsDirectory {...props} />;
}
