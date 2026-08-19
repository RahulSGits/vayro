import type { NextConfig } from 'next';

/* ==========================================================================
   VAYRO — Next.js 16 configuration.

   Three concerns, in order of how easily they break the site:

   1. **Images.** AVIF then WebP, an explicit `qualities` allowlist (required
      from Next 16 — an open quality parameter lets anyone bill you for
      arbitrary optimisation work), and a `remotePatterns` list that is empty
      unless a Supabase project is configured. `images.domains` is deprecated
      and is not used.

   2. **Security headers.** A real Content-Security-Policy, which the WebGL
      product viewer makes non-trivial: three.js compiles workers and textures
      through `blob:`, so `worker-src`, `child-src` and `img-src` all have to
      admit it. Stripe Elements renders in a cross-origin iframe from
      js.stripe.com and posts to api.stripe.com. Supabase and PostHog origins
      are read from the environment so the policy narrows to the project
      actually in use rather than whitelisting a whole provider.

   3. **What is deliberately absent.** `cacheComponents` / PPR is NOT enabled:
      the app reads `cookies()` and `headers()` inside layouts that are not
      written for a prerendered shell, and turning it on fails the build.
      Turbopack is already the default in 16 and needs no flag.
   ========================================================================== */

const isDev = process.env.NODE_ENV === 'development';

/* ---------------------------------------------------------------- origins -- */

/** `https://abc.supabase.co` -> `https://abc.supabase.co`, or null if unset. */
function originOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const posthogOrigin = originOf(process.env.NEXT_PUBLIC_POSTHOG_HOST) ?? 'https://eu.i.posthog.com';
const usesPosthog = Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);
const usesGoogleAnalytics = Boolean(process.env.NEXT_PUBLIC_GA_ID);

/** Supabase Realtime and Auth both hold a socket open. */
const supabaseSocket = supabaseOrigin ? supabaseOrigin.replace(/^https:/, 'wss:') : null;

function join(...parts: (string | null | false | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' ');
}

/**
 * Stripe's fraud-detection origins, which are separate from js.stripe.com and
 * easy to miss: Radar loads a hidden frame from `m.stripe.network` and pings
 * `q.stripe.com`. Omitting them does not break the payment form visibly — it
 * silently starves Radar of signals and pushes up declines, which is a far
 * worse failure than a blank iframe.
 */
const STRIPE_FRAUD = 'https://m.stripe.network https://m.stripe.com';
const STRIPE_METRICS = 'https://q.stripe.com';

/* ------------------------------------------------------------------- CSP -- */

