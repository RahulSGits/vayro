# VAYRO — Environment Variables

Every integration in VAYRO is **optional**. With an empty `.env.local` the storefront boots,
renders every page, and runs entirely on the seed catalogue in `src/data/catalog.ts`. Nothing
throws at import time; nothing renders a stack trace at a customer.

That is a design decision, not a convenience: it means a missing key degrades a *feature*, never
the *site*. This document says exactly which feature.

```bash
cp .env.example .env.local
```

---

## 1. How configuration is read

| Module | Responsibility |
| --- | --- |
| `src/lib/env.ts` | Parses and validates public variables with zod. Exposes `env`, `hasSupabase`, `hasStripe`, `hasAnalytics` |
| `src/lib/env.ts` → `serverEnv()` | Reads server-only secrets. **Never import this from a client component** |
| `hasServiceRole()` · `hasStripeSecret()` · `hasResend()` | Runtime capability checks used by server code before it attempts a privileged operation |

Two rules the codebase enforces:

1. **`NEXT_PUBLIC_*` is public.** It is inlined into the client bundle at build time and is
   readable by anyone. Anything prefixed this way must be safe to publish.
2. **Statically analysable access only.** Next.js inlines `process.env.NEXT_PUBLIC_FOO` only
   when it is written literally. `src/lib/env.ts` therefore lists each variable by name; a
   dynamic lookup would silently resolve to `undefined` in the browser.

Validation is **optional-but-typed**: a variable may be absent, but if present it must be
well-formed (a URL must parse, a currency must be one of four). A malformed value fails the
build rather than producing a broken page.

---

## 2. Quick reference

| Variable | Scope | Required | Without it |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | public | recommended | Canonicals, OG images and sitemap fall back to `http://localhost:3000` |
| `NEXT_PUBLIC_DEFAULT_CURRENCY` | public | no | Defaults to `INR` |
| `NEXT_PUBLIC_SUPABASE_URL` | public | no | Demo mode: seed catalogue, no accounts, no persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | no | As above — both are needed together |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** | no | Orders and webhooks cannot be written; admin writes that bypass RLS are refused |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | public | no | Google/Apple buttons render disabled, with the reason attached |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | public | no | Payment step renders in demo mode, no card fields |
| `STRIPE_SECRET_KEY` | **secret** | no | `POST /api/checkout/intent` returns 503; checkout completes without a charge |
| `STRIPE_WEBHOOK_SECRET` | **secret** | no | `POST /api/webhooks/stripe` refuses every request — signature verification is never optional |
| `RESEND_API_KEY` | **secret** | no | Transactional mail is rendered and logged instead of sent |
| `RESEND_FROM` | secret-ish | no | Defaults to `VAYRO <hello@vayro.example>` |
| `ADMIN_EMAIL` | **secret** | no | Contact-form mail falls back to the `RESEND_FROM` address |
| `NEXT_PUBLIC_POSTHOG_KEY` | public | no | No PostHog capture; events log to the console in development |
| `NEXT_PUBLIC_POSTHOG_HOST` | public | no | Defaults to `https://eu.i.posthog.com` |
| `NEXT_PUBLIC_GA_ID` | public | no | No GA events |
| `SENTRY_DSN` | **secret** | no | No error reporting (integration point is prepared, not wired) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | **secret** | no | Seeding creates no admin account |
| `SEED_CUSTOMER_EMAIL` / `SEED_CUSTOMER_PASSWORD` | **secret** | no | Seeding creates no demo customer |

**Secret** means: never prefix it with `NEXT_PUBLIC_`, never commit it, never log it, and store
it in the host's encrypted environment settings. `.gitignore` excludes `.env*`.

---

## 3. Site

### `NEXT_PUBLIC_SITE_URL`

- **Purpose** — the canonical origin. Feeds `metadataBase`, every canonical URL, Open Graph and
  Twitter card URLs, `sitemap.xml`, `robots.txt` and the JSON-LD `@id` node identifiers in
  `src/lib/seo.ts`.
