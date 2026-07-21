import type { Metadata } from 'next';
import CyberpunkAppsIndex from '@/components/apps/CyberpunkAppsIndex';

export const metadata: Metadata = {
  title: '端末一覧',
  description: '公開中の接続先と、いま使える状態',
};

export default function AppsPage() {
  return <CyberpunkAppsIndex />;
}