const csp = [
  `default-src 'self'`,

  // `unsafe-inline` is required for the framework's bootstrap and for the
  // inline theme script that sets the colour scheme before first paint — a
  // nonce would have to be minted per request in `src/proxy.ts`, which this
  // build does not own. `unsafe-eval` is development-only (React Refresh).
  join(
    `script-src 'self' 'unsafe-inline'`,
    isDev && `'unsafe-eval'`,
    `https://js.stripe.com ${STRIPE_FRAUD}`,
    usesGoogleAnalytics && `https://www.googletagmanager.com https://www.google-analytics.com`,
    usesPosthog && posthogOrigin,
    usesPosthog && `https://*.posthog.com`,
  ),

  // Tailwind ships a stylesheet, but `motion/react` and the 3D overlays write
  // style attributes on every frame, which `style-src` governs.
  `style-src 'self' 'unsafe-inline'`,
  `style-src-attr 'self' 'unsafe-inline'`,

  // `blob:` covers canvas readbacks and generated textures; `data:` covers the
  // inlined placeholder images `next/image` emits.
  `img-src 'self' data: blob: ${STRIPE_METRICS}`,
  `font-src 'self' data:`,

  // three.js compiles its worker bundles from object URLs. Without both of
  // these the product viewer fails to initialise on first interaction.
  `worker-src 'self' blob:`,
  `child-src 'self' blob:`,

  // GLB/GLTF assets and any generated media are fetched as blobs.
  `media-src 'self' blob: data:`,

  join(
    `connect-src 'self' blob: data:`,
    `https://api.stripe.com ${STRIPE_FRAUD} ${STRIPE_METRICS}`,
    supabaseOrigin,
    supabaseSocket,
    usesGoogleAnalytics && `https://www.google-analytics.com https://www.googletagmanager.com`,
    usesPosthog && posthogOrigin,
    usesPosthog && `https://*.posthog.com`,
    // Turbopack's HMR channel.
    isDev && `ws: wss:`,
  ),

  // Stripe Elements and 3-D Secure challenges.
  `frame-src 'self' https://js.stripe.com https://hooks.stripe.com ${STRIPE_FRAUD}`,

  `manifest-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
  // Belt and braces with X-Frame-Options below: this is the directive modern
  // browsers actually honour, and it covers nested frames the header does not.
  `frame-ancestors 'none'`,
  !isDev && `upgrade-insecure-requests`,
]
  .filter((directive): directive is string => Boolean(directive))
  .join('; ');

/* --------------------------------------------------------------- config -- */

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,

  images: {
    // AVIF first: browsers that support it get roughly 20–30% smaller files on
    // the editorial photography, and WebP catches everything else.
    formats: ['image/avif', 'image/webp'],

    // The `sizes` prop is set explicitly at every call site, so these widths
    // are the full set of variants the optimiser is allowed to produce.
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    // Required from Next 16. One value, because the design uses one.
    qualities: [75],

    // Empty until a project is configured — every remote host is blocked by
    // default, and the only one ever added is the storage bucket of the
    // Supabase project this deployment is already talking to.
    remotePatterns: supabaseOrigin
      ? [
          {
            protocol: 'https' as const,
            hostname: new URL(supabaseOrigin).hostname,
            pathname: '/storage/v1/object/public/**',
            search: '',
          },
        ]
      : [],

    // The catalogue photography is versioned by filename, so a long TTL costs
    // nothing and keeps the optimiser off the critical path.
    minimumCacheTTL: 60 * 60 * 24 * 30,

    // SVG is served straight from /public/brand as markup, never through the
    // optimiser — so the optimiser has no reason to accept it.
    dangerouslyAllowSVG: false,
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            // Every capability the storefront does not use, denied outright.
            key: 'Permissions-Policy',
            value: [
              'accelerometer=()',
              'autoplay=(self)',
              'camera=()',
              'display-capture=()',
              'encrypted-media=()',
              'fullscreen=(self)',
              'geolocation=()',
              'gyroscope=()',
              'magnetometer=()',
              'microphone=()',
              'midi=()',
              'payment=(self "https://js.stripe.com")',
              'usb=()',
              'xr-spatial-tracking=()',
            ].join(', '),
          },
          // Isolates the browsing context group without blocking the Stripe
          // popup flow, which `same-origin` would.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
      // HSTS belongs on the deployed origin only — sending it from a local dev
      // server pins localhost to HTTPS in the browser for a year. The whole
      // rule is dropped in development: Next rejects a rule whose `headers`
      // array is empty, so it cannot simply be emptied.
      ...(isDev
        ? []
        : [
            {
              source: '/:path*',
              headers: [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ],
            },
          ]),
      {
        // API responses set their own Cache-Control per route; this only stops
        // them being indexed if one is ever linked.
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        // `/_next/static` is deliberately absent: Next already serves it
        // `immutable` for a year, and overriding that header is warned about at
        // build time because it breaks dev asset invalidation.
        //
        // These are the hand-authored assets in /public, which are replaced by
        // filename rather than by hash.
        source: '/:path*.(webp|jpg|jpeg|png|avif|svg|glb|gltf|woff2)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' }],
      },
    ];
  },
};

export default nextConfig;
