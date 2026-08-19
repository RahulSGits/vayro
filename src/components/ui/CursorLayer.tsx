'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';

/* ==========================================================================
   CursorLayer — a precision reticle for fine pointers only.

   It never runs on touch, never runs under prefers-reduced-motion, and never
   receives a pointer event. Any element can request a state by declaring
   `data-cursor="product"` (etc.); the nearest ancestor with the attribute wins.
   ========================================================================== */

const STATES = {
  default: { ring: 0, label: '' },
  link: { ring: 34, label: '' },
  product: { ring: 74, label: 'View' },
  drag: { ring: 82, label: 'Drag' },
  explore: { ring: 92, label: 'Explore' },
  'add-to-cart': { ring: 78, label: 'Add' },
} as const;

type CursorState = keyof typeof STATES;

const INTERACTIVE = 'a[href],button,[role="button"],input,textarea,select,summary,label,[tabindex]:not([tabindex="-1"])';

function isCursorState(value: string | null | undefined): value is CursorState {
  return Boolean(value && value in STATES);
}

/** Subscribes to a media query without ever guessing during SSR. */
function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function CursorLayer() {
  const { coarsePointer, reducedMotion, pending } = useDeviceTier();
  // Fine-pointer hardware is a separate question from device tier — check both.
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

  if (pending || coarsePointer || reducedMotion || !finePointer) return null;
  return <Reticle />;
}

function Reticle() {
  const [state, setState] = useState<CursorState>('default');
  const [visible, setVisible] = useState(false);
  const [pressed, setPressed] = useState(false);
  const moved = useRef(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  // The dot tracks exactly; the ring trails it. That lag is the whole effect.
  const ringX = useSpring(x, { stiffness: 480, damping: 42, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 480, damping: 42, mass: 0.5 });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-cursor', 'on');

    const resolve = (target: EventTarget | null): CursorState => {
      if (!(target instanceof Element)) return 'default';
      const declared = target.closest('[data-cursor]');
      const value = declared?.getAttribute('data-cursor');
      if (isCursorState(value)) return value;
      return target.closest(INTERACTIVE) ? 'link' : 'default';
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x.set(event.clientX);
      y.set(event.clientY);
      if (!moved.current) {
        moved.current = true;
        ringX.jump(event.clientX);
        ringY.jump(event.clientY);
      }
      setVisible(true);
      setState(resolve(event.target));
    };

    const onPointerDown = () => setPressed(true);
    const onPointerUp = () => setPressed(false);
    const onLeave = () => setVisible(false);
    const onEnter = () => setVisible(true);
    const onBlur = () => setVisible(false);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);
    window.addEventListener('blur', onBlur);

    return () => {
      root.removeAttribute('data-cursor');
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      window.removeEventListener('blur', onBlur);
    };
  }, [x, y, ringX, ringY]);

  const { ring, label } = STATES[state];
  const dotScale = pressed ? 0.6 : state === 'default' ? 1 : 0.4;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 mix-blend-difference"
      style={{ zIndex: zIndex.cursor }}
    >
      {/* Ring — trails, expands, and carries the state label. */}
      <motion.div
        className="pointer-events-none absolute top-0 left-0 flex items-center justify-center rounded-[var(--r-pill)] border border-[var(--white)] text-[var(--white)]"
        style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
        animate={{
          width: ring || 30,
          height: ring || 30,
          opacity: visible && ring ? 1 : 0,
          scale: pressed ? 0.9 : 1,
          transition: t.standard,
        }}
        initial={false}
      >
        <AnimatePresence mode="wait">
          {label ? (
            <motion.span
              key={label}
              className="t-label-sm select-none"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0, transition: t.fast }}
              exit={{ opacity: 0, y: -4, transition: t.fast }}
            >
              {label}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* Dot — one-to-one with the hardware pointer. */}
      <motion.div
        className="pointer-events-none absolute top-0 left-0 h-1.5 w-1.5 rounded-[var(--r-pill)] bg-[var(--white)]"
        style={{ x, y, translateX: '-50%', translateY: '-50%' }}
        animate={{ scale: visible ? dotScale : 0, transition: t.fast }}
        initial={false}
      />
    </div>
  );
}
