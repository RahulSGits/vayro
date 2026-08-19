'use client';

import { loadStripe, type Appearance, type Stripe } from '@stripe/stripe-js';
import { env } from '@/lib/env';

/* ==========================================================================
   Stripe.js loader and appearance bridge.

   Elements render inside a cross-origin frame, so VAYRO's CSS variables never
   reach them. The palette is therefore resolved to concrete colours here and
   handed over as appearance variables — one source of truth, two renderers.
   ========================================================================== */

let stripePromise: Promise<Stripe | null> | null = null;

/** Loads Stripe.js once per session. Resolves null when no key is configured. */
export function getStripe(): Promise<Stripe | null> {
  const key = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  stripePromise ??= loadStripe(key);
  return stripePromise;
}

/**
 * Resolves CSS expressions against the live document. A probe element is used
 * rather than reading the custom property directly, so aliases such as
 * `--bg: var(--ivory)` and `color-mix()` always come back as real colours.
 */
function resolvePalette(expressions: Record<string, string>): Record<string, string> {
  const probe = document.createElement('span');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;width:0;height:0;pointer-events:none';
  document.body.appendChild(probe);

  const out: Record<string, string> = {};
  for (const [name, expression] of Object.entries(expressions)) {
    probe.style.color = '';
    probe.style.color = expression;
    out[name] = window.getComputedStyle(probe).color;
  }

  probe.remove();
  return out;
}

/** Builds the Elements appearance from the currently applied theme. */
export function buildAppearance(theme: 'light' | 'dark'): Appearance {
  const colors = resolvePalette({
    fg: 'var(--fg)',
    fgMuted: 'var(--fg-muted)',
    fgSubtle: 'var(--fg-subtle)',
    bg: 'var(--bg)',
    bgElevated: 'var(--bg-elevated)',
    border: 'var(--border-strong)',
    danger: 'var(--danger)',
    positive: 'var(--positive)',
    warning: 'var(--warning)',
  });

  const body = window.getComputedStyle(document.body);
  const fontFamily = body.fontFamily || 'ui-sans-serif, system-ui, sans-serif';

  return {
    theme: theme === 'dark' ? 'night' : 'stripe',
    variables: {
      fontFamily,
      fontSizeBase: '15px',
      spacingUnit: '4px',
      borderRadius: '3px',
      colorPrimary: colors.fg,
      colorBackground: colors.bg,
      colorText: colors.fg,
      colorTextSecondary: colors.fgMuted,
      colorTextPlaceholder: colors.fgSubtle,
      colorDanger: colors.danger,
      colorSuccess: colors.positive,
      colorWarning: colors.warning,
      iconColor: colors.fgMuted,
      tabIconColor: colors.fgMuted,
      tabIconSelectedColor: colors.fg,
    },
    rules: {
      '.Input': {
        border: `1px solid ${colors.border}`,
        boxShadow: 'none',
        backgroundColor: colors.bgElevated,
        padding: '12px',
      },
      '.Input:focus': {
        border: `1px solid ${colors.fg}`,
        boxShadow: 'none',
        outline: `1px solid ${colors.fg}`,
      },
      '.Input--invalid': { border: `1px solid ${colors.danger}`, boxShadow: 'none' },
      '.Label': {
        fontSize: '11px',
        fontWeight: '500',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: colors.fgMuted,
      },
      '.Tab': {
        border: `1px solid ${colors.border}`,
        boxShadow: 'none',
        backgroundColor: 'transparent',
      },
      '.Tab:hover': { border: `1px solid ${colors.fg}`, boxShadow: 'none' },
      '.Tab--selected': {
        border: `1px solid ${colors.fg}`,
        boxShadow: 'none',
        backgroundColor: colors.bgElevated,
        color: colors.fg,
      },
      '.Block': { border: `1px solid ${colors.border}`, boxShadow: 'none' },
      '.Error': { fontSize: '12px' },
    },
  };
}