- **Where to get it** — your deployed origin. On Vercel, the production domain.
- **Format** — absolute URL, no trailing slash: `https://vayro.com`.
- **Without it** — everything falls back to `http://localhost:3000`. The site works; the
  metadata is wrong for anything crawled or shared.

### `NEXT_PUBLIC_DEFAULT_CURRENCY`

- **Purpose** — display currency for `formatPrice()`.
- **Allowed** — `INR` · `USD` · `EUR` · `GBP`. Anything else fails validation at build.
- **Note** — this is a *display* default. Prices are stored in minor units on each product with
  their own `currency` field; the catalogue ships in INR.
- **Without it** — `INR`.

---

## 4. Supabase — database, auth, storage

The single most consequential switch in the project. `hasSupabase` is true only when the URL
**and** the anon key are both present; everything else keys off it.

### `NEXT_PUBLIC_SUPABASE_URL`

- **Purpose** — the project's API origin.
- **Where to get it** — Supabase dashboard → Project Settings → API → Project URL.
- **Format** — `https://<project-ref>.supabase.co`.
- **Public by design.** It appears in every browser request.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- **Purpose** — the client-side key. Every request it signs is subject to Row Level Security.
- **Where to get it** — Project Settings → API → Project API keys → `anon` / `public`.
- **Public by design.** RLS is what protects the data, not the secrecy of this key — which is
  why `supabase/migrations/0001_init.sql` enables RLS on **every** table.

**Without the pair** the app enters **demo mode**:

| Surface | Behaviour |
| --- | --- |
| Catalogue | Seed products, collections, categories and journal posts from `src/data/catalog.ts` |
| `isDemoData()` | Returns `true`; screens render a labelled demo notice |
| Auth | `isDemoAuth()` is `true`. `getSession()` returns `null`; `requireUser()` supplies a clearly-labelled demo context rather than redirecting to a sign-in that cannot work |
| Account | Renders a preview with synthetic data. Every write is refused with an explanation, never faked |
| Admin | Fully explorable against a deterministic demo dataset, banner-labelled on every screen |
| Proxy | Skips the session refresh and the redirect guards entirely |
| Reviews | The two `isDemo: true` seed reviews, explicitly labelled. No fabricated ratings or counts |

### `SUPABASE_SERVICE_ROLE_KEY`

- **Purpose** — server-only key that **bypasses RLS**. Used exclusively where the request has
  already been authorised by other means: writing an order the customer just paid for, and
  applying a signature-verified Stripe webhook.
- **Where to get it** — Project Settings → API → Project API keys → `service_role`.
- **Secret.** Anyone holding it can read and write every row in the database. Never prefix it
  with `NEXT_PUBLIC_`, never send it to the browser, never put it in a client component.
- **Consumed by** — `createAdminClient()` in `src/lib/supabase/server.ts` and `serviceDb()` in
  `src/app/api/_lib/db.ts`. Both return `null` when it is absent, and callers handle null as
  the demo path rather than throwing.
- **Without it** — reads still work under RLS. Order persistence and webhook application are
  unavailable; the checkout completes with a client-side confirmation record instead.

### `NEXT_PUBLIC_AUTH_PROVIDERS`

- **Purpose** — which social sign-in buttons to offer. Supabase does not publish its enabled
  provider list to the client, so the storefront is told explicitly.
- **Format** — comma-separated. Supported: `google`, `apple`. Example: `google,apple`.
- **Prerequisite** — enable the provider in Supabase → Authentication → Providers, with its
  client ID and secret, *first*.
- **Without it** — both buttons render **disabled with the reason attached**, which is
  deliberately better than a control that fails on click.

---

## 5. Seed accounts

Read by the seeding routine when it provisions demo users through the Supabase Admin API.
They require `SUPABASE_SERVICE_ROLE_KEY`.

| Variable | Default in `.env.example` |
| --- | --- |
| `SEED_ADMIN_EMAIL` | `admin@vayro-demo.local` |
| `SEED_ADMIN_PASSWORD` | `ChangeMe_Admin_2026!` |
| `SEED_CUSTOMER_EMAIL` | `customer@vayro-demo.local` |
| `SEED_CUSTOMER_PASSWORD` | `ChangeMe_User_2026!` |

