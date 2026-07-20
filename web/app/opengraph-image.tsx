import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export const alt = 'kinsho — 虚空';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * note リンクカード用。カードの黒 → 入場の黒が同じトーンでつながる。
 * (static export 時はビルドで PNG 化される)
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(ellipse at 50% 40%, #0a1520 0%, #04060a 55%, #020308 100%)',
          position: 'relative',
        }}
      >
        {/* faint star field */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            backgroundImage:
              'radial-gradient(1.5px 1.5px at 12% 22%, rgba(200,230,255,0.55), transparent), radial-gradient(1px 1px at 28% 68%, rgba(180,220,255,0.4), transparent), radial-gradient(1.5px 1.5px at 48% 18%, rgba(255,255,255,0.5), transparent), radial-gradient(1px 1px at 62% 42%, rgba(160,210,255,0.45), transparent), radial-gradient(1.5px 1.5px at 78% 72%, rgba(200,230,255,0.4), transparent), radial-gradient(1px 1px at 88% 28%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 35% 40%, rgba(180,220,255,0.35), transparent), radial-gradient(1.5px 1.5px at 55% 78%, rgba(200,230,255,0.4), transparent)',
          }}
        />
        {/* soft nucleus hint */}
        <div
          style={{
            position: 'absolute',
            width: 120,
            height: 120,
            borderRadius: 999,
            background:
              'radial-gradient(circle, rgba(120,190,220,0.35) 0%, rgba(40,90,120,0.12) 45%, transparent 70%)',
          }}
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.55em',
              color: '#6a9bb0',
              textTransform: 'uppercase',
            }}
          >
            kinsho
          </div>
          <div
            style={{
              fontSize: 72,
              letterSpacing: '0.28em',
              color: '#e8f4fa',
              fontWeight: 500,
            }}
          >
            虚空
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
