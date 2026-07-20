import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Particle Breaker · kinsho',
  description: 'レトロな粒子ブレイクアウト',
};

/**
 * Full-viewport responsive shell. Game scales inside the iframe.
 */
export default function BreakoutPage() {
  return (
    <iframe
      title="Particle Breaker"
      src="/assets/games/particle-breaker/index.html"
      allow="autoplay"
      className="fixed inset-0 h-[100dvh] w-full border-0 bg-[#06060c]"
      style={{
        // Avoid iOS toolbar jank; game handles its own safe-area padding.
        touchAction: 'none',
      }}
    />
  );
}
