import type { ReactNode } from 'react';
import styles from './noumai.module.css';

export default function NoumaiLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.back} href="/apps/">
        ← LAB
      </a>
      {children}
    </div>
  );
}
