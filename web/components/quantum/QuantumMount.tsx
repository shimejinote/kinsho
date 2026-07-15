'use client';

import dynamic from 'next/dynamic';

// ssr:false is only allowed inside a Client Component; keep the Canvas browser-only.
const QuantumScene = dynamic(() => import('./QuantumScene'), { ssr: false });

export default function QuantumMount() {
  return <QuantumScene />;
}
