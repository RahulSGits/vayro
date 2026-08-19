'use client';

import { useCallback, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import type { ProductHotspot } from '@/types';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { PRODUCT_VIEWS, type ProductCameraController } from './ProductCamera';

/* ==========================================================================
   ProductHotspots — annotation that rides the model.

   Markers are anchored to `ProductHotspot.anchor3d` — the same coordinates
   the catalogue publishes and the GLB's `anchor_<id>` empties are authored
   against — so a marker sits on the hem drawcord from every angle instead of
   floating over a screenshot at a fixed percentage of the frame.

   Two ways in, because the model already has an anchor mechanism:

   - `<ProductHotspots />` places the anchor groups itself. Use it in a scene
     that builds its own model tree.
   - `hotspotRenderer()` returns a `renderAnchor` function for `<JacketModel />`,
     which already positions an anchor group per hotspot and hides the whole
     set once the shell folds. Nothing is positioned twice.

   Selecting a marker moves the camera to it, when a controller is supplied:
   the rig swings round to face the anchor and dollies to reading distance.
   ========================================================================== */

export type HotspotMarkerProps = {
  hotspot: ProductHotspot;
  index: number;
  active?: boolean;
  onSelect?: (id: string | null) => void;
};

/** The marker itself — a numbered plate, not a pulsing dot. */
export function HotspotMarker({ hotspot, index, active = false, onSelect }: HotspotMarkerProps) {
  return (
    <Html center zIndexRange={[9, 0]} pointerEvents="auto">
      <button
        type="button"
        aria-label={`Detail ${index + 1}: ${hotspot.title}`}
        aria-expanded={active}
        onClick={() => onSelect?.(active ? null : hotspot.id)}
        className={cn(
          'grid h-6 w-6 place-items-center border text-[0.5rem] tracking-[0.08em]',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
          active
            ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
            : 'border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_72%,transparent)] text-[var(--fg)] backdrop-blur-sm hover:border-[var(--fg)]',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </button>
    </Html>
  );
}

export type HotspotBehaviour = {
  activeId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Selecting a marker walks the camera to its anchor. */
  camera?: ProductCameraController;
  /** Distance the camera settles at when it moves to a hotspot. */
  focusRadius?: number;
  /** Emits `3d_hotspot` when supplied. Leave unset if the scene tracks it. */
  productId?: string;
};

/** Shared click behaviour: select, move the camera, report the interaction. */
function useHotspotSelect({ onSelect, camera, focusRadius, productId }: HotspotBehaviour) {
  return useCallback(
    (hotspot: ProductHotspot, next: string | null) => {
      onSelect?.(next);
      if (next && hotspot.anchor3d) {
        camera?.focus(hotspot.anchor3d, { radius: focusRadius ?? PRODUCT_VIEWS.detail.radius });
      }
      if (next && productId) track('3d_hotspot', { productId });
    },
    [onSelect, camera, focusRadius, productId],
  );
}

export type ProductHotspotsProps = HotspotBehaviour & {
  hotspots: ProductHotspot[];
  /** Hidden while the shell folds — there is nothing left to annotate. */
  visible?: boolean;
};

/**
 * Places one anchor group per hotspot at its 3D coordinate. Mount it inside
 * whatever group carries the model so the markers inherit its transform.
 */
export function ProductHotspots({
  hotspots,
  visible = true,
  ...behaviour
}: ProductHotspotsProps) {
  const select = useHotspotSelect(behaviour);
  const anchored = hotspots.filter((hotspot) => hotspot.anchor3d);

  if (!visible || anchored.length === 0) return null;

  return (
    <group name="hotspots">
      {anchored.map((hotspot, index) => (
        <group key={hotspot.id} name={`anchor_${hotspot.id}`} position={hotspot.anchor3d}>
          <HotspotMarker
            hotspot={hotspot}
            index={index}
            active={behaviour.activeId === hotspot.id}
            onSelect={(next) => select(hotspot, next)}
          />
        </group>
      ))}
    </group>
  );
}

/**
 * A `renderAnchor` for `<JacketModel />`. The model owns the anchor groups —
 * it already positions them and hides them as the shell packs — and this
 * supplies what goes inside each one.
 *
 *   const renderAnchor = useHotspotRenderer({ activeId, onSelect, camera });
 *   <JacketModel hotspots={hotspots} renderAnchor={renderAnchor} />
 */
export function useHotspotRenderer(
  behaviour: HotspotBehaviour,
): (hotspot: ProductHotspot, index: number) => ReactNode {
  const select = useHotspotSelect(behaviour);
  const { activeId } = behaviour;

  return useCallback(
    (hotspot: ProductHotspot, index: number) => (
      <HotspotMarker
        hotspot={hotspot}
        index={index}
        active={activeId === hotspot.id}
        onSelect={(next) => select(hotspot, next)}
      />
    ),
    [select, activeId],
  );
}

export default ProductHotspots;
