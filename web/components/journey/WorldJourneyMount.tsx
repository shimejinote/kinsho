'use client';

import dynamic from 'next/dynamic';

const WorldJourneyScene = dynamic(() => import('./WorldJourneyScene'), {
  ssr: false,
});

export default function WorldJourneyMount() {
  return <WorldJourneyScene />;
}