> ### ⚠️ Change these before any deployment
>
> These are **development credentials committed to the repository in plain text**. They are
> published, and anybody who has read `.env.example` knows them.
>
> - Never run seeding against a project that holds real data.
> - Change both passwords before the project is reachable from the internet.
> - In production, create the admin account by hand and promote it with a single SQL statement
>   (`README.md` §"Admin setup") rather than seeding it.

---

## 6. Stripe — payments

### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

- **Purpose** — mounts Stripe Elements in the browser.
- **Where to get it** — Stripe Dashboard → Developers → API keys → Publishable key.
- **Format** — `pk_test_…` in test mode, `pk_live_…` in production.
- **Public by design.**
- **Without it** — `hasStripe` is false. The payment step renders a labelled demo panel and the
  order flow completes without collecting card details.

### `STRIPE_SECRET_KEY`

- **Purpose** — server-side API access. Creates and reads PaymentIntents.
- **Where to get it** — same page, Secret key. **Reveal it once and store it immediately.**
- **Format** — `sk_test_…` / `sk_live_…`.
- **Secret.** A leaked secret key can move money.
- **Consumed by** — `getStripe()` in `src/lib/stripe.ts`, which returns `null` when it is
  absent. The SDK is pinned to API version `2026-07-29.dahlia`; bump the version and the SDK
  together, never one alone.
- **Without it** — `POST /api/checkout/intent` answers `503 not_configured` with a message a
  developer can act on. The checkout UI stays usable in demo mode.

> **Test and live keys must match.** A `pk_live_` with an `sk_test_` fails at intent
> confirmation with an error that reads like a card decline. `isStripeTestMode()` exists so the
> checkout can label itself honestly when it is running on test keys.

### `STRIPE_WEBHOOK_SECRET`

- **Purpose** — verifies that a webhook payload genuinely came from Stripe.
- **Where to get it** — Dashboard → Developers → Webhooks → your endpoint → Signing secret. For
  local development, `stripe listen --forward-to localhost:3000/api/webhooks/stripe` prints one.
- **Format** — `whsec_…`.
- **Secret.**
- **Without it** — `POST /api/webhooks/stripe` refuses every request. This is intentional: an
  unverified webhook is an unauthenticated write endpoint that can mark orders paid.

Endpoint to register: `https://<your-domain>/api/webhooks/stripe`.

---

## 7. Resend — transactional email

### `RESEND_API_KEY`

