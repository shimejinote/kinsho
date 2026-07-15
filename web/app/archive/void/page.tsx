import type { Metadata } from 'next';
import QuantumMount from '@/components/quantum/QuantumMount';

export const metadata: Metadata = {
  title: 'kinsho // archive — void',
  description: 'アーカイブ: 星塵トンネルと虚空の印',
};

/** Frozen snapshot of the starfield / void portal top experience. */
export default function ArchiveVoidPage() {
  return <QuantumMount />;
}
