<div align="center">

# VAYRO — Deployment

**Getting the storefront onto a domain, with a database behind it, without
taking payments in test mode or leaking a service-role key.**

</div>

---

## Contents

1. [What deploys, and in what order](#1-what-deploys-and-in-what-order)
2. [Vercel](#2-vercel)
3. [Environment variables per environment](#3-environment-variables-per-environment)
4. [Supabase](#4-supabase)
5. [Seeding](#5-seeding)
6. [Payments and webhooks](#6-payments-and-webhooks)
7. [Custom domains](#7-custom-domains)
8. [Security headers](#8-security-headers)
9. [Images](#9-images)
10. [Caching, rendering and ISR](#10-caching-rendering-and-isr)
11. [Monitoring](#11-monitoring)
12. [Pre-launch checklist](#12-pre-launch-checklist)
13. [Rollback](#13-rollback)
14. [Deploying somewhere other than Vercel](#14-deploying-somewhere-other-than-vercel)

> `README.md` covers first-run setup and `ENVIRONMENT.md` documents each variable in detail.
> This file is the operational runbook: what to do, in what order, and what breaks if you do it
> in a different one.

---

## 1. What deploys, and in what order

VAYRO degrades rather than fails. With no integrations configured at all it serves the full
storefront from the seed catalogue in `src/data/catalog.ts` — 49 pages, real product data, the
3D viewer, everything except persistence and payment. That is not a demo mode bolted on; it is
the same code path with `hasSupabase === false`.

The practical consequence: **a first deploy cannot be broken by a missing key.** It can only be
incomplete. So deploy early and add integrations in order of dependency:

```
1. Deploy                          → storefront live on seed data
2. Supabase project + migrations   → schema exists, still empty
3. NEXT_PUBLIC_SITE_URL + domain   → canonicals, sitemap, OG images, auth redirects
4. Supabase auth redirect URLs     → sign-in works
5. npm run seed                    → catalogue in the database
6. Stripe / Razorpay keys          → checkout renders a payment form
7. Webhook endpoints + secrets     → orders actually complete
8. Resend                          → receipts leave the building
9. PostHog / GA                    → funnel visible
```

Each step is verifiable at `/api/health`, which reports integration booleans and nothing else —
no keys, no URLs, no masked fragments. That endpoint is the deployment's own account of itself.

```bash
curl -s https://<your-domain>/api/health | jq
```

```json
{
  "status": "ok",
  "ready": false,
  "demoCatalogue": true,
  "integrations": {
    "supabase": { "configured": false, "serviceRole": false },
    "stripe":   { "configured": false, "publishableKey": false,
                  "webhookSecret": false, "testMode": true },
    "email":    { "configured": false },
    "analytics":{ "configured": false }
  },
  "timestamp": "2026-08-19T…"
}
```

`ready` is true only when every integration needed to take a *real* order is present.
`demoCatalogue` is true whenever the storefront is rendering seed data — either because there is
no Supabase project or because the `products` table is empty. **A production deployment showing
`demoCatalogue: true` has not been seeded**, and every product page is serving fiction from the
repository rather than the database you think you are administering.

`stripe.testMode` is derived from the key's *mode*, not its value. It exists for exactly one
failure: a deployment sitting quietly on test keys while taking what look like real orders.

---

## 2. Vercel

### First deploy

1. Push to GitHub / GitLab / Bitbucket.
2. <https://vercel.com/new> → import the repository. Next.js is detected; **no build
   configuration is needed and none should be added.** Turbopack is the default in Next 16 and
   requires no flag.
3. Add environment variables (§3). Nothing is required for the build to succeed.
4. Deploy.

### Install note

`@google/model-viewer@4.3.1` declares `three@^0.183.0` as a peer dependency while this repository
pins `three@^0.185.1`. That range does not formally admit 0.185, so **a clean `npm install` may
report an `ERESOLVE` peer conflict.** The committed `package-lock.json` resolves it, and CI
installs should use it:

```bash
npm ci        # honours the lockfile; this is what a deployment should run
```

If a platform insists on `npm install` and stops on the peer conflict, `--legacy-peer-deps` is
the escape hatch. Prefer fixing the range: either pin `three` to 0.183.x or wait for
model-viewer to widen its peer range. Do not silently upgrade past it and assume the mismatch is
theoretical — model-viewer bundles its own three.js internally, so the two do coexist, but a
three.js API removal is exactly the kind of thing that surfaces at runtime in the AR view only.

### Node version

Node **20.9+** runs the app. **22.18+** is required to run `npm run seed`, which imports
`src/data/catalog.ts` through Node's built-in type stripping. Set the Vercel project's Node
version to 22.x so a local seed and a deployed build agree.

### Regions

Nothing in the app is region-pinned. If Supabase is provisioned in a specific region, put the
Vercel functions in the same one — every catalogue read on a configured deployment is a
round-trip to Postgres (§10), and cross-continent latency shows up directly in TTFB.

---

## 3. Environment variables per environment

Complete reference in `ENVIRONMENT.md`. This is the deployment-shaped view.

### The scoping table

| Variable | Production | Preview | Development |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | the real domain | the preview URL | `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | `INR` | `INR` | `INR` |
| `NEXT_PUBLIC_SUPABASE_URL` | production project | **staging project** | local or staging |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | production project | staging project | local or staging |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | staging only | local only |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | as enabled in Supabase | same | usually empty |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **live** `pk_live_…` | test `pk_test_…` | test |
| `STRIPE_SECRET_KEY` | **live** `sk_live_…` | test `sk_test_…` | test |
| `STRIPE_WEBHOOK_SECRET` | production endpoint | preview endpoint | Stripe CLI |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `rzp_live_…` | `rzp_test_…` | test |
| `RAZORPAY_WEBHOOK_SECRET` | production endpoint | preview endpoint | — |
| `PAYMENT_PROVIDER` | `stripe` or `razorpay` | same | same |
| `RESEND_API_KEY` | ✅ | optional | optional |
| `RESEND_FROM` | a verified sender on your domain | same | anything |
| `ADMIN_EMAIL` | where `/api/contact` routes enquiries | optional | optional |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | ✅ | separate project, or omit | omit |
| `NEXT_PUBLIC_GA_ID` | optional | ❌ | ❌ |
| `SENTRY_DSN` | ✅ | optional | ❌ |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | ❌ **never** | ❌ never | local only |
| `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` | ❌ **never** | ❌ never | local only |

### Rules that are not negotiable

- **`SUPABASE_SERVICE_ROLE_KEY` must never carry the `NEXT_PUBLIC_` prefix.** It bypasses Row
  Level Security entirely. Prefixed, Next.js inlines it into the client bundle and every visitor
  has full database access. This is the single worst mistake available in this repository.
- **A preview deployment must not point at the production database.** Preview branches run
  unreviewed code with a service-role key. Provision a second Supabase project for Preview, or
  leave Supabase unset there and let previews run on seed data — which is a perfectly good way
  to review a UI change.
- **`RAZORPAY_KEY_ID` is publishable but deliberately not `NEXT_PUBLIC_`.** The checkout route
  hands it out alongside the order it belongs to rather than baking it into every bundle. Do not
  "fix" this by adding the prefix.
- **`SEED_*` belongs nowhere but a local `.env.local`.** The values in `.env.example` are
  deliberately obvious placeholders. A deployed environment that carries them is one seed run
  away from a known-password admin account.

### `NEXT_PUBLIC_SITE_URL` is load-bearing

`metadataBase`, canonical URLs, `sitemap.xml`, `robots.txt`, JSON-LD, OpenGraph images and the
auth callback all read `env.siteUrl`, which defaults to `http://localhost:3000` when the variable
is absent. **Set it and redeploy** — the value is read at build time for statically generated
metadata, so changing it in the dashboard without a redeploy leaves half the site advertising
localhost.

### Changing a variable

Environment variables are baked into the build for anything `NEXT_PUBLIC_`, and read at request
time for the rest. Either way: **change it, then redeploy.** Vercel will not rebuild on a
variable change by itself.

---

## 4. Supabase

### 4.1 Create the project

Two projects, not one: `vayro-production` and `vayro-staging`. Choose the region closest to the
Vercel functions. Keep the database password in the password manager — it is not one of the
application's environment variables and is needed only for direct `psql` access.

### 4.2 Copy the keys

Project Settings → API:

| Supabase field | Environment variable | Public? |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | yes |
| `anon` `public` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes — it is public by design, RLS is the boundary |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | **no** |

### 4.3 Run the migrations

Two files, applied **in order**, both idempotent enough to survive a re-run:

```
supabase/migrations/0001_init.sql     schema, RLS, read model, admin views
supabase/migrations/0002_extend.sql   product_materials, AR fields, coupons, payment_provider
```

Via the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or by hand — SQL Editor → paste `0001_init.sql` → Run → then `0002_extend.sql` → Run.

**`0001_init.sql` is immutable.** It is the migration every existing database has already
applied. `0002_extend.sql` is strictly additive and says so in its own header: nothing it does
alters, drops or redefines anything `0001` created except through `add column if not exists`.
Every `create type` is wrapped in a `duplicate_object` guard and every index is
`if not exists`, so a partially-applied run can simply be repeated.

Follow the same discipline for `0003` and onward. A migration that edits an earlier migration is
a migration that has already diverged from production.

### 4.4 What the schema gives you

`0001_init.sql` creates 22 tables with **Row Level Security enabled on every one of them**.
The policy shape, in one paragraph: published catalogue data is world-readable; profiles,
addresses, carts and wishlists are owner-scoped; orders are readable by their owner and writable
only through the service role; reviews may be submitted by an authenticated user but are
published only by an admin; newsletter signups are insert-only and never readable from the
client; analytics events are write-only. Admin access is granted by the `user_role` on
`public.profiles` through the `is_admin()` function — **never by anything the client sends.**

RLS is the real boundary. `src/proxy.ts` redirecting a signed-out visitor away from `/admin` is
an optimisation; `requireAdmin()` in `src/lib/auth.ts` is an authorisation check; the RLS policy
is what actually stops the query. See `ARCHITECTURE.md` §8.

`0002_extend.sql` adds what the 3D and AR layers need — `product_materials`, and `ar_enabled`,
`usdz_url` and `real_world_dimensions` on `product_3d_models` — plus real coupons and
`orders.payment_provider` / `payment_reference` so a second payment rail can key its webhooks on
something that is not named `stripe`.

### 4.5 Auth configuration

Authentication → URL Configuration:

- **Site URL:** `https://<your-domain>`
- **Redirect URLs:** add `https://<your-domain>/auth/callback`. Add the preview pattern too if
  previews need working sign-in — `https://*-<team>.vercel.app/auth/callback`.

Then Authentication → Providers: enable what you intend to offer, and **list the same providers
in `NEXT_PUBLIC_AUTH_PROVIDERS`** (`google`, `apple`). Supabase does not publish its enabled
provider list, so the storefront has to be told. A provider enabled in Supabase but missing from
the variable renders as a disabled button with the reason attached, rather than a control that
fails on click — which is the honest failure, but it is still a failure.

### 4.6 Storage, if you use it

`next.config.ts` adds a `remotePatterns` entry for `<project>.supabase.co/storage/v1/object/public/**`
**only when `NEXT_PUBLIC_SUPABASE_URL` is set at build time.** Set the variable before the build
that needs to serve bucket images, or `next/image` will refuse the hostname. No other remote host
is ever permitted.

---

## 5. Seeding

```bash
npm run seed
```

Populates a migrated project from the same catalogue the storefront renders in demo mode: four
products with variants, inventory, images, 3D model records and hotspots; collections;
categories; six journal posts; store settings; and the demo accounts from `SEED_*`.

**Requirements:** `SUPABASE_SERVICE_ROLE_KEY` (seeding writes across every catalogue table and
creates auth users — RLS correctly refuses that to the anon key) and Node 22.18+.

**Re-running is safe and expected.** Every write is an upsert on a natural key — slug, SKU,
variant id, settings key — and the two child tables with no natural key, images and 3D models,
are replaced per product rather than appended to. Seed twice, get the same database.

**What it will never do:** delete anything it did not write, truncate a table, or touch an order,
customer, review or newsletter subscriber.

### After seeding a production database

The seed writes demo material that must not survive launch:

- Two `isDemo` reviews. Remove them or replace them with real, verified reviews.
- Demo discount codes `FIRSTLAYER` and `FIELDTEST`. `0002_extend.sql` adds a real `coupons`
  table; move to server-validated codes and delete the demo pair.
- The `SEED_*` accounts. Change the passwords or delete the users outright, then remove the
  variables from the environment.

Confirm with `curl .../api/health` that `demoCatalogue` has flipped to `false`.

---

## 6. Payments and webhooks

Two independent rails. Both can be configured at once; `PAYMENT_PROVIDER` selects the default.
**Naming a provider does not configure it** — if its keys are absent the checkout says so rather
than silently falling back, because a silent downgrade shows a payment form the environment
cannot honour.

### Stripe

1. Keys → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY`. **Live keys in
   Production, test keys everywhere else.**
2. Webhooks → add `https://<your-domain>/api/webhooks/stripe`, copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`, redeploy.
3. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the printed
   `whsec_…`.

`/api/webhooks/stripe` exports `dynamic = 'force-dynamic'` — it must read the raw body to verify
the signature, and a cached webhook is not a webhook.

### Razorpay

1. Dashboard → Account & Settings → API Keys → `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Settings → Webhooks → `https://<your-domain>/api/webhooks/razorpay`. The secret is **chosen by
   you**, not issued; put the same value in `RAZORPAY_WEBHOOK_SECRET`.
3. Subscribe to: `payment.captured`, `payment.failed`, `order.paid`, `refund.created`,
   `refund.processed`.

Without `RAZORPAY_WEBHOOK_SECRET` the route refuses every request. Signature verification is
never optional and there is no development bypass.

### The pricing rule

Prices are computed server-side from the catalogue, never trusted from the client. A basket
arriving at `/api/checkout/intent` is re-priced before a PaymentIntent is created. Do not add a
code path that takes an amount from the browser.

---

## 7. Custom domains

1. Vercel → Project → Settings → Domains → add the apex and the `www` variant, and pick which
   one redirects to the other.
2. Add the DNS records Vercel prints. Certificates are issued automatically.
3. **Set `NEXT_PUBLIC_SITE_URL` to the canonical domain and redeploy.** Metadata, canonicals,
   `sitemap.xml`, `robots.txt`, JSON-LD and OG images all read it, and several are baked at build
   time.
4. Update Supabase → Authentication → URL Configuration to the new domain.
5. Update the Stripe and Razorpay webhook endpoints to the new domain.
6. Re-run `curl https://<domain>/api/health`.

### HSTS and the apex

`next.config.ts` sends `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
in production only — never in development, because sending it from a local server pins
`localhost` to HTTPS in the browser for two years.

`includeSubDomains` is real: **every subdomain of the apex must be HTTPS-capable before the first
production response goes out.** A plain-HTTP `staging.` or `mail.` host becomes unreachable in
any browser that has seen the header. Check what else lives on the domain before launch.

`preload` is a claim of intent, not an enrolment. Submitting to <https://hstspreload.org> is a
separate, deliberate, and effectively irreversible step. Do not submit until the subdomain
question above is settled.

---

## 8. Security headers

All set in `next.config.ts` under `headers()`, applied to `/:path*`. They are not decoration —
each one closes a specific attack.

| Header | Value | What it prevents |
| --- | --- | --- |
| `Content-Security-Policy` | see below | Injected script executing; data exfiltration to an attacker's origin |
| `X-Frame-Options` | `DENY` | Clickjacking — a checkout button framed invisibly over something else |
| `frame-ancestors 'none'` (in CSP) | — | The same, for browsers that honour CSP over the legacy header, including nested frames the header misses |
| `X-Content-Type-Options` | `nosniff` | An uploaded file being re-interpreted as script |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Order numbers and account paths leaking in the `Referer` to third parties |
| `Permissions-Policy` | everything denied except `autoplay`, `fullscreen`, `payment` | A compromised script silently opening the camera, microphone or geolocation |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Cross-window scripting, while still allowing the Stripe popup flow that `same-origin` would break |
| `Strict-Transport-Security` | 2 years, subdomains, preload — production only | Protocol downgrade and cookie interception |
| `X-Robots-Tag: noindex, nofollow` on `/api/*` | — | API responses being indexed if one is ever linked |

### The CSP, and why it is shaped the way it is

The policy narrows to the integrations actually configured: Supabase and PostHog origins are read
from the environment at build time, so an unconfigured deployment does not whitelist a whole
provider it never talks to.

Three directives exist specifically because of the WebGL product viewer:

```
worker-src 'self' blob:
child-src  'self' blob:
img-src    'self' data: blob:
```

**`worker-src blob:` is not optional.** three.js's `DRACOLoader` and the KTX2 transcoder compile
their worker bundles from object URLs — `new Worker(URL.createObjectURL(blob))`. Without it the
product viewer fails to initialise on first interaction, with a console error and no visible
cause on the page. `child-src` is the legacy fallback directive for the same workers, which some
engines still consult. `img-src blob:` covers canvas readbacks and generated textures; `data:`
covers the inlined placeholders `next/image` emits.

Two more that surprise people:

- `script-src` carries `'unsafe-inline'` because the framework's bootstrap and the inline theme
  script (which sets the colour scheme before first paint, to avoid a flash) both need it. A
  nonce would have to be minted per request in `src/proxy.ts`, which this build does not do.
  `'unsafe-eval'` is **development only**, for React Refresh.
- Stripe's fraud origins — `m.stripe.network`, `m.stripe.com`, `q.stripe.com` — are separately
  listed and easy to miss. Omitting them does not visibly break the payment form; it silently
  starves Radar of signals and pushes up declines, which is a far worse failure than a blank
  iframe.

### The one header AR will need changed

`Permissions-Policy` currently sends **`xr-spatial-tracking=()`**, which denies WebXR at the
document level — before `navigator.xr.isSessionSupported()` is ever consulted. See
`AR_ARCHITECTURE.md` §2. Enabling in-page WebXR is a one-token change to `self`, and it is a
deliberate decision rather than a bug fix: it widens the permission surface of every page on the
site.

### Verifying

```bash
curl -sI https://<your-domain>/ | grep -iE 'content-security|strict-transport|x-frame|permissions|referrer|x-content'
```

Then run the deployed origin through <https://securityheaders.com> and check the browser console
on `/product/meridian-carry-shell` for CSP violations — the 3D viewer is the page most likely to
trip one.

> **Pre-flight for the first Draco-compressed GLB.** Chromium requires `'wasm-unsafe-eval'` (or
> `'unsafe-eval'`) in `script-src` to compile WebAssembly. Production `script-src` has neither.
> Nothing is broken today, because with no GLB in `public/models/` the decoder is never fetched —
> but the first compressed asset must be tested in Chrome against the production headers, and
> the token added if the decoder is blocked. A CSP refusal *throws*; it does not degrade.
> See `3D_ARCHITECTURE.md` §12.

---

## 9. Images

Configured in `next.config.ts`:

| Setting | Value | Reason |
| --- | --- | --- |
| `formats` | `['image/avif', 'image/webp']` | AVIF first — roughly 20–30% smaller on the editorial photography; WebP catches the rest |
| `deviceSizes` | 360 … 3840 | Every call site sets `sizes` explicitly, so this is the complete variant set |
| `imageSizes` | 16 … 384 | Thumbnails and swatches |
| `qualities` | `[75]` | **Required from Next 16.** An open quality parameter lets anyone bill you for arbitrary optimisation work |
| `remotePatterns` | Supabase storage only, and only when configured | Every other remote host is blocked. `images.domains` is deprecated and not used |
| `minimumCacheTTL` | 30 days | The catalogue photography is versioned by filename |
| `dangerouslyAllowSVG` | `false` | SVG is served straight from `/public/brand` as markup, never through the optimiser |

The hand-authored assets in `/public` get an explicit cache header:

```
/:path*.(webp|jpg|jpeg|png|avif|svg|glb|gltf|woff2)
  Cache-Control: public, max-age=2592000, stale-while-revalidate=86400
```

`/_next/static` is deliberately **absent** from that rule — Next already serves it `immutable`
for a year, and overriding the header is warned about at build time because it breaks dev asset
invalidation.

**On cost:** image optimisation is metered on Vercel. Everything in `public/media/` is generated
by `scripts/build-media.mjs` and ships as both `.webp` and `.jpg`, so the optimiser is
transforming already-optimised source. If billing becomes a concern, the honest lever is to serve
the generated plates unoptimised (they are already sized and compressed) rather than to widen
`qualities` or narrow `deviceSizes`.

---

## 10. Caching, rendering and ISR

### The behaviour that will surprise you

**There is no `revalidate` export anywhere in the app, and no ISR.** Routes are either
prerendered once at build or rendered per request. Whether a given page is one or the other
depends on something that is not visible in the page's own source: **whether Supabase was
configured at build time.**

`createClient()` in `src/lib/supabase/server.ts` calls `await cookies()` — but only when
`hasSupabase` is true. So:

| Build-time environment | What the catalogue pages become |
| --- | --- |
| No `NEXT_PUBLIC_SUPABASE_*` | Static. The repo layer returns the seed catalogue without touching cookies, and Next prerenders the page |
| Supabase configured | Dynamic. The first `cookies()` read opts the route out of static rendering; every request renders and queries Postgres |

The current build (demo mode) prerenders **49 routes**, every one of them with
`initialRevalidateSeconds: false` — generated once, never revalidated. Three dynamic segments —
`/product/[slug]`, `/journal/[slug]`, `/ar/[slug]` — render on demand for any slug outside
`generateStaticParams()`.

A further set is server-rendered on demand in **every** environment, demo or not, because they
read something request-specific by their nature: `/shop` (driven by `searchParams`), the auth
screens, and everything under `/account` and `/admin` (behind `requireUser()` /
`requireAdmin()`). Those are correct as dynamic and should stay that way.

**A configured production deployment therefore has no page cache at all.** Every product page
view is a database round-trip. That is correct and safe — it is never stale, and RLS applies per
request — but it is a deliberate trade, and it is the first thing to look at if TTFB is
disappointing under load.

If you want a cache, the options in ascending order of intrusiveness:

1. **Co-locate.** Put the Vercel functions in Supabase's region. Cheapest win by a distance.
2. **Add `export const revalidate = <seconds>` to the catalogue routes.** Only valid for pages
   that do not need per-user data — the storefront's product and journal pages qualify; account
   and admin do not. Note that a route which reads cookies cannot be revalidated; the repo layer
   would need a cookie-free read path for anonymous catalogue queries.
3. **Cache in the repo layer**, not in the pages. `src/lib/repo/products.ts` already wraps every
   read in React `cache()` for per-request deduplication; a `use cache` boundary or a Runtime
   Cache read would extend that across requests.

Do **not** reach for `cacheComponents` / PPR. `next.config.ts` says why, and it is not a style
preference: the app reads `cookies()` and `headers()` inside layouts that are not written for a
prerendered shell, and enabling it fails the build.

### `generateStaticParams` reads the seed catalogue, not the database

Deliberately. The repo layer is request-scoped — it reads cookies so RLS applies — and there is
no request at build time. Slugs that exist only in Supabase still render, on demand; they are
simply not prerendered. **A newly added product is live immediately and needs no rebuild.**

### API route caching

| Route | Cache-Control | Note |
| --- | --- | --- |
| `/api/products`, `/api/products/[slug]`, `/api/search` | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` | Fresh at the edge for a minute, stale-served for five |
| Everything else | `no-store` | The default in `jsonResponse()` |
| `/api/health` | `no-store` | The answer changes when the environment does; a stale "everything is fine" is worse than no probe |
| `/api/webhooks/*` | `dynamic = 'force-dynamic'` | Raw body required for signature verification |

### Revalidation on write

Admin and account mutations call `revalidatePath()` — `src/app/admin/actions.ts` revalidates
`/admin` plus the affected paths, `src/app/account/actions.ts` revalidates `/account` as a
layout. That is the only cache invalidation in the app, and it is enough precisely because there
is no ISR to invalidate.

### Rate limiting is per-instance

`src/lib/rate-limit.ts` is an in-memory sliding-log limiter. On a single Node server that is the
whole truth; **on Vercel, each serverless instance enforces its own share of the budget**, so the
effective limit is the policy multiplied by the number of warm instances.

That is a deliberate floor, not a ceiling — it stops naive abuse and accidental loops without
adding a network dependency to routes that must keep working when every integration is absent.
The current policies:

```
search 40/min · products 120/min · analytics 240/min · orderLookup 60/min
checkout 20/10min · orders 10/10min · newsletter 5/10min · contact 3/10min
```

`RateLimitStore` is the only seam. Implement it once against Upstash or Redis, call
`setRateLimitStore()` from server bootstrap, and every route inherits the shared limiter with no
route changes. **Do this before any marketing push** — the contact and newsletter policies in
particular are the ones an attacker notices are per-instance.

---

## 11. Monitoring

### What exists in the repository

| Hook | Where | What it does |
| --- | --- | --- |
| `/api/health` | `src/app/api/health/route.ts` | Integration booleans and `demoCatalogue`. Uncached. Point an uptime check at it |
| `logRouteError(scope, error, context)` | `src/app/api/_lib/http.ts` | The single log shape for every route failure: `[vayro:api:<scope>] Name: message { context }`. **Messages only** — a provider payload with a key in it never reaches the log |
| The error envelope | same | `{ error, message, code, fields? }`. `code` is the stable machine-readable slug and the only field a client should branch on |
| `track()` | `src/lib/analytics.ts` | A closed event union. Adding an event means adding it to the type |
| `analytics_events` table | `0001_init.sql` | First-party event persistence via `POST /api/analytics` (202 Accepted). Insert-only from clients, admin-readable |
| `error.tsx` / `global-error.tsx` | `src/app/` | Per-segment boundaries plus a self-contained root failure document that renders its own `<html>`, inlines the design tokens and draws the mark from geometry — no network request in a failure document |
| `SENTRY_DSN` | `serverEnv()` | **Read but not yet wired.** See below |

### Uptime and alerting

```
GET /api/health   →   alert on: HTTP != 200
                      alert on: .ready === false        (an integration dropped out)
                      alert on: .demoCatalogue === true (the database went away)
```

That last one is the valuable alert. If Supabase becomes unreachable, the repo layer falls back
to the seed catalogue and **the storefront keeps serving a complete, plausible, wrong catalogue**
with no visible error. Graceful degradation is the right product behaviour and the worst possible
silent failure. `demoCatalogue: true` on production is the only signal you get.

### Wiring Sentry

`SENTRY_DSN` is plumbed through `serverEnv()` and nothing consumes it yet. To finish it:

1. `npm install @sentry/nextjs`
2. Add `instrumentation.ts` at the project root with the server and edge `init` calls, plus
   `instrumentation-client.ts` for the browser.
3. Route `logRouteError()` through `Sentry.captureException()` — it is already the single funnel
   for every route failure, so one change covers every API route.
4. Add `https://*.sentry.io` to `connect-src` in the CSP. **The report will be blocked
   otherwise**, and a monitoring tool that cannot report is worse than none because it looks
   installed.

`instrumentation.ts` is also where `setRateLimitStore()` belongs (§10), so the two land together.

### Analytics

PostHog is initialised with `capture_pageview: false`, `autocapture: false` and
`person_profiles: 'identified_only'` — nothing is collected that the taxonomy did not ask for.
GA runs alongside if `NEXT_PUBLIC_GA_ID` is set. With neither configured, `track()` logs to the
console in development and is a silent no-op in production, so the taxonomy stays verifiable
locally without shipping data anywhere.

Both providers must be in the CSP, and both are — conditionally, only when their key is present.

---

## 12. Pre-launch checklist

### Secrets and accounts

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set, and carries **no** `NEXT_PUBLIC_` prefix
- [ ] `SEED_*` variables removed from every deployed environment
- [ ] Seeded demo passwords changed, or the demo accounts deleted
- [ ] Preview environment points at a **staging** Supabase project, not production
- [ ] At least one real admin account exists, with a password that was never in a file

### Configuration

- [ ] `NEXT_PUBLIC_SITE_URL` is the real domain, and the site has been **redeployed since**
- [ ] Supabase Site URL and `/auth/callback` redirect allow-listed
- [ ] `NEXT_PUBLIC_AUTH_PROVIDERS` matches what is actually enabled in Supabase
- [ ] `RESEND_FROM` is a verified sender on the real domain
- [ ] `PAYMENT_PROVIDER` names a rail whose keys are actually present

### Commerce

- [ ] Stripe on **live** keys — confirm `stripe.testMode === false` at `/api/health`
- [ ] Stripe webhook endpoint registered, secret copied back, a test event delivered
- [ ] Razorpay webhook registered with the five events, if that rail is in use
- [ ] A full order placed end-to-end on the production domain, with a real card, and refunded
- [ ] Receipt email received
- [ ] Demo discount codes `FIRSTLAYER` and `FIELDTEST` replaced with server-validated coupons
- [ ] The two `isDemo` seed reviews removed or replaced with real, verified reviews

### Data

- [ ] Both migrations applied to production
- [ ] `npm run seed` run, and `/api/health` reports `demoCatalogue: false`
- [ ] Spot-check RLS: sign in as a customer, attempt to read another user's order, confirm it
      returns nothing

### Correctness

- [ ] `npm run verify` passes — typecheck, lint, production build
- [ ] `/api/health` reports every expected integration `true` and `ready: true`
- [ ] `sitemap.xml` lists the public surface and **never** `/account`, `/admin`, `/cart`,
      `/checkout` or the auth screens
- [ ] `robots.txt` points at the real domain

### Front of house

- [ ] Security headers verified on the deployed origin (§8)
- [ ] No CSP violations in the console on `/`, `/product/meridian-carry-shell` and `/checkout`
- [ ] The 3D viewer runs on a real phone, and the 2D fallback renders with WebGL disabled
- [ ] Reduced-motion honoured: the hero and transformation drop to stills, the viewer starts
      still
- [ ] The AR entry point is absent — not disabled — on a device with no AR route
      (`AR_ARCHITECTURE.md` §2)
- [ ] Light and dark themes both checked on the hero, where the lighting rig is pinned

### Operations

- [ ] Uptime check on `/api/health`, alerting on `ready: false` **and** `demoCatalogue: true`
- [ ] Error reporting wired, or a dated decision recorded that it is not
- [ ] A shared rate-limit store configured, or the per-instance limitation accepted in writing
- [ ] Someone other than the deployer can perform a rollback (§13)

---

## 13. Rollback

### Instant — the deployment itself

Vercel keeps every previous deployment immutable and addressable.

1. Vercel → Project → Deployments
2. Find the last known-good build
3. **⋯ → Promote to Production** (or **Instant Rollback** from the current deployment)

This is a routing change, not a rebuild. It takes seconds and needs no CI. **It is the correct
first move in almost every incident** — diagnose from a working site.

```bash
vercel rollback                       # the previous production deployment
vercel promote <deployment-url>       # a specific one
```

### What a rollback does not undo

| Changed | Reverted by promoting an old build? |
| --- | --- |
| Application code | ✅ |
| Static assets, prerendered pages | ✅ |
| Environment variables | ❌ — dashboard state, independent of the deployment |
| Database schema | ❌ — a migration is not part of the build |
| Seeded or written data | ❌ |
| Stripe / Razorpay webhook registration | ❌ — provider-side |
| Supabase auth redirect URLs | ❌ — provider-side |

**The trap:** a deploy that shipped code *and* a migration cannot be undone by promoting the old
build alone. The old code will meet the new schema. Which is precisely why `0002_extend.sql` is
strictly additive — additive migrations are backward-compatible with the deployment that
preceded them, and a rollback stays a one-click operation.

**Make that a rule, not a habit.** Additive-only migrations; never drop or rename a column in the
same release that stops using it. Two releases: one that stops writing it, one that drops it.

### Rolling back a migration

There are no `down` migrations, deliberately — an automated down-migration on a production
database with live orders in it is a way to lose data quickly. Reversal is a new, forward
migration written for the specific case, reviewed as carefully as any other schema change.

Before any destructive change: Supabase → Database → Backups → take a point-in-time snapshot.

### Incident order of operations

```
1. Promote the last good deployment          — stop the bleeding
2. Confirm with /api/health                   — is the database still there?
3. Check the browser console for CSP errors   — the usual suspect after a header change
4. Read the Vercel function logs for [vayro:api:*]
5. Only then: reproduce locally, fix forward
```

If `/api/health` reports `demoCatalogue: true` on production, the site is up and serving seed
data. Customers see a working storefront with the wrong catalogue and a checkout that will not
complete. Treat it as a full outage.

---

## 14. Deploying somewhere other than Vercel

Nothing in the application is Vercel-specific. It is a standard Next.js 16 build.

```bash
npm ci
npm run build
npm start          # defaults to :3000, honours PORT
```

Requirements:

- **Node 20.9+** to run; 22.18+ if the same machine will seed.
- **A Node runtime, not a static export.** Server Components, Server Actions, route handlers and
  the proxy all need a server. `next export` is not applicable.
- **The proxy runs on the Node.js runtime.** Next.js 16 makes that the default for `src/proxy.ts`
  and rejects a `runtime` export from it outright.
- **`sharp` must be installable** for image optimisation. It is an optional dependency of `next`
  and pulls a platform-specific native binary; on a slim container image, confirm it resolved.
- **Set the security headers** if a reverse proxy in front of the app strips or overrides them.
  They come from `next.config.ts` and arrive on the Next response; a proxy that rewrites headers
  can silently drop the CSP.

Behind nginx or a load balancer, forward `X-Forwarded-Proto` and `X-Forwarded-Host` so the app
builds correct absolute URLs, and terminate TLS before the app — HSTS is emitted by the
application and assumes HTTPS reached the client.

---

<div align="center">

**Deploy early. Add integrations in dependency order. Verify at `/api/health`.**

`README.md` · `ENVIRONMENT.md` · `ARCHITECTURE.md` · `3D_ARCHITECTURE.md` · `AR_ARCHITECTURE.md` · `THIRD_PARTY_LICENSES.md`

</div>
