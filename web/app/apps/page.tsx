import type { Metadata } from 'next';
import CyberpunkAppsIndex from '@/components/apps/CyberpunkAppsIndex';

export const metadata: Metadata = {
  title: 'kinsho // apps',
  description: '虚空を抜けた先の端末一覧',
};

export default function AppsPage() {
  return <CyberpunkAppsIndex />;
}
