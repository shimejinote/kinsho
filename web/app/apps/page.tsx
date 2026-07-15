import type { Metadata } from 'next';
import ConstructionSite from '@/components/ConstructionSite';

export const metadata: Metadata = {
  title: 'Apps — Under Construction',
  description: 'アプリ一覧は鋭意工事中です',
};

export default function AppsPage() {
  return <ConstructionSite />;
}
