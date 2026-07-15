import type { Metadata } from 'next';
import WorldJourneyMount from '@/components/journey/WorldJourneyMount';

export const metadata: Metadata = {
  title: 'kinsho // archive — journey',
  description: 'アーカイブ: 宇宙から菌床世界へ続く55秒の旅',
};

/** Frozen snapshot of the cinematic world journey top experience. */
export default function ArchiveJourneyPage() {
  return <WorldJourneyMount />;
}
