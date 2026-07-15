'use client';

import dynamic from 'next/dynamic';

const ForestScene = dynamic(() => import('./ForestScene'), { ssr: false });

export default function ForestMount() {
  return <ForestScene />;
}
