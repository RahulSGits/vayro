'use client';

import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { Button, type ButtonProps } from '@/components/ui/Button';
import {
  AR_MODE_LABEL,
  useARCapability,
  type ARCapability,
} from './ARCapabilityDetector';

/* ==========================================================================
   ARButton — "View in your space".

   It renders when, and only when, a device has been measured and found
   capable. There is no disabled state and no "coming soon": on a device with
   no AR route this component returns null and the caller shows its 3D entry
   point instead. An offer the hardware cannot honour is not an offer.

   The launch is reported as the existing `3d_interaction` / `fullscreen`
   event, which is what leaving the page for a full-bleed view of the product
   already means everywhere else on the site.
   ========================================================================== */

export type ARButtonProps = {
  productId: string;
  /** Opens the AR view. The launcher owns what that means per mode. */
  onLaunch: () => void;
  /**
   * Capability from a caller that has already detected it. Omit it and the
   * button detects for itself — at the cost of a second probe.
   */
  capability?: ARCapability;
  /** Overrides the default copy. Keep it short; the type is uppercased. */
  label?: string;
  /** Shows which runtime will open — WebXR, Scene Viewer, Quick Look. */
  showMode?: boolean;
  className?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  block?: boolean;
  disabled?: boolean;
};

export function ARButton({
  productId,
  onLaunch,
  capability,
  label = 'View in your space',
  showMode = false,
  className,
  variant = 'primary',
  size = 'lg',
  block = true,
  disabled = false,
}: ARButtonProps) {
  const detected = useARCapability();
  // A supplied capability is authoritative: the launcher has already probed.
  const resolved = capability ?? (detected.pending ? null : detected);

  if (!resolved || resolved.mode === 'none') return null;

  return (
    <Button
      variant={variant}
      size={size}
      block={block}
      disabled={disabled}
      onClick={() => {
        // The coarse funnel event first — leaving the page for a full-bleed
        // view of the product is what `fullscreen` means everywhere else.
        track('3d_interaction', { productId, action: 'fullscreen' });
        // Then the intent signal the 3D taxonomy declares for exactly this.
        track('ar_clicked', { productId, mode: resolved.mode });
        onLaunch();
      }}
      data-ar-mode={resolved.mode}
      data-cursor="link"
      className={cn('gap-3', className)}
    >
      <ARGlyph />
      <span>{label}</span>
      {showMode ? (
        <span className="t-label-sm text-[color-mix(in_srgb,currentColor_60%,transparent)]">
          {AR_MODE_LABEL[resolved.mode]}
        </span>
      ) : null}
    </Button>
  );
}

/**
 * Four corner brackets around a plane — the framing mark the viewfinder puts
 * on a surface, drawn in the VAYRO line weight rather than a stock AR cube.
 */
function ARGlyph() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="square"
      aria-hidden
      focusable="false"
    >
      <path d="M1 5V1h4" />
      <path d="M11 1h4v4" />
      <path d="M15 11v4h-4" />
      <path d="M5 15H1v-4" />
      <path d="M8 5.2 11 7v3l-3 1.8L5 10V7z" />
      <path d="M8 8.4 11 7M8 8.4 5 7M8 8.4v3.4" />
    </svg>
  );
}

export default ARButton;
