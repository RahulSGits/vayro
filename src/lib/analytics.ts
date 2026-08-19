'use client';

import posthog from 'posthog-js';
import { env, hasAnalytics } from '@/lib/env';

/** The complete VAYRO event taxonomy. Adding an event means adding it here. */
export type AnalyticsEvent =
  | { name: 'page_view'; props: { path: string; title?: string } }
  | { name: 'product_view'; props: { productId: string; slug: string; price: number; currency: string } }
  | { name: '3d_view_started'; props: { productId: string; tier: string } }
  | { name: '3d_interaction'; props: { productId: string; action: 'rotate' | 'zoom' | 'hotspot' | 'variant' | 'reset' | 'fullscreen' } }
  | { name: 'product_transformation_view'; props: { productId: string; progress: number } }
  | { name: 'ar_session'; props: { productId: string; mode: 'webxr' | 'scene-viewer' | 'quick-look'; action: 'start' | 'place' | 'end' } }
  /* ------------------------------------------------------------- 3D layer ---
     `3d_interaction` above stays the coarse funnel event — one name, six
     actions, easy to count. The four below are the granular signals the 3D
     layer emits at the source, where the distinction is known rather than
     inferred: a rotate is a drag or an arrow key, a zoom is a wheel or a
     second finger. Keep both. The funnel reads one, the 3D work reads the
     other, and neither has to be reconstructed from the other's shape. */
  | { name: 'model_load'; props: { productId: string; source: 'glb' | 'procedural'; ms: number } }
  | { name: '3d_rotate'; props: { productId: string } }
  | { name: '3d_zoom'; props: { productId: string } }
  | { name: '3d_hotspot'; props: { productId: string } }
  /** The shell has begun folding — by scroll or by the control bar. Once per view. */
  | { name: 'transformation_started'; props: { productId: string } }
  /** It reached the carry unit. The drop-off between the two is the metric. */
  | { name: 'transformation_completed'; props: { productId: string } }
  /** The intent to leave for AR. `ar_session` reports what happened after. */
  | { name: 'ar_clicked'; props: { productId: string; mode: 'webxr' | 'scene-viewer' | 'quick-look' | 'none' } }
  | { name: 'add_to_cart'; props: { productId: string; variantId: string; quantity: number; value: number; currency: string } }
  | { name: 'remove_from_cart'; props: { productId: string; variantId: string } }
  | { name: 'wishlist_add'; props: { productId: string } }
  | { name: 'wishlist_remove'; props: { productId: string } }
  | { name: 'checkout_started'; props: { value: number; currency: string; items: number } }
  | { name: 'checkout_step'; props: { step: number; name: string } }
  | { name: 'purchase'; props: { orderId: string; value: number; currency: string; items: number } }
  | { name: 'newsletter_signup'; props: { source: string } }
  | { name: 'search'; props: { query: string; results: number } }
  | { name: 'login'; props: { method: string } }
  | { name: 'signup'; props: { method: string } };

let started = false;

export function initAnalytics() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
      autocapture: false,
    });
  }
}

declare global {
  interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] }
}

/** Single funnel for every event. Silent no-op when analytics is not configured. */
export function track<E extends AnalyticsEvent>(name: E['name'], props: E['props']) {
  if (typeof window === 'undefined') return;
  if (process.env.NODE_ENV === 'development' && !hasAnalytics) {
    // Keeps the taxonomy verifiable locally without shipping data anywhere.
    console.debug('[vayro:analytics]', name, props);
    return;
  }
  if (env.NEXT_PUBLIC_POSTHOG_KEY) posthog.capture(name, props as Record<string, unknown>);
  if (env.NEXT_PUBLIC_GA_ID && window.gtag) window.gtag('event', name, props as Record<string, unknown>);
}

export function identify(userId: string, traits?: Record<string, unknown>) {
  if (env.NEXT_PUBLIC_POSTHOG_KEY) posthog.identify(userId, traits);
}

export function resetIdentity() {
  if (env.NEXT_PUBLIC_POSTHOG_KEY) posthog.reset();
}
