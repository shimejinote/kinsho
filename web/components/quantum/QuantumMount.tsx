'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, type CSSProperties } from 'react';
import CyberpunkAppsIndex from '../apps/CyberpunkAppsIndex';
import appsStyles from '../apps/CyberpunkAppsIndex.module.css';
import { getActiveSky } from './dailySky';
import {
  consumeArrival,
  holdArrivalFreeze,
  resetSuction,
  settleAfterArrival,
} from './suctionInput';

const QuantumScene = dynamic(() => import('./QuantumScene'), { ssr: false });

type Phase = 'void' | 'freeze' | 'opening' | 'apps';

const FREEZE_MS = 2000;
/** Prefetch apps tree + fonts while freeze holds. */
const APPS_WARM_MS = 320;
/** Freeze veil stays on top of iris for this long, then fades. */
const VEIL_FADE_MS = 480;
/** Release WebGL freeze after iris already covers the nucleus. */
const SETTLE_MS = 400;
/** Unmount canvas after iris fill (avoids mid-open hitch). */
const VOID_UNMOUNT_MS = 980;
/** Enable apps pointer events after iris settles. */
const APPS_LIVE_MS = 740;

/**
 * Single-page void → apps handoff.
 * Warm apps during freeze; crossfade veil → iris (no hard cut).
 */
export default function QuantumMount() {
  const [phase, setPhase] = useState<Phase>('void');
  const [voidLive, setVoidLive] = useState(true);
  const [appsMounted, setAppsMounted] = useState(false);
  const [veilMounted, setVeilMounted] = useState(false);
  const [veilOut, setVeilOut] = useState(false);
  const [freezeStyle, setFreezeStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (phase !== 'void') return;
    let raf = 0;
    const tick = () => {
      if (consumeArrival()) {
        holdArrivalFreeze();
        const fz = getActiveSky().freeze;
        setFreezeStyle({
          ['--fz-core' as string]: fz.cssCore,
          ['--fz-mid' as string]: fz.cssMid,
          ['--fz-accent' as string]: fz.cssAccent,
          ['--fz-deep' as string]: fz.cssDeep,
        });
        setVeilOut(false);
        setVeilMounted(true);
        setPhase('freeze');
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'freeze') return;
    const warm = window.setTimeout(() => setAppsMounted(true), APPS_WARM_MS);
    const open = window.setTimeout(() => setPhase('opening'), FREEZE_MS);
    return () => {
      window.clearTimeout(warm);
      window.clearTimeout(open);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'opening') return;
    setAppsMounted(true);

    // Double-rAF: paint warmed apps idle frame, then start iris (avoids layout hitch)
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setVeilOut(true));
    });

    const settle = window.setTimeout(() => settleAfterArrival(), SETTLE_MS);
    const dropVeil = window.setTimeout(() => setVeilMounted(false), VEIL_FADE_MS);
    const live = window.setTimeout(() => setPhase('apps'), APPS_LIVE_MS);
    const killVoid = window.setTimeout(() => setVoidLive(false), VOID_UNMOUNT_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(settle);
      window.clearTimeout(dropVeil);
      window.clearTimeout(live);
      window.clearTimeout(killVoid);
    };
  }, [phase]);

  const reenterVoid = () => {
    resetSuction();
    setAppsMounted(false);
    setVeilMounted(false);
    setVeilOut(false);
    setVoidLive(true);
    setPhase('void');
  };

  const irisActive = phase === 'opening' || phase === 'apps';
  const appsReveal = phase === 'opening' || phase === 'apps';
  const appsInteractive = phase === 'apps';

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-black">
      <div
        className="absolute inset-0"
        style={{
          opacity: voidLive ? (phase === 'apps' ? 0 : 1) : 0,
          transition: phase === 'opening' || phase === 'apps'
            ? 'opacity 0.55s ease-out'
            : undefined,
          visibility: voidLive ? 'visible' : 'hidden',
          pointerEvents: phase === 'void' ? 'auto' : 'none',
          willChange: phase === 'opening' ? 'opacity' : undefined,
        }}
        aria-hidden={phase !== 'void'}
      >
        {voidLive ? <QuantumScene /> : null}
      </div>

      {veilMounted ? (
        <div
          className={`${appsStyles.pshoon} ${veilOut ? appsStyles.pshoonOut : ''}`}
          style={freezeStyle}
          aria-hidden
        />
      ) : null}

      {appsMounted ? (
        <>
          <div
            className={`${appsStyles.irisBloom} ${irisActive ? appsStyles.irisBloomGo : appsStyles.irisBloomIdle}`}
            style={freezeStyle}
            aria-hidden
          />
          <div
            className={`${appsStyles.irisShell} ${irisActive ? appsStyles.irisGo : appsStyles.irisIdle} absolute inset-0 z-20`}
            style={{ pointerEvents: appsInteractive ? 'auto' : 'none' }}
            aria-hidden={!appsReveal}
          >
            <CyberpunkAppsIndex
              overlay
              reveal={appsReveal}
              onReenterVoid={reenterVoid}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
