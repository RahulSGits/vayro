'use client';

import { useEffect } from 'react';
import { SYMBOL_PATH } from '@/lib/brand-art';
import { palette, semantic } from '@/lib/design-tokens';
import { themeScript } from '@/components/providers/ThemeProvider';

/* ==========================================================================
   Global error boundary — the last document standing.

   This file replaces the root layout when the layout itself (or anything
   above every page) throws, so it renders its own `<html>` and `<body>` and
   receives none of the app's global styles, fonts or providers. Everything
   below is therefore self-contained:

   - tokens are emitted as real CSS custom properties, generated from
     `@/lib/design-tokens` — the same source `globals.css` mirrors, so the
     palette cannot drift away from the rest of the site;
   - the brand's theme script runs first, so a customer who chose light does
     not get thrown into dark at the worst possible moment (dark stays the
     default, exactly as elsewhere);
   - the symbol is drawn from `SYMBOL_PATH`, not fetched — a network request
     is the last thing to rely on in a failure document;
   - type falls back to the system UI stack, since the app's webfonts are not
     loaded here. Scale, tracking and rhythm still follow the design system.

   Metadata exports are not supported in this file, so the document title is
   set with React's `<title>`.
   ========================================================================== */

const light = semantic.light;
const dark = semantic.dark;

const STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  :root {
    color-scheme: dark;
    --bg: ${dark.bg};
    --bg-elevated: ${dark.bgElevated};
    --fg: ${dark.fg};
    --fg-muted: ${dark.fgMuted};
    --fg-subtle: ${dark.fgSubtle};
    --border: ${dark.border};
    --border-strong: ${dark.borderStrong};
    --danger: ${palette.signal};
    --gutter: clamp(1.25rem, 4vw, 3.5rem);
    --e-out: cubic-bezier(0.16, 1, 0.3, 1);
    --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  }
  :root[data-theme="light"] {
    color-scheme: light;
    --bg: ${light.bg};
    --bg-elevated: ${light.bgElevated};
    --fg: ${light.fg};
    --fg-muted: ${light.fgMuted};
    --fg-subtle: ${light.fgSubtle};
    --border: ${light.border};
    --border-strong: ${light.borderStrong};
    --danger: ${palette.danger};
  }
  body {
    margin: 0;
    min-height: 100svh;
    display: flex;
    align-items: center;
    background: var(--bg);
    color: var(--fg);
    font-family: var(--sans);
    font-size: 0.9375rem;
    line-height: 1.66;
    letter-spacing: -0.004em;
    -webkit-font-smoothing: antialiased;
  }
  .shell {
    width: 100%;
    max-width: 90rem;
    margin-inline: auto;
    padding-inline: var(--gutter);
    padding-block: clamp(4.5rem, 9vw, 8rem);
  }
  .mark { display: block; width: 15px; height: 15px; fill: currentColor; }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    font-size: 0.625rem;
    line-height: 1.1;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    font-weight: 500;
    color: var(--danger);
  }
  h1 {
    margin: 2rem 0 0;
    max-width: 16ch;
    font-size: clamp(2rem, 4.6vw, 3.5rem);
    line-height: 0.98;
    letter-spacing: -0.03em;
    font-weight: 500;
    text-wrap: balance;
  }
  p.lede {
    margin: 2rem 0 0;
    max-width: 46ch;
    font-size: 1.0625rem;
    line-height: 1.62;
    color: var(--fg-muted);
    text-wrap: pretty;
  }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 2.75rem; }
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 3.5rem;
    padding-inline: 2rem;
    border: 0;
    border-radius: 2px;
    background: var(--fg);
    color: var(--bg);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 160ms var(--e-out), color 160ms var(--e-out),
                border-color 160ms var(--e-out);
  }
  .btn:hover { background: ${palette.graphite}; color: ${palette.ivory}; }
  .btn--secondary {
    background: transparent;
    color: var(--fg);
    border: 1px solid var(--border-strong);
  }
  .btn--secondary:hover { background: var(--fg); color: var(--bg); border-color: var(--fg); }
  .btn:focus-visible, a:focus-visible {
    outline: 2px solid var(--fg);
    outline-offset: 3px;
  }
  .reference {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1.5rem;
    max-width: 34rem;
    margin-top: 3.5rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }
  .reference dt, .reference dd { margin: 0; }
  .reference dt { font-size: 0.75rem; color: var(--fg-muted); }
  .reference dd {
    font-family: var(--mono);
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    font-variant-numeric: tabular-nums;
  }
  @media (prefers-reduced-motion: reduce) {
    * { transition-duration: 0.001ms !important; }
  }
`;

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:global]', error);
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something failed — VAYRO</title>
        <meta name="robots" content="noindex" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      </head>
      <body>
        <main className="shell">
          <p className="eyebrow">
            <svg viewBox="0 0 100 100" className="mark" aria-hidden="true" focusable="false">
              <path d={SYMBOL_PATH} />
            </svg>
            <span>Something failed</span>
          </p>

          <h1>The site couldn&rsquo;t start.</h1>

          <p className="lede">
            This one is on us — a fault below every page, not in anything you did. Nothing has been
            charged and nothing has been lost. Reload, and if it happens again the digest below is
            enough for us to find the exact request.
          </p>

          <div className="actions">
            <button type="button" className="btn" onClick={() => retry()}>
              Try again
            </button>
            {/* A hard navigation, on purpose: the root layout is the thing
                that failed, so a client-side <Link /> would re-enter the same
                broken tree. Only a full document load can recover. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="btn btn--secondary" href="/">
              Return home
            </a>
          </div>

          <dl className="reference">
            <dt>Reference</dt>
            <dd>{error.digest ?? 'Not recorded'}</dd>
          </dl>
        </main>
      </body>
    </html>
  );
}
