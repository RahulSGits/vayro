'use client';

import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { cn, clamp } from '@/lib/utils';
import { easeCss, motion as motionTokens, z as zIndex } from '@/lib/design-tokens';

/* ==========================================================================
   AddToCartFlight — the piece leaves the page and arrives in the bag.

   A single tile is cut from the product image, flown along a shallow arc to
   the header's cart control, and released as the control pulses. The whole
   move is one `standard` beat (340 ms) so it never delays the drawer.

   Implemented against the Web Animations API rather than React state: the
   flight outlives the component that started it (a card can unmount mid-route
   change) and nothing should re-render while it travels.

   Usage — wrap the media, trigger from anywhere inside it:

     <AddToCartFlight className="relative aspect-[3/4]">
       <Image … />
       <AddButton />           // calls fly() from useAddToCartFlight()
     </AddToCartFlight>

   Or drive it manually:

     const { fly, sourceRef } = useAddToCartFlight();
     <figure ref={sourceRef}>…</figure>
     <Button onClick={() => { add(product, variant); fly({ image: url }); }} />
   ========================================================================== */

/**
 * The header cart control. `data-cart-target` is the explicit opt-in; the
 * cursor hint is the fallback the current header already carries.
 */
export const CART_TARGET_SELECTOR = '[data-cart-target], [data-cursor="add-to-cart"]';

const FLIGHT_MS = motionTokens.duration.standard * 1000; // 340
const PULSE_MS = motionTokens.duration.fast * 1000; // 160
/** The pulse starts just before touchdown so arrival reads as one event. */
const PULSE_LEAD = 0.7;
/** Beyond this the oldest flight is dropped — rapid clicking never piles up. */
const MAX_CONCURRENT = 3;
/** The travelling tile is capped so a full-bleed hero does not fly whole. */
const MAX_TILE = 148;

type Rectish = { top: number; left: number; width: number; height: number };

export type FlightSource = HTMLElement | Rectish | null | undefined;

export type FlightOptions = {
  /** Image to carry. Falls back to a blank tile in the brand's sunken tone. */
  image?: string | null;
  /** Where the flight starts. Defaults to the nearest `<AddToCartFlight>`. */
  from?: FlightSource;
};

/* ----------------------------------------------------------------- source -- */

const FlightSourceContext = createContext<React.RefObject<HTMLElement | null> | null>(null);

export type AddToCartFlightProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Element rendered as the source box. Defaults to a plain div. */
  as?: 'div' | 'figure' | 'span';
};

/**
 * Marks a region as the origin of the flight for every descendant that calls
 * `useAddToCartFlight()`. Purely structural — it adds no styling of its own.
 */
export function AddToCartFlight({ children, className, style, as = 'div' }: AddToCartFlightProps) {
  const ref = useRef<HTMLElement | null>(null);
  const Tag = as;

  return (
    <FlightSourceContext.Provider value={ref}>
      <Tag
        ref={(node: HTMLElement | null) => {
          ref.current = node;
        }}
        className={className}
        style={style}
      >
        {children}
      </Tag>
    </FlightSourceContext.Provider>
  );
}

/* -------------------------------------------------------------- machinery -- */

const running = new Set<Animation>();

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function toRect(source: FlightSource): Rectish | null {
  if (!source) return null;
  if (typeof (source as HTMLElement).getBoundingClientRect === 'function') {
    const box = (source as HTMLElement).getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return null;
    return { top: box.top, left: box.left, width: box.width, height: box.height };
  }
  const rect = source as Rectish;
  if (!Number.isFinite(rect.width) || rect.width < 1) return null;
  return rect;
}

/** The first cart control that is actually painted. */
export function findCartTarget(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(CART_TARGET_SELECTOR));
  return nodes.find((node) => node.getClientRects().length > 0) ?? null;
}

/** Where the bag sits when the header is not on screen — the top-right corner. */
function fallbackTargetRect(): Rectish {
  return { top: 26, left: Math.max(0, window.innerWidth - 56), width: 24, height: 24 };
}

/**
 * Micro-feedback on the cart control itself. The count badge lives inside it,
 * so scaling the control pulses the badge with it.
 */
export function pulseCartTarget() {
  const target = findCartTarget();
  if (!target || typeof target.animate !== 'function' || prefersReducedMotion()) return;
  target.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.16)', offset: 0.4 },
      { transform: 'scale(1)' },
    ],
    { duration: PULSE_MS, easing: easeCss.out },
  );
}

/**
 * Flies a tile from `from` to the cart control. Resolves once the tile has
 * been released. Safe to call from anywhere on the client; a no-op on the
 * server, without a target, or under reduced motion (the badge still updates,
 * which is the information the animation was decorating).
 */
