'use client';

import { useEffect, useState } from 'react';
import type { DeviceTier } from '@/types';
import { three } from '@/lib/design-tokens';

type Capability = {
  tier: DeviceTier;
  webgl: boolean;
  reducedMotion: boolean;
  coarsePointer: boolean;
  settings: (typeof three.tiers)[DeviceTier];
  /** True until detection has run — render the 2D fallback during this window. */
  pending: boolean;
};

function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl'),
    );
  } catch {
    return false;
  }
}

function detectTier(): DeviceTier {
  if (typeof navigator === 'undefined') return 'low';
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;

  if (saveData?.saveData || saveData?.effectiveType === '2g' || saveData?.effectiveType === 'slow-2g') return 'low';
  if (cores <= 4 || memory <= 4) return coarse || narrow ? 'low' : 'medium';
  if (coarse || narrow) return 'medium';
  return cores >= 8 && memory >= 8 ? 'high' : 'medium';
}

/**
 * Decides how much WebGL this device should be asked to do.
 * The 3D layer must never be mounted before this reports `pending: false`.
 */
export function useDeviceTier(): Capability {
  const [state, setState] = useState<Capability>({
    tier: 'low', webgl: false, reducedMotion: false, coarsePointer: false,
    settings: three.tiers.low, pending: true,
  });

  useEffect(() => {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const evaluate = () => {
      const webgl = detectWebGL();
      const reducedMotion = motionQuery.matches;
      const tier: DeviceTier = !webgl || reducedMotion ? 'low' : detectTier();
      setState({
        tier, webgl, reducedMotion,
        coarsePointer: pointerQuery.matches,
        settings: three.tiers[tier],
        pending: false,
      });
    };

    evaluate();
    motionQuery.addEventListener('change', evaluate);
    pointerQuery.addEventListener('change', evaluate);
    return () => {
      motionQuery.removeEventListener('change', evaluate);
      pointerQuery.removeEventListener('change', evaluate);
    };
  }, []);

  return state;
}
