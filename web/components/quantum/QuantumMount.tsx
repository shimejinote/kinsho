'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import CyberpunkAppsIndex from '../apps/CyberpunkAppsIndex';
import appsStyles from '../apps/CyberpunkAppsIndex.module.css';
import { getActiveSky } from './dailySky';
import { isNoteInbound } from './noteInbound';
import NoteBridge from './NoteBridge';
import WarpDebugPanel from './WarpDebugPanel';
import GlyphStarsToggle from './GlyphStarsToggle';
import {
  consumeArrival,
  holdArrivalFreeze,
  resetSuction,
  settleAfterArrival,
} from './suctionInput';

const QuantumScene = dynamic(() => import('./QuantumScene'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 bg-[#04060a]" aria-hidden />
  ),
});

type Phase = 'void' | 'freeze' | 'opening' | 'apps';

const FREEZE_MS = 2000;
const APPS_WARM_MS = 320;
const VEIL_FADE_MS = 480;
const SETTLE_MS = 400;
const VOID_UNMOUNT_MS = 980;
const APPS_LIVE_MS = 740;

/**
 * Single-page void → apps handoff.
 * note inbound: optional paper→black veil only (does not block the canvas).
 */
export default function QuantumMount() {
  const [phase, setPhase] = useState<Phase>('void');
  const [voidLive, setVoidLive] = useState(true);
  const [appsMounted, setAppsMounted] = useState(false);
  const [veilMounted, setVeilMounted] = useState(false);
  const [veilOut, setVeilOut] = useState(false);
  const [freezeStyle, setFreezeStyle] = useState<CSSProperties>({});
  // Defer note detection until after mount — SSR has no window/search,
  // and useState(isNoteInbound) causes a hydration mismatch (+ Canvas crash).
  const [noteBridge, setNoteBridge] = useState(false);

  const onNoteDone = useCallback(() => setNoteBridge(false), []);

  useEffect(() => {
    if (isNoteInbound()) setNoteBridge(true);
  }, []);

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
    setNoteBridge(false);
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
          transition:
            phase === 'opening' || phase === 'apps'
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

      {noteBridge ? <NoteBridge onDone={onNoteDone} /> : null}

      {phase === 'void' && voidLive ? <WarpDebugPanel /> : null}
      {phase === 'void' && voidLive ? <GlyphStarsToggle /> : null}

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
