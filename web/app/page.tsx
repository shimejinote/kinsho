import type { Metadata } from 'next';
import QuantumMount from '@/components/quantum/QuantumMount';

export const metadata: Metadata = {
  title: 'kinsho // void',
  description: '星塵トンネルと虚空の印',
};

export default function HomePage() {
  return <QuantumMount />;
}
