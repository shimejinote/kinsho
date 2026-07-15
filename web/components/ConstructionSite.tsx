'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const SPARK_COLORS = ['#ffea00', '#ff6b00', '#ff003c', '#fff', '#00f5d4'];

function sparks(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 220,
    color: SPARK_COLORS[i % SPARK_COLORS.length],
    delay: Math.random() * 0.4,
    dur: 0.25 + Math.random() * 0.35,
    size: 2 + Math.random() * 4,
  }));
}

function dust(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 160,
    delay: Math.random() * 0.5,
    size: 3 + Math.random() * 6,
  }));
}

export default function ConstructionSite() {
  const sparkList = useMemo(() => sparks(28), []);
  const dustList = useMemo(() => dust(18), []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#12100c] text-[#f5e6c8]">
      {/* Chaos hazard stripes — overlapping layers */}
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              -28deg,
              #ffcc00 0px,
              #ffcc00 28px,
              #111 28px,
              #111 56px
            ),
            repeating-linear-gradient(
              47deg,
              transparent 0px,
              transparent 40px,
              rgba(255,0,60,0.35) 40px,
              rgba(255,0,60,0.35) 52px
            ),
            repeating-linear-gradient(
              12deg,
              transparent 0px,
              transparent 70px,
              rgba(0,0,0,0.45) 70px,
              rgba(0,0,0,0.45) 78px
            )
          `,
          backgroundBlendMode: 'normal',
          transform: 'skewY(-2deg) scale(1.15)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, transparent 0%, #12100c 72%)',
        }}
      />

      <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16">
        <motion.h1
          className="mb-10 text-center font-black tracking-tight uppercase"
          style={{
            fontFamily: 'Impact, Haettenschweiler, "Arial Black", sans-serif',
            fontSize: 'clamp(2.4rem, 10vw, 5.5rem)',
            letterSpacing: '0.06em',
            textShadow: '4px 4px 0 #000, -2px -2px 0 #ffcc00',
          }}
          animate={{
            opacity: [1, 0.15, 1, 0.25, 1],
            x: [0, -3, 4, -2, 0],
            color: ['#ffcc00', '#fff', '#ff003c', '#ffcc00'],
          }}
          transition={{ duration: 0.55, repeat: Infinity }}
        >
          工事中
          <span className="mt-1 block text-[0.45em] tracking-[0.2em] text-white">
            UNDER CONSTRUCTION
          </span>
        </motion.h1>

        <div className="relative flex h-72 w-72 items-end justify-center sm:h-80 sm:w-80">
          {/* Dust cloud */}
          {dustList.map((p) => (
            <motion.span
              key={`dust-${p.id}`}
              className="absolute bottom-8 left-1/2 block rounded-sm bg-[#8a7a5c]"
              style={{
                width: p.size,
                height: p.size,
                imageRendering: 'pixelated',
              }}
              animate={{
                x: [p.x * 0.2, p.x],
                y: [0, -30 - Math.random() * 50],
                opacity: [0.7, 0],
                scale: [1, 1.8],
              }}
              transition={{
                duration: 0.55,
                repeat: Infinity,
                delay: p.delay,
                ease: 'easeOut',
              }}
            />
          ))}

          {/* Sparks */}
          {sparkList.map((p) => (
            <motion.span
              key={`spark-${p.id}`}
              className="absolute bottom-16 left-1/2 block"
              style={{
                width: p.size,
                height: p.size,
                background: p.color,
                boxShadow: `0 0 6px ${p.color}`,
                imageRendering: 'pixelated',
              }}
              animate={{
                x: [0, p.x],
                y: [0, -40 - Math.random() * 80],
                opacity: [1, 0],
                rotate: [0, 180 + Math.random() * 180],
              }}
              transition={{
                duration: p.dur,
                repeat: Infinity,
                delay: p.delay,
                ease: 'linear',
              }}
            />
          ))}

          {/* Jackhammer shimeji */}
          <motion.div
            className="relative z-10"
            animate={{
              y: [0, -10, 2, -14, 0, -8, 0],
              rotate: [-4, 5, -6, 4, -3, 2, -4],
              x: [0, 2, -3, 3, -2, 0],
            }}
            transition={{
              duration: 0.22,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            <Image
              src="/images/shimeji.png"
              alt="建設中のしめじくん"
              width={200}
              height={250}
              className="h-auto w-36 select-none drop-shadow-[0_8px_0_#000] sm:w-44"
              style={{ imageRendering: 'pixelated' }}
              priority
            />
            {/* Drill bit streak */}
            <motion.div
              className="absolute -bottom-2 left-1/2 h-10 w-1 -translate-x-1/2 bg-gradient-to-b from-[#ffea00] to-transparent"
              animate={{ opacity: [0.2, 1, 0.2], scaleY: [0.6, 1.4, 0.6] }}
              transition={{ duration: 0.12, repeat: Infinity }}
            />
          </motion.div>

          {/* Ground tremble bar */}
          <motion.div
            className="absolute bottom-0 h-3 w-48 bg-[#ffcc00] sm:w-56"
            style={{ boxShadow: '0 0 0 4px #111' }}
            animate={{ scaleX: [1, 1.08, 0.94, 1.05, 1], y: [0, 2, -1, 2, 0] }}
            transition={{ duration: 0.18, repeat: Infinity }}
          />
        </div>

        <p
          className="mt-10 max-w-md text-center text-sm font-bold tracking-wide text-[#ffcc00] sm:text-base"
          style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
        >
          しめじくんが本気で掘っています。アプリ一覧はもう少し待ってください！！
        </p>

        <Link
          href="/"
          className="mt-8 border-4 border-[#ffcc00] bg-[#111] px-6 py-3 font-black tracking-widest text-[#ffcc00] uppercase hover:bg-[#ffcc00] hover:text-[#111]"
          style={{ fontFamily: 'Impact, "Arial Black", sans-serif' }}
        >
          ← BACK TO BLAST
        </Link>
      </div>
    </main>
  );
}