- **Purpose** — sends order confirmations, shipping notifications, welcome mail, password
  recovery (when routed through Resend rather than Supabase's own templates) and contact-form
  enquiries.
- **Where to get it** — resend.com → API Keys.
- **Format** — `re_…`.
- **Secret.**
- **Without it** — `isEmailConfigured()` is false and every send is **rendered and logged as a
  structured entry instead of transmitted**. The calling route still succeeds, because an order
  that was written but whose receipt could not be sent is a delivery problem, not a failed
  order.

### `RESEND_FROM`

- **Purpose** — the From header on every message.
- **Format** — `"VAYRO <hello@yourdomain.com>"`. The domain must be verified in Resend or
  delivery fails.
- **Default** — `VAYRO <hello@vayro.example>`, which is a placeholder domain and will not
  deliver.

### `ADMIN_EMAIL`

- **Purpose** — internal recipient for contact-form enquiries, with Reply-To set to the sender.
- **Format** — a single address.
- **Not present in `.env.example`** — add it manually if you use the contact form.
- **Without it** — enquiries go to the address extracted from `RESEND_FROM`.

---

## 8. Analytics

`track()` in `src/lib/analytics.ts` is the single funnel for a **closed event union** — see
`ARCHITECTURE.md` §9 for the taxonomy. It is a silent no-op when nothing is configured, so
analytics can never break a render.

### `NEXT_PUBLIC_POSTHOG_KEY`

- **Purpose** — enables PostHog capture.
- **Where to get it** — PostHog → Project Settings → Project API Key.
- **Format** — `phc_…`. **Public by design** (it is a write-only ingestion key).
- **Configuration used** — `capture_pageview: false` (page views are sent explicitly on route
  change), `capture_pageleave: true`, `autocapture: false`, `person_profiles: 'identified_only'`.
  Nothing is collected that the taxonomy does not declare.

### `NEXT_PUBLIC_POSTHOG_HOST`

- **Purpose** — ingestion host. Set the EU host to keep data in the EU.
- **Default** — `https://eu.i.posthog.com`.

### `NEXT_PUBLIC_GA_ID`

- **Purpose** — mirrors the same events to Google Analytics 4 via `window.gtag`.
- **Format** — `G-XXXXXXXXXX`. **Public by design.**
- **Note** — the GA tag script itself is not injected by the app; add it through your tag setup
  if you want GA. Without `window.gtag` present, the GA branch is skipped silently.

**Without any analytics key**, `hasAnalytics` is false and, in development only, every event is
printed to the console as `[vayro:analytics]` — so the taxonomy stays verifiable locally
without shipping data anywhere.

First-party analytics is independent of both: `POST /api/analytics` writes to the
`analytics_events` table (RLS: anonymous insert, admin read) and is what the admin analytics
screen reads. It needs Supabase, not PostHog.

---

## 9. Monitoring

### `SENTRY_DSN`

- **Purpose** — reserved for error reporting.
- **Status** — the variable is read by `serverEnv()` and the codebase is Sentry-ready, but no
  SDK is wired up. Setting it today has no effect.
- **Secret** — treat as such; a DSN accepts events from anyone who has it.

---

## 10. Environment matrix

| Variable | Local dev | Preview | Production |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | preview URL | production domain |
| Supabase URL + anon key | optional | staging project | production project |
| `SUPABASE_SERVICE_ROLE_KEY` | only if seeding or testing orders | staging | production |
| `NEXT_PUBLIC_AUTH_PROVIDERS` | as enabled | as enabled | as enabled |
| Stripe publishable / secret | `pk_test_` / `sk_test_` | test keys | **live keys** |
| `STRIPE_WEBHOOK_SECRET` | from `stripe listen` | preview endpoint secret | production endpoint secret |
| `RESEND_API_KEY` | optional (logs instead) | optional | required for real mail |
| `SEED_*` | dev values | **absent** | **absent** |
| PostHog / GA | absent (console logging) | staging project | production project |

Never point a preview deployment at the production Supabase project: previews run unreviewed
code against whatever database they are given.

---

## 11. Verifying configuration

```bash
curl -s http://localhost:3000/api/health | jq
```

`GET /api/health` reports which integrations are wired up **as booleans and nothing else** —
no key, no URL, no host, no prefix, no masked fragment. A configuration probe that leaks the
shape of a secret is a reconnaissance endpoint.

In the app itself:

- A demo-data notice on catalogue screens means Supabase is unset or the `products` table is
  empty.
- A demo banner across the admin means `AdminMode` is `no-supabase` or `no-catalogue`.
- A labelled demo payment panel at checkout means `hasStripe` is false.
- Disabled social sign-in buttons carry their own explanation in the tooltip.

---

## 12. Rotating a secret

1. Create the replacement in the provider's dashboard.
2. Update the value in the host's environment settings (Vercel: Project → Settings →
   Environment Variables).
3. Redeploy — environment variables are read at build and boot, not per request.
4. Revoke the old value in the provider.
5. If the key was ever committed or pasted into a log, treat it as compromised: revoke first,
   then rotate.

Rotating `SUPABASE_SERVICE_ROLE_KEY` invalidates every server process holding it; rotate and
redeploy in the same window. Rotating `STRIPE_WEBHOOK_SECRET` requires updating the endpoint's
signing secret in the Stripe dashboard at the same time, or webhooks will fail verification and
be retried until they expire.
