import type { Metadata } from 'next';
import QuantumMount from '@/components/quantum/QuantumMount';
import { getSiteUrl } from '@/lib/siteUrl';

const site = getSiteUrl();

/**
 * note で貼るときは `/?from=note` を推奨（referrer でも自動検出）。
 * カード画像は opengraph-image の黒トーンと入場第一フレームが揃う。
 */
export const metadata: Metadata = {
  title: '虚空',
  description: '星塵トンネルと虚空の印 — kinsho',
  alternates: {
    canonical: `${site}/`,
  },
  openGraph: {
    title: 'kinsho — 虚空',
    description: '星塵トンネルと虚空の印',
    url: `${site}/`,
  },
  twitter: {
    title: 'kinsho — 虚空',
    description: '星塵トンネルと虚空の印',
  },
};

export default function HomePage() {
  return <QuantumMount />;
}
