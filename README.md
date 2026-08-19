<div align="center">

# VAYRO

**Engineered for the way forward.**

A premium outdoor and travel fashion e-commerce platform — Next.js 16, React 19, TypeScript,
Tailwind CSS v4, Supabase, Stripe and a WebGL product viewer.

</div>

---

## Contents

- [What this is](#what-this-is)
- [Quick start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment variables](#environment-variables)
- [Supabase setup](#supabase-setup)
- [Seeding](#seeding)
- [Demo credentials](#demo-credentials)
- [Authentication](#authentication)
- [Admin setup](#admin-setup)
- [Payments](#payments)
- [Email](#email)
- [Analytics](#analytics)
- [Imagery](#imagery)
- [3D models](#3d-models)
- [Brand assets](#brand-assets)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)

---

## What this is

A complete storefront: catalogue, filtered shop, product pages with a 3D viewer and a fold
transformation, cart, multi-step checkout, customer accounts, an operator back office,
editorial, transactional email, SEO and structured data.

**It runs with no configuration at all.** With an empty `.env.local` the site boots and every
page renders against the seed catalogue in `src/data/catalog.ts` — clearly labelled as demo
data, with every write refused rather than faked. Add credentials and features light up one at
a time. Nothing throws because a key is missing.

| | |
| --- | --- |
| Framework | Next.js 16.3.1 (App Router, Turbopack) |
| UI | React 19.2, TypeScript 5 strict, Tailwind CSS v4 |
| Data | Supabase — Postgres, Auth, Row Level Security |
| Payments | Stripe (PaymentIntents + verified webhooks) |
| Email | Resend |
| 3D | Three.js via React Three Fiber / drei, device-tiered |
| Motion | `motion/react`, GSAP + ScrollTrigger, anime.js v4 |
| Analytics | PostHog and/or GA4, plus first-party events in Postgres |

> **This is not the Next.js you may know.** Version 16 removes `middleware.ts` (the equivalent
> here is `src/proxy.ts`) and makes `cookies()`, `headers()`, `params` and `searchParams` async.
> Read `node_modules/next/dist/docs/01-app/` before writing app code.

---

## Quick start

```bash
git clone <repository-url> vayro
cd vayro
npm install
cp .env.example .env.local     # optional — the site runs without it
npm run dev
```

Open <http://localhost:3000>. You are now in **demo mode**: four products, four collections,
six journal entries, a fully explorable admin, and a demo notice on every screen that is
showing seed data.

---

## Prerequisites

| Requirement | Version | Why |
| --- | --- | --- |
| **Node.js** | **22.18+** or **23.6+** | Next.js 16 needs ≥ 20.9; the seeding script imports `src/data/catalog.ts` directly through Node's built-in TypeScript type stripping, which is stable from 22.18 / 23.6. On Node 22.6–22.17, run the seed with `node --experimental-strip-types scripts/seed.mjs` |
| **npm** | 10+ | Lockfile is npm |
| Supabase account | — | Optional. Without it, demo mode |
| Stripe account | — | Optional. Without it, the payment step is a labelled demo |
| Resend account | — | Optional. Without it, mail is rendered and logged |

Check your version:

```bash
node -v
```

---

## Environment variables

```bash
cp .env.example .env.local
```

Every variable is optional. The short version:

| Variable | Effect when set |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Correct canonicals, OG images, sitemap. Defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | Display currency (`INR` default) |
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Leaves demo mode: real catalogue, accounts, orders |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret.** Order writes, webhook application, seeding |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | Enables the Google / Apple sign-in buttons |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Mounts Stripe Elements |
| `STRIPE_SECRET_KEY` | **Secret.** Creates PaymentIntents |
| `STRIPE_WEBHOOK_SECRET` | **Secret.** Verifies webhooks — without it they are all refused |
| `RESEND_API_KEY` + `RESEND_FROM` | **Secret.** Sends real mail |
| `ADMIN_EMAIL` | **Secret.** Contact-form recipient |
| `NEXT_PUBLIC_POSTHOG_KEY` / `NEXT_PUBLIC_GA_ID` | Analytics capture |
| `SEED_*` | Demo accounts created by `npm run seed` |

**`ENVIRONMENT.md` documents every variable in full** — purpose, where to obtain it, public vs
secret, and exactly what degrades without it. Read it before deploying.

Verify what is wired up at any time:

```bash
curl -s http://localhost:3000/api/health | jq
```

It returns integration booleans and nothing else — never a key, a host or a masked fragment.

---

## Supabase setup

### 1. Create the project

1. Sign in at <https://supabase.com> and create a new project.
2. Choose a region close to your customers (for INR pricing, Mumbai / `ap-south-1`).
3. Save the database password somewhere safe — you will not see it again.
4. Wait for provisioning to finish.

### 2. Copy the keys

**Project Settings → API**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / public key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

The anon key is public by design — Row Level Security is what protects the data. The
service-role key **bypasses RLS entirely**: never prefix it with `NEXT_PUBLIC_`, never send it
to the browser, never commit it.

### 3. Run the migration

The schema is a single file: `supabase/migrations/0001_init.sql`. It creates 20 tables, the
enums, the indexes, the `handle_new_user` trigger, the `products_full()` read RPC, the
`admin_metrics` view, and **RLS policies on every table**.

**Option A — SQL editor (fastest)**

1. Dashboard → SQL Editor → New query.
2. Paste the entire contents of `supabase/migrations/0001_init.sql`.
3. Run. It should complete without errors on a fresh project.

**Option B — Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

### 4. Verify

Dashboard → Table Editor. You should see `products`, `product_variants`, `inventory`, `orders`,
`profiles` and the rest, all with the RLS shield enabled. Every table is empty — that is next.

### 5. Generated types (optional, recommended)

`src/lib/supabase/types.ts` is a deliberate hand-written stub. Replacing it with generated
types restores full column-level typing:

```bash
supabase gen types typescript --project-id <project-ref> > src/lib/supabase/types.ts
```

Three files exist only to work around the stub and can be simplified once real types land:
`src/app/admin/_data/db.ts`, `src/app/account/write.ts`, `src/app/api/_lib/db.ts`. Each says so
at the top.

---

## Seeding

```bash
npm run seed
```

Populates the project from the same catalogue the storefront renders in demo mode — products,
variants, inventory, images, 3D model records, collections, categories, journal entries and
store settings — then creates the demo accounts.

**Requirements:** the migration applied, `NEXT_PUBLIC_SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` set (seeding writes across every catalogue table and creates auth
users, which RLS correctly refuses to the anon key), and Node 22.18+ / 23.6+.

The script reads `.env.local` then `.env` automatically.

**Re-running is safe and expected.** Every write is an upsert on a natural key — slug, SKU,
variant id, settings key — and the two child tables with no natural key (images, 3D models) are
replaced per product rather than appended to. Seed twice, get the same database. It never
truncates a table, and it never touches an order, a customer, a review or a newsletter
subscriber it did not create.

Afterwards the demo-data notice clears and the storefront is reading from Postgres.

---

## Demo credentials

`npm run seed` creates two accounts from `.env.local`:

| Role | Variable | Default in `.env.example` |
| --- | --- | --- |
| Admin | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | `admin@vayro-demo.local` / `ChangeMe_Admin_2026!` |
| Customer | `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` | `customer@vayro-demo.local` / `ChangeMe_User_2026!` |

> ## ⚠️ Change these before you deploy anything
>
> These credentials are **published in this repository in plain text**. Anyone who has read
> `.env.example` — which is everyone — knows them.
>
> - **Never** run seeding against a project that holds real data.
> - **Change both passwords** before the deployment is reachable from the internet.
> - In production, do not seed accounts at all: leave `SEED_*` unset, sign up through the app,
>   and promote your own user with the SQL in [Admin setup](#admin-setup).
> - Re-running the seed **resets the password** of an existing seeded account to the configured
>   value, so a stale value in `.env.local` will silently re-open a known-password account.

Leaving `SEED_ADMIN_EMAIL` or `SEED_ADMIN_PASSWORD` empty skips that account and prints a note.

---

## Authentication

Supabase Auth, cookie sessions, with the session refresh handled by `src/proxy.ts`.

**Screens:** `/login` · `/signup` · `/forgot-password` · `/reset-password`, plus the
`/auth/callback` route handler that exchanges an OAuth `code` or an email `token_hash` for a
session.

### Email + password

Works as soon as Supabase is configured. Set the redirect URLs in **Authentication → URL
Configuration**:

- **Site URL** — `http://localhost:3000` in development, your domain in production
- **Redirect URLs** — add `http://localhost:3000/auth/callback` and
  `https://<your-domain>/auth/callback`

Without the callback URL allow-listed, confirmation and recovery links bounce.

### Social sign-in

1. **Authentication → Providers** in Supabase: enable Google and/or Apple and paste the
   provider's client ID and secret.
2. Tell the storefront which ones are live — Supabase does not publish this list to the client:

```bash
NEXT_PUBLIC_AUTH_PROVIDERS=google,apple
```

Anything not listed renders as a **disabled button with the reason in its tooltip**, rather than
a control that fails on click.

### Guards

- `src/proxy.ts` refreshes the auth cookie and optimistically redirects the signed-out away from
  `/account` and `/admin`. **It is an optimisation, not the security boundary.**
- `requireUser()` gates every account screen server-side, preserving the destination in `?next=`.
- `requireAdmin()` reads `profiles.role` server-side under RLS. Route visibility never grants
  access.
- Redirect targets are validated as same-origin absolute paths, in the proxy and at the callback.

---

## Admin setup

The back office lives at `/admin`: dashboard, products, orders, customers, inventory, content,
analytics and store settings.

**In demo mode** (no Supabase project at all) the admin is fully explorable against a
deterministic synthetic dataset, and every screen is banner-labelled. There is no database and
no real data to protect.

**With Supabase configured**, access requires `profiles.role = 'admin'`. To promote a user:

1. Sign up through the app with the address you want to use.
2. Dashboard → SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

3. Sign out and back in.

A customer who types `/admin` is redirected to `/account?notice=admin-only`. The role is read
from the database on every request; nothing about the client can influence it. The RLS policy on
`profiles` pins `role` to its current value on self-update, so a user cannot promote themselves.

---

## Payments

Stripe, using PaymentIntents. Without keys the checkout still runs end to end with a clearly
labelled demo payment step.

### 1. Keys

**Stripe Dashboard → Developers → API keys**:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

Test and live keys must not be mixed — a `pk_live_` with an `sk_test_` fails at confirmation
with an error that reads like a card decline. `isStripeTestMode()` lets the checkout label
itself honestly while you are on test keys.

The SDK is pinned to API version `2026-07-29.dahlia` in `src/lib/stripe.ts`. Bump the version
and the `stripe` package together, never one alone.

### 2. Webhooks

**Local:**

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# copy the printed whsec_… into .env.local
```

**Production:** Dashboard → Developers → Webhooks → Add endpoint →
`https://<your-domain>/api/webhooks/stripe`, then copy the signing secret:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Without the secret the webhook route refuses every request. That is deliberate: an unverified
webhook is an unauthenticated endpoint that can mark orders paid.

### 3. Test cards

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | Succeeds |
| `4000 0025 0000 3155` | Requires 3D Secure authentication |
| `4000 0000 0000 9995` | Declined — insufficient funds |

Any future expiry, any CVC, any postcode.

### How pricing is protected

The browser's totals are **advisory only**. `src/app/api/_lib/pricing.ts` rebuilds the basket
from the catalogue on the server and prices it there; the client's `unitPrice` is parsed only so
a drift can be reported, then discarded. Nothing is billed from a number the browser supplied.

Shipping: free above ₹5,000, otherwise a flat ₹199. Demo discount codes `FIRSTLAYER` (10%) and
`FIELDTEST` (15%) are hard-coded in both the client store and the server pricing module — replace
them with server-validated codes before launch.

---

## Email

Resend, via `src/lib/email.ts`. Templates: order confirmation, shipping notification, welcome,
password reset and contact-form routing — one layout, a hairline-ruled sheet on warm ivory,
tables and inline styles only.

```bash
RESEND_API_KEY=re_...
RESEND_FROM="VAYRO <hello@yourdomain.com>"
ADMIN_EMAIL=studio@yourdomain.com
```

The `RESEND_FROM` domain must be verified in Resend or delivery fails.

**Without a key, every message is rendered and logged as a structured entry instead of sent**,
and the calling route still succeeds — an order that was written but whose receipt could not be
delivered is a delivery problem, not a failed order.

---

## Analytics

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

`track()` in `src/lib/analytics.ts` is a **closed event union** — sixteen declared events, no
free-form strings. One call fans out to PostHog (when keyed) and GA4 via `window.gtag` (when
keyed). PostHog runs with `autocapture: false` and `capture_pageview: false`: nothing is
collected that the taxonomy does not declare.

With no key configured, development prints every event to the console as `[vayro:analytics]`, so
the taxonomy stays verifiable locally without shipping data anywhere.

First-party analytics is separate and needs only Supabase: `POST /api/analytics` writes to the
`analytics_events` table, which is what the admin analytics screen reads.

The full taxonomy is in `ARCHITECTURE.md` §9.

---

## Imagery

`public/media/` ships 15 generated, art-directed placeholder plates — ridge silhouettes,
material macros and studio grounds built from the brand palette — in both `.webp` and `.jpg`.
They are real design assets, not grey boxes, so every layout is tested against true tonal
ranges.

```bash
node scripts/build-media.mjs     # regenerate (deterministic — same bytes every time)
```

**Replacing them is a drop-in.** Keep the filenames; every reference lives in
`src/data/catalog.ts`, so replacing the bytes replaces the image everywhere with no code change.

`docs/MEDIA.md` inventories every plate with its dimensions, where it is used, and the
photography that should replace it — plus the commissioning brief.

Rules when adding imagery: `next/image` with an explicit `sizes`, `.webp` first, `priority` on
the LCP plate only, real `alt` text, and type over image on `--scrim` rather than directly on
detail.

---

## 3D models

`public/models/` is **empty on purpose**. Until a real asset lands there, the viewer renders a
procedural shell built from revolved and swept geometry in `src/components/three/geometry.ts` —
a finished shape that the site ships with.

The moment `public/models/meridian-shell.glb` exists it is used instead: `loadJacketGLB()`
issues one `HEAD` request on first mount and swaps the source. **No code change, no flag, no
deploy coupling.**

`public/models/README.md` is the full authoring specification:

- Scale (1 unit ≈ 62 cm; the shell is 2.1 units tall), +Y up, facing +Z, origin at mid-chest
- The node-name table that drives the exploded view, fold choreography and carry-state fade
- Material naming so the colourway system can find the shell
- The `pack` morph target, or the shader fold into the 24 × 16 × 9 cm carry box
- Hotspot anchors `anchor_h1`…`anchor_h5`, positioned from the catalogue
- Blender export settings, Draco compression, and self-hosted decoders in `public/draco/`

Budget: ≤ 2.5 MB Draco-compressed, textures ≤ 2048² (KTX2/Basis preferred).

The viewer never mounts before `useDeviceTier()` has measured the device, never mounts at all
without WebGL, and recovers from a lost context with a "Restore view" control.

---

## Brand assets

Every piece of logo artwork is **generated from geometry in code** — `scripts/outline.mjs`,
`scripts/wordmark.mjs`, `scripts/brand.mjs`. The SVGs in `public/brand/`, the PNGs in
`public/brand/png/`, the app icons and `src/lib/brand-art.ts` are all build outputs.

```bash
npm run brand    # SVG + PNG + media plates + application mockups
```

**Never hand-edit an SVG or `src/lib/brand-art.ts`.** Change the geometry and regenerate, then
commit the outputs so the app builds without running the scripts.

`VAYRO-BRAND-GUIDELINES.md` covers construction, the optical size system, lockups, clear space,
minimum sizes, incorrect usage, applications and the messaging system.

---

## Scripts

### npm

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) at <http://localhost:3000> |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.json` |
| `npm run verify` | typecheck → lint → production build, as one report |
| `npm run seed` | Seed Supabase from the catalogue (reads `.env.local`, then `.env`) |
| `npm run brand` | Regenerate every brand SVG, PNG, media plate and application mockup |

### Node scripts

Run individually when you only need one output. Anything that rasterises needs `sharp`
(already a dev dependency).

| Script | Output |
| --- | --- |
| `node scripts/build-brand.mjs` | `public/brand/*.svg` + `src/lib/brand-art.ts` |
| `node scripts/build-brand-png.mjs` | `public/brand/png/*` + `src/app/icon.png` + `src/app/apple-icon.png` |
| `node scripts/build-media.mjs` | 15 plates in `public/media/`, `.webp` and `.jpg` |
| `node scripts/build-mockups.mjs` | 12 application mockups in `public/brand/applications/` |
| `node scripts/build-identity-sheet.mjs` | The single-page identity review sheet (`--inline` embeds every asset) |
| `node scripts/build-exploration.mjs` | The five-direction symbol exploration sheet |
| `node scripts/build-wordmark-sheet.mjs` | Wordmark construction sheet |
| `node scripts/build-lockup-test.mjs` | Lockup ratio comparison sheet |
| `node scripts/verify.mjs` | typecheck → lint → build |

Geometry modules — `scripts/outline.mjs`, `scripts/wordmark.mjs`, `scripts/brand.mjs`,
`scripts/mark-geometry.mjs` — are libraries, not entry points. Edit these to change the identity.

Always run before finishing a change:

```bash
npx tsc --noEmit -p tsconfig.json
```

---

## Deployment

### Vercel

1. Push the repository to GitHub / GitLab / Bitbucket.
2. <https://vercel.com/new> → import it. Next.js is detected; no build configuration needed.
3. **Environment Variables** — add everything from `.env.local` that belongs in that
   environment. Scope secrets to Production and Preview deliberately:

   | Variable | Production | Preview |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | your domain | the preview URL |
   | Supabase URL + anon key | production project | **staging project** |
   | `SUPABASE_SERVICE_ROLE_KEY` | ✅ | staging only |
   | Stripe keys | **live** | test |
   | `STRIPE_WEBHOOK_SECRET` | production endpoint | preview endpoint |
   | `RESEND_API_KEY` | ✅ | optional |
   | `SEED_*` | ❌ never | ❌ never |

4. Deploy.
5. **Post-deploy, in order:**
   - Add the production domain and set `NEXT_PUBLIC_SITE_URL` to it, then redeploy — metadata,
     canonicals, the sitemap and JSON-LD all read from it.
   - Supabase → Authentication → URL Configuration: set the Site URL and add
     `https://<your-domain>/auth/callback` to the redirect allow-list.
   - Stripe → Webhooks: add `https://<your-domain>/api/webhooks/stripe` and copy the signing
     secret back into the environment.
   - `curl https://<your-domain>/api/health` and confirm the integrations you expect are `true`.

### Anywhere else

Standard Next.js. Node 20.9+ for the app (22.18+ if you intend to seed from the same machine).
`npm run build` then `npm start`. The Proxy runs on the Node.js runtime — Next.js 16 makes that
the default and rejects a `runtime` export from `src/proxy.ts` outright.

### Pre-launch checklist

- [ ] `SEED_*` variables removed from every deployed environment
- [ ] Seeded demo passwords changed, or the accounts deleted
- [ ] `NEXT_PUBLIC_SITE_URL` set to the real domain
- [ ] Stripe on live keys, webhook endpoint registered and verified
- [ ] Supabase redirect URLs allow-listed
- [ ] Demo discount codes (`FIRSTLAYER`, `FIELDTEST`) replaced with server-validated ones
- [ ] The two `isDemo` seed reviews removed or replaced with real, verified reviews
- [ ] `npm run verify` passes
- [ ] `/api/health` reports the expected integrations

---

## Troubleshooting

**Everything says "demo data" even though Supabase is configured.**
`isDemoData()` is true when the client is null **or** the `products` table is empty. Run
`npm run seed`. If it is still true, the migration has not been applied — check the Table Editor.

**`npm run seed` fails with "SUPABASE_SERVICE_ROLE_KEY is not set".**
Seeding writes across every catalogue table and creates auth users; RLS correctly refuses that to
the anon key. Copy the `service_role` key from Project Settings → API into `.env.local`.

**`npm run seed` fails with a Node version error.**
The script imports `src/data/catalog.ts` directly using Node's type stripping. Upgrade to Node
22.18+ / 23.6+, or on 22.6–22.17 run `node --experimental-strip-types scripts/seed.mjs`.

**Sign-in redirects to `/login` in a loop.**
The callback URL is not allow-listed. Supabase → Authentication → URL Configuration → Redirect
URLs → add `<origin>/auth/callback`. Also confirm `NEXT_PUBLIC_SITE_URL` matches the origin you
are actually browsing.

**Google / Apple buttons are disabled.**
By design. Enable the provider in Supabase → Authentication → Providers, then list it in
`NEXT_PUBLIC_AUTH_PROVIDERS=google,apple`. The tooltip states exactly which step is missing.

**`/admin` redirects me to `/account?notice=admin-only`.**
Your profile's role is `customer`. Run the promotion SQL in [Admin setup](#admin-setup), then
sign out and back in.

**Stripe webhooks return 400.**
Either `STRIPE_WEBHOOK_SECRET` is missing, or it belongs to a different endpoint. Each endpoint
(including `stripe listen`) has its own signing secret. The route reads the raw body and verifies
the signature before anything else, by design.

**Payment fails with an error that looks like a decline.**
Mixed key modes — a `pk_live_` with an `sk_test_`, or vice versa. Both must be test, or both
live.

**No emails arrive.**
Without `RESEND_API_KEY` messages are rendered and logged, not sent — check the server output.
With a key, confirm the `RESEND_FROM` domain is verified in Resend.

**The 3D viewer shows a still image.**
Expected on `low` tier: no WebGL, Save-Data, 2G, or `prefers-reduced-motion: reduce`. The
fallback is a designed view, not a failure state. `useDeviceTier()` exposes the reason.

**Type errors in `src/lib/supabase/types.ts` consumers.**
That file is a hand-written stub; PostgREST's generics resolve index-signature tables to `never`.
Either run `supabase gen types`, or route the write through the existing narrowed helpers in
`admin/_data/db.ts`, `account/write.ts` or `api/_lib/db.ts`.

**A colour, radius or duration "looks slightly off".**
It was probably hard-coded. Every value comes from `src/lib/design-tokens.ts` and its CSS mirror
— see `VAYRO-DESIGN-TOKENS.md`. There are no Tailwind palette colours and no `rounded-xl+` in
this brand.

**The theme flashes on load.**
The inlined `themeScript` in `src/app/layout.tsx` must run before paint. If you moved it out of
`<head>`, put it back.

---

## Documentation

| Document | Covers |
| --- | --- |
| **`DESIGN.md`** | The visual source of truth: colour, type, spacing, grid, components, motion, 3D rules, responsive behaviour, accessibility, component states. Every screen follows this rather than inventing its own language |
| **`VAYRO-BRAND-GUIDELINES.md`** | The brand book: positioning, symbol construction, the optical size system, lockups, clear space, applications, voice and the messaging system |
| **`VAYRO-DESIGN-TOKENS.md`** | Every token, with its CSS variable and its TypeScript path |
| **`ARCHITECTURE.md`** | Route map, rendering strategy, data flow, demo mode, the repository layer, state, 3D architecture, the security model, analytics taxonomy, performance |
| **`ENVIRONMENT.md`** | Every environment variable in detail |
| **`docs/MEDIA.md`** | Image inventory and the photography brief |
| **`public/models/README.md`** | The 3D asset authoring specification |
| **`AGENTS.md`** | Framework-version notes for contributors and coding agents |

---

<div align="center">

**One layer. Every destination.**

</div>
