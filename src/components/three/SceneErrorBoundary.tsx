'use client';

import { Component, type ReactNode } from 'react';

/* ==========================================================================
   A WebGL failure is never allowed to take a page down. Anything that throws
   inside the 3D tree — a driver fault, a malformed GLB, a decoder that never
   arrived — is caught here and replaced with the caller's fallback.

   Used twice: around the whole canvas (fallback = the 2D gallery) and around
   the GLB loader (fallback = the procedural shell).
   ========================================================================== */

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  /** Fires once per caught error, so the surface can log or re-route. */
  onError?: (error: Error) => void;
};

type State = { failed: boolean };

export class SceneErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
    if (process.env.NODE_ENV === 'development') {
      console.error('[vayro:three] scene failed, falling back', error);
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
