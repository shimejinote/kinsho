'use client';

import styles from './VoidViewport.module.css';

/**
 * Spaceship viewport glass — hull bezel + soft reflections over the void.
 * Center stays clear so the portal remains the focus.
 */
export default function VoidViewport() {
  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.hull} />
      <div className={styles.rim} />
      <div className={styles.glass} />
      <div className={styles.sheen} />
      <div className={styles.dust} />
      <div className={styles.corner} data-c="tl" />
      <div className={styles.corner} data-c="tr" />
      <div className={styles.corner} data-c="bl" />
      <div className={styles.corner} data-c="br" />
    </div>
  );
}
