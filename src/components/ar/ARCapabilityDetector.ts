'use client';

import { useEffect, useState } from 'react';

/* ==========================================================================
   ARCapabilityDetector — what this device can actually do.

   There are exactly three ways to put a VAYRO product into a room, and they
   are not interchangeable:

     webxr        The page keeps the model. `navigator.xr` opens an
                  immersive-ar session and we render our own scene into it.
     scene-viewer Android hands the GLB to Google Scene Viewer over an
                  `intent://` URL. The page loses the model to a native app.
     quick-look   iOS hands a USDZ to AR Quick Look through `<a rel="ar">`.

   Nothing here is inferred from a marketing string where an API exists to ask
   directly. WebXR is queried, Quick Look is feature-tested through
   `relList.supports('ar')`, and only Scene Viewer — which has no web-facing
   API at all, because the whole point is that it leaves the web — is decided
   from the platform. A capability that has not been detected is reported as
   absent, and the caller shows the 3D viewer instead. Claiming AR and then
   failing is worse than not offering it.
   ========================================================================== */

export type ARMode = 'webxr' | 'scene-viewer' | 'quick-look' | 'none';

export type ARCapability = {
  /** `navigator.xr` reports that an immersive-ar session can be started. */
  webxr: boolean;
  /** Android + Chromium — the `intent://` hand-off to Google Scene Viewer. */
  sceneViewer: boolean;
  /** iOS — the `<a rel="ar">` hand-off to AR Quick Look. */
  quickLook: boolean;
  /** The route this device should take. `none` means: do not offer AR. */
  mode: ARMode;
  /** Plain-language account of the decision, safe to show a reader. */
  reason: string;
};

export const AR_MODE_LABEL: Record<ARMode, string> = {
  webxr: 'WebXR',
  'scene-viewer': 'Scene Viewer',
  'quick-look': 'Quick Look',
  none: 'Unavailable',
};

const NO_AR = (reason: string): ARCapability => ({
  webxr: false,
  sceneViewer: false,
  quickLook: false,
  mode: 'none',
  reason,
});

/* ------------------------------------------------------------- platform -- */

function agent(): string {
  return typeof navigator === 'undefined' ? '' : navigator.userAgent;
}

function isIOS(): boolean {
  const ua = agent();
  if (/\b(iPhone|iPad|iPod)\b/.test(ua)) return true;
  // iPadOS 13+ ships the desktop Safari user agent. Touch points separate it
  // from an actual Mac, which has none.
  return /\bMacintosh\b/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1;
}

function isAndroid(): boolean {
  return /\bAndroid\b/.test(agent());
}

/**
 * Chrome or a Chromium shell that kept the Chrome token. Firefox for Android
 * carries no Chrome token and has no Scene Viewer hand-off, so it is excluded
 * explicitly rather than by omission.
 */
function isChromium(): boolean {
  const ua = agent();
  if (/\b(Firefox|FxiOS)\b/.test(ua)) return false;
  return /\b(Chrome|Chromium|CriOS)\/\d/.test(ua);
}

/**
 * The real Quick Look test. Safari — and every other iOS browser, since they
 * are all WebKit — advertises the `ar` relationship on anchors when the
 * Quick Look hand-off is available.
 */
function supportsARRelationship(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const anchor = document.createElement('a');
    return Boolean(anchor.relList && anchor.relList.supports('ar'));
  } catch {
    // `DOMTokenList.supports` throws where the token set is undefined.
    return false;
  }
}

/**
 * A Permissions-Policy that withholds `xr-spatial-tracking` stops WebXR at the
 * document level, before `isSessionSupported` is ever consulted. Reading it
 * back turns a silent "not supported" into an accurate explanation.
 */
function xrPolicyAllowed(): boolean | null {
  if (typeof document === 'undefined') return null;
  const policy = (
    document as Document & {
      featurePolicy?: { allowsFeature(feature: string): boolean };
      permissionsPolicy?: { allowsFeature(feature: string): boolean };
    }
  );
  const api = policy.permissionsPolicy ?? policy.featurePolicy;
  if (!api?.allowsFeature) return null;
  try {
    return api.allowsFeature('xr-spatial-tracking');
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------------- webxr -- */

async function detectWebXR(): Promise<{ ok: boolean; reason: string }> {
  if (!window.isSecureContext) {
    return { ok: false, reason: 'WebXR needs a secure (HTTPS) connection.' };
  }

  const xr = navigator.xr;
  if (!xr || typeof xr.isSessionSupported !== 'function') {
    return { ok: false, reason: 'This browser does not implement the WebXR Device API.' };
  }

  if (xrPolicyAllowed() === false) {
    return {
      ok: false,
      reason: 'This site withholds the xr-spatial-tracking permission, so WebXR cannot start here.',
    };
  }

  try {
    const supported = await xr.isSessionSupported('immersive-ar');
    return supported
      ? { ok: true, reason: 'This browser can open an immersive AR session.' }
      : { ok: false, reason: 'No immersive AR device is available to this browser.' };
  } catch {
    return { ok: false, reason: 'WebXR support could not be queried on this device.' };
  }
}

/* --------------------------------------------------------------- detect -- */

let cached: Promise<ARCapability> | null = null;

async function run(): Promise<ARCapability> {
  const { ok: webxr, reason: webxrReason } = await detectWebXR();
  const quickLook = isIOS() && supportsARRelationship();
  const sceneViewer = isAndroid() && isChromium();

  const mode: ARMode = webxr
    ? 'webxr'
    : sceneViewer
      ? 'scene-viewer'
      : quickLook
        ? 'quick-look'
        : 'none';

  const reason =
    mode === 'webxr'
      ? webxrReason
      : mode === 'scene-viewer'
        ? 'Android will open the model in Google Scene Viewer.'
        : mode === 'quick-look'
          ? 'iOS will open the model in AR Quick Look.'
          : isIOS() || isAndroid()
            ? `${webxrReason} This browser also offers no native AR hand-off.`
            : `${webxrReason} Desktop browsers have no camera pass-through to place a product in.`;

  return { webxr, sceneViewer, quickLook, mode, reason };
}

/**
 * Resolves what this device can do, once per session. Every path resolves —
 * a detector that rejects would take the button down with it.
 */
export function detectAR(): Promise<ARCapability> {
  if (typeof window === 'undefined') {
    return Promise.resolve(NO_AR('Capability is detected in the browser, not on the server.'));
  }
  cached ??= run().catch(() => NO_AR('AR capability could not be determined on this device.'));
  return cached;
}

/* ------------------------------------------------------------------ hook -- */

export type ARCapabilityState = ARCapability & {
  /** True until detection has resolved. Offer nothing during this window. */
  pending: boolean;
};

/**
 * The hook form. Mirrors `useDeviceTier()`: it opens `pending`, and no AR
 * affordance may be rendered until it reports otherwise.
 */
export function useARCapability(): ARCapabilityState {
  const [state, setState] = useState<ARCapabilityState>(() => ({
    ...NO_AR('Checking what this device can do.'),
    pending: true,
  }));

  useEffect(() => {
    let alive = true;
    detectAR().then((capability) => {
      if (alive) setState({ ...capability, pending: false });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