export function flyToCart({ image, from }: FlightOptions = {}): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return Promise.resolve();
  if (prefersReducedMotion()) return Promise.resolve();

  const source = toRect(from);
  if (!source) return Promise.resolve();

  const target = findCartTarget();
  const destination = target ? toRect(target) : null;
  const end = destination ?? fallbackTargetRect();

  const node = document.createElement('div');
  if (typeof node.animate !== 'function') return Promise.resolve();

  // Keep the tile in proportion but never larger than a thumbnail, and keep it
  // centred on whatever it was cut from.
  const scale = Math.min(1, MAX_TILE / Math.max(source.width, source.height));
  const width = clamp(source.width * scale, 32, MAX_TILE);
  const height = clamp(source.height * scale, 32, MAX_TILE * 1.4);
  const left = source.left + (source.width - width) / 2;
  const top = source.top + (source.height - height) / 2;

  node.setAttribute('aria-hidden', 'true');
  node.setAttribute('data-vayro-flight', '');
  node.style.cssText = [
    'position:fixed',
    `top:${top}px`,
    `left:${left}px`,
    `width:${width}px`,
    `height:${height}px`,
    `z-index:${zIndex.cursor - 1}`,
    'pointer-events:none',
    'contain:paint',
    'will-change:transform,opacity',
    'background-color:var(--bg-sunken)',
    'background-size:cover',
    'background-position:center',
    'border:1px solid var(--border)',
    'border-radius:var(--r-xs)',
    'box-shadow:var(--sh-lg)',
  ].join(';');
  // Quotes, backslashes and newlines are the only characters that could break
  // out of the url() token — everything else is legal inside it.
  if (image) node.style.backgroundImage = `url("${image.replace(/["\\\r\n]/g, '')}")`;

  document.body.appendChild(node);

  const dx = end.left + end.width / 2 - (left + width / 2);
  const dy = end.top + end.height / 2 - (top + height / 2);
  // A shallow lift keeps the path from reading as a straight linear slide.
  const lift = clamp(Math.abs(dy) * 0.34, 40, 130);

  const animation = node.animate(
    [
      { transform: 'translate3d(0,0,0) scale(1)', opacity: 1 },
      {
        transform: `translate3d(${dx * 0.52}px, ${dy * 0.44 - lift}px, 0) scale(0.6)`,
        opacity: 0.95,
        offset: 0.5,
      },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.12)`, opacity: 0 },
    ],
    { duration: FLIGHT_MS, easing: easeCss.fold, fill: 'forwards' },
  );

  running.add(animation);
  if (running.size > MAX_CONCURRENT) {
    const oldest = running.values().next().value;
    oldest?.cancel();
  }

  const pulseTimer = window.setTimeout(pulseCartTarget, FLIGHT_MS * PULSE_LEAD);

  const release = () => {
    window.clearTimeout(pulseTimer);
    running.delete(animation);
    node.remove();
  };

  return animation.finished.then(release, release);
}

/* ------------------------------------------------------------------ hook -- */

export type AddToCartFlightApi = {
  /** Launches the flight. Uses the enclosing `<AddToCartFlight>` as origin. */
  fly: (options?: FlightOptions) => void;
  /** Attach to the origin element when not using `<AddToCartFlight>`. */
  sourceRef: React.RefObject<HTMLElement | null>;
  /** Pulse the bag without a flight — for quantity bumps and re-orders. */
  pulseCart: () => void;
};

/**
 * The trigger. Product components call `fly()` immediately after `add()` so
 * the tile and the badge move together.
 */
export function useAddToCartFlight(): AddToCartFlightApi {
  const inherited = useContext(FlightSourceContext);
  const local = useRef<HTMLElement | null>(null);
  const sourceRef = inherited ?? local;

  const fly = useCallback(
    (options: FlightOptions = {}) => {
      void flyToCart({
        image: options.image,
        from: options.from ?? sourceRef.current,
      });
    },
    [sourceRef],
  );

  return useMemo(
    () => ({ fly, sourceRef, pulseCart: pulseCartTarget }),
    [fly, sourceRef],
  );
}

/* ---------------------------------------------------------------- target -- */

export type CartFlightTargetProps = {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Optional explicit landing zone. The header's bag control is found without
 * it, but any surface can claim the arrival by rendering this around itself.
 */
export function CartFlightTarget({ className, children }: CartFlightTargetProps) {
  return (
    <span data-cart-target className={cn('inline-flex', className)}>
      {children}
    </span>
  );
}
