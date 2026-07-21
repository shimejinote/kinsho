import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'VOID BREAKER · kinsho',
  description: '自機が自動射撃するインベーダー寄りのブレイクアウト',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'VOID BREAKER',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#06060c',
};

/**
 * Full-viewport responsive shell. Game scales inside the iframe.
 */
export default function BreakoutPage() {
  return (
    <iframe
      title="VOID BREAKER"
      src="/assets/games/particle-breaker/index.html"
      allow="autoplay"
      className="fixed inset-0 h-[100dvh] w-full max-h-[100dvh] border-0 bg-[#06060c]"
      style={{
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  );
}
