import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'BRAIN MAKER · kinsho',
  description: 'Assemble an Allen brain inside the skull — kinsho terminal',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BRAIN MAKER',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#05080c',
};

/**
 * Full-viewport shell. The Three.js assemble experience lives under /assets
 * (same pattern as breakout → particle-breaker).
 */
export default function NoumaiPage() {
  return (
    <iframe
      title="BRAIN MAKER"
      src="/assets/noumai-maker/index.html"
      allow="autoplay"
      className="fixed inset-0 h-[100dvh] w-full max-h-[100dvh] border-0 bg-[#05080c]"
      style={{
        touchAction: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    />
  );
}
