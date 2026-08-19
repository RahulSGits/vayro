# VAYRO — Architecture

How the storefront is put together, and why.

| | |
| --- | --- |
| Framework | Next.js **16.3.1**, App Router, Turbopack |
| Runtime | React 19.2, TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 with a token layer in `src/app/globals.css` |
| Data | Supabase (Postgres + Auth + RLS), with a complete seed-catalogue fallback |
| State | Server Components for data; zustand for cart and wishlist only |
| Payments | Stripe (PaymentIntents + verified webhooks) |
| 3D | Three.js via React Three Fiber / drei, behind device tiering |
| Motion | `motion/react`, GSAP + ScrollTrigger, anime.js v4 |
| Email | Resend |
| Analytics | PostHog and/or GA4, plus first-party events in Postgres |

**This is not the Next.js of older releases.** `middleware.ts` does not exist — the equivalent
is `src/proxy.ts`. `cookies()`, `headers()`, `draftMode()`, `params` and `searchParams` are all
async and must be awaited. `PageProps<'/route'>`, `LayoutProps<'/route'>` and
`RouteContext<'/route'>` are global type helpers. Read
`node_modules/next/dist/docs/01-app/` before writing app code.

---

## 1. Directory map

```
src/
  app/                    routes, layouts, route handlers, metadata files
    (auth)/               route group — sign-in, sign-up, recovery, OAuth callback
    account/              customer area (guarded)
                          data.ts (reads) · write.ts (typed writes) · schemas.ts · actions.ts
    admin/                back office (guarded)
      _data/              db.ts · queries.ts · demo.ts · settings.ts · coerce.ts · action-state.ts
    api/                  route handlers
      _lib/               db.ts · http.ts · pricing.ts — shared route plumbing
    globals.css           the token layer + helper classes
  components/
    brand/ ui/ layout/ navigation/ product/ product-3d/ product-transformation/
    three/ home/ hero/ cart/ checkout/ account/ admin/ auth/ forms/ icons/ providers/
  data/catalog.ts         the seed catalogue — demo source of truth and seeding payload
  hooks/useDeviceTier.ts  WebGL capability detection
  lib/
    design-tokens.ts  motion.ts  utils.ts  env.ts  seo.ts  analytics.ts
    auth.ts  validation.ts  rate-limit.ts  stripe.ts  email.ts  brand-art.ts (generated)
    repo/products.ts      the storefront read model
    supabase/             server.ts · client.ts · types.ts
  store/                  cart.ts · wishlist.ts (zustand, persisted)
  types/index.ts          the domain model
  proxy.ts                session refresh + optimistic route guards
supabase/migrations/      0001_init.sql — schema, RLS, RPC, admin view
scripts/                  brand geometry, asset generation, verification
public/brand · media · models
```

---

## 2. Route map and rendering strategy

Regenerate with `find src/app -name 'page.tsx'`.

### Storefront — public

| Route | Rendering | Data |
| --- | --- | --- |
| `/` | Server Component, static shell + dynamic data | `getHeroProduct` `getFeaturedProducts` `getProducts` `getCollections` `getJournalPosts` |
| `/shop` | Server Component, `searchParams` drive filters | `queryProducts(filters)` `getFacets` `getCategories` |
| `/collections` | Server Component | `getCollections` `getProducts` |
| `/collections/[slug]` | Server Component + `generateStaticParams()` from the seed catalogue | `getCollections` `getProducts` |
| `/product/[slug]` | Server Component + `generateStaticParams()`, `generateMetadata()` | `getProduct` `getProducts` `getCategories` `getReviews` |
| `/technology` | Server Component, largely static editorial | seed content |
| `/journal`, `/journal/[slug]` | Server Component + `generateStaticParams()` | `getJournalPosts` `getJournalPost` |

`generateStaticParams()` deliberately reads the **seed catalogue**, not the repo layer: the repo
is request-scoped (it reads cookies so RLS applies) and there is no request at build time. Slugs
that exist only in Supabase still render on demand — they are simply not prerendered.

### Commerce

| Route | Rendering | Notes |
| --- | --- | --- |
| `/cart` | Server shell, client view | Cart lives in `localStorage`; the page renders a shell and hydrates |
| `/checkout` | Client flow inside a server shell | Multi-step: information → shipping → payment → review |
| `/checkout/confirmation/[orderNumber]` | Server Component | Reads the server copy via `/api/orders/[orderNumber]`, falls back to the `sessionStorage` record the checkout stashed |

### Account — session required

`/account` · `/account/orders` · `/account/orders/[id]` · `/account/profile` ·
`/account/addresses` · `/account/wishlist` · `/account/settings`

Server Components behind `requireUser()`. Mutations are Server Actions in
`src/app/account/actions.ts`, validated with the zod schemas in `schemas.ts` and written
through the narrow builder view in `write.ts`.

### Admin — admin role required

`/admin` · `/admin/products` · `/admin/products/new` · `/admin/products/[id]` ·
`/admin/orders` · `/admin/orders/[id]` · `/admin/customers` · `/admin/customers/[id]` ·
`/admin/inventory` · `/admin/content` · `/admin/analytics` · `/admin/settings`

Server Components behind `requireAdmin()`. Reads go through `src/app/admin/_data/queries.ts`;
mutations are Server Actions in `src/app/admin/actions.ts`.

### Auth — route group `(auth)`

`/login` · `/signup` · `/forgot-password` · `/reset-password`, plus the route handler
`/auth/callback`. The group has its own layout, loading and error boundaries.

### Route handlers

| Handler | Method | Purpose |
| --- | --- | --- |
| `/api/products` | GET | Filtered catalogue read, cacheable |
| `/api/products/[slug]` | GET | Single product, cacheable |
| `/api/search` | GET | Feeds the search overlay |
| `/api/checkout/intent` | POST | Creates a Stripe PaymentIntent from a server-priced basket |
| `/api/orders` | POST | Writes the order (service role) and sends the receipt |
| `/api/orders/[orderNumber]` | GET | Order read-back for the confirmation screen |
| `/api/webhooks/stripe` | POST | Signature-verified payment events. `dynamic = 'force-dynamic'` |
| `/api/newsletter` | POST | Consent-gated subscription with a honeypot |
| `/api/contact` | POST | Routes an enquiry to `ADMIN_EMAIL` |
| `/api/analytics` | POST | First-party event persistence (202 Accepted) |
| `/api/health` | GET | Integration booleans only — never key material |
| `/auth/callback` | GET | Exchanges an OAuth `code` or an email `token_hash` for a session |

### Metadata routes

`sitemap.ts` (public surface only — never `/account`, `/admin`, `/cart`, `/checkout` or the
auth screens), `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, plus `icon.png` and
`apple-icon.png` generated by the brand scripts.

### Segment boundaries

Every segment that can wait ships `loading.tsx`; every segment that can fail ships `error.tsx`;
every dynamic segment ships `not-found.tsx`. These are part of the design, not scaffolding —
see `DESIGN.md` §7.6.

---

## 3. Data flow

```
Server Component
   └─ @/lib/repo/products        (request-cached read model)
         ├─ createClient()       Supabase under RLS, or null
         │     └─ rpc('products_full')  /  table selects
         └─ @/data/catalog       seed fallback
```

Rules the flow encodes:

1. **Server Components fetch; client components receive.** Pages resolve their data on the
   server and pass plain objects down. `@/lib/repo/products` and `@/lib/auth` both start with
   `import 'server-only'`, so an accidental client import is a build error rather than a leak.
2. **Everything read is `cache()`-wrapped.** A layout and five nested segments asking for the
   product list cost one round trip per request.
3. **One shape, two sources.** Every repo function returns the same domain type whether the row
   came from Postgres or from the seed catalogue, so no screen carries a branch for it.
4. **The database returns the view, not the tables.** `products_full()` is a security-definer
   RPC that assembles the whole denormalised product — images, variants with rolled-up stock,
   models, collections, specs, hotspots, features — as a single JSONB document. One query per
   page instead of six joins in application code.

The client-side 3D layer cannot import the server-only repo, so
`src/components/product-3d/product-source.ts` resolves a product from the seed catalogue when
only a slug is known, and accepts an override when the caller already has the resolved product.

---

## 4. Demo mode

The most important architectural decision in the project: **the absence of configuration is a
supported state**, not an error path.

`hasSupabase` is true only when both `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set. From that one boolean:

| Layer | Live | Demo |
| --- | --- | --- |
| `createClient()` | Supabase client scoped to the request | `null` |
| Repo functions | Query, fall back on error/empty | Seed catalogue |
| `isDemoData()` | `false` | `true` → screens render a labelled notice |
| `getSession()` | Verified user or `null` | `null` |
| `requireUser()` | Redirects to `/login?next=…` | Returns `DEMO_CONTEXT`, labelled |
| `requireAdmin()` | Role read from `profiles` under RLS | Demo context with `role: 'admin'` |
| Admin data | Supabase | Deterministic synthetic dataset (`_data/demo.ts`) |
| `proxy.ts` | Refreshes the session, guards routes | Returns immediately |
| Stripe | PaymentIntent | Labelled demo payment panel |
| Resend | Sends | Renders and logs the message |

Three rules make it honest:

- **Demo data is always labelled.** `AdminMode` (`live` / `no-supabase` / `no-catalogue`) drives
  the banner, the empty states and the mutation guards from one place. The two seed reviews
  carry `isDemo: true` and say so in their body text.
- **Demo data is deterministic.** The admin dataset uses a seeded mulberry32 PRNG and
  day-anchored dates, so the same request renders the same numbers and nothing flickers between
  navigations.
- **Writes are refused, never faked.** A mutation in demo mode returns an explanation of what is
  missing. Nothing pretends to have persisted.

The fallback is also a *resilience* strategy, not only a developer convenience: a repo function
that gets an error or an empty result from Supabase falls back to seed content rather than
throwing. A partial catalogue beats a 500.

---

## 5. The repository layer

`src/lib/repo/products.ts` is the storefront's read model.

| Function | Returns |
| --- | --- |
| `getProducts()` | Published products via `products_full()` RPC |
| `getProduct(slug)` | One product, resolved from the cached list |
| `getFeaturedProducts()` | Featured, falling back to the first three |
| `getHeroProduct()` | The Meridian, falling back to the first product |
| `getCollections()` · `getCategories()` | Ordered taxonomy |
| `getJournalPosts()` · `getJournalPost(slug)` | Published editorial, newest first |
| `getReviews(productId)` | Approved or demo reviews |
| `queryProducts(filters)` | Category, collection, colourway, size, price, stock, text, sort |
| `getFacets()` | Colourways, sizes and price range **derived from the catalogue** |
| `isDemoData()` | Whether the UI should show the demo notice |

Two deliberate choices:

- **Filtering happens in application code, over the cached list.** The catalogue is small and
  already in memory for the request; a second round trip per filter change would cost more than
  the filter itself. When the catalogue outgrows that, `queryProducts` is the single place to
  push predicates into Postgres.
- **Facets are derived, never hard-coded.** A colourway added in the admin appears in the shop
  filters without a code change.

The account and admin areas have their own read models (`src/app/account/data.ts`,
`src/app/admin/_data/queries.ts`) because their access rules and shapes differ; both follow the
same prefer-Supabase-fall-back-to-demo contract.

### Typing against a stub schema

`src/lib/supabase/types.ts` is a hand-written placeholder until `supabase gen types` can run
against a linked project. Its index-signature tables give PostgREST's generics nothing to
resolve, so inserts and updates would type as `never`. Rather than scatter `any` casts, the
client is narrowed **once** per area — `src/app/admin/_data/db.ts`, `src/app/account/write.ts`,
`src/app/api/_lib/db.ts` — and reads come back as `unknown` and pass through explicit coercion
helpers. When generated types land, those three files are the only ones that change.

---

## 6. State management

| Concern | Where it lives | Why |
| --- | --- | --- |
| Catalogue, orders, profile, admin data | Server Components | It is server data; there is no client cache to invalidate |
| Cart | `useCart` (zustand + `persist`, key `vayro.cart`) | Must survive reload and work signed-out |
| Wishlist | `useWishlist` (zustand + `persist`, key `vayro.wishlist`) | Same, with a server sync on sign-in |
| Theme | `ThemeProvider` + `localStorage['vayro.theme']` | Committed before first paint by an inlined script |
| Toasts | `ToastProvider` context | Transient, view-scoped |
| Product page selection | `ProductProvider` context | Colourway/size shared by gallery, purchase panel, mobile bar and 3D viewer |

There is no global client store beyond these. Anything a Server Component can resolve, it does.

**Money is always minor units** (paise). `formatPrice()` is the only place that divides by 100.
`cartTotals()` computes subtotal, discount, shipping and total: free shipping at ₹5,000
(`SHIPPING_FREE_THRESHOLD = 500000`), otherwise a flat ₹199 (`SHIPPING_FLAT = 19900`).

**The client's totals are advisory.** `src/app/api/_lib/pricing.ts` rebuilds the basket from the
catalogue server-side and prices it there; the client's `unitPrice` is parsed only so a drift can
be reported, then discarded. Nothing bills from a number the browser supplied. Because
`@/store/cart` is a `'use client'` module, server code cannot import its constants — it would
receive a client reference, not a number — so `pricing.ts` and `admin/_data/settings.ts` restate
them with a comment pointing at the original. Change one, change all three.

**Hydration discipline.** Cart and wishlist counts read through `useSyncExternalStore` and are
suppressed for exactly one render after hydration, because the persisted stores rehydrate from
`localStorage` before React runs and would otherwise produce a mismatch.

---

## 7. 3D architecture

Three layers, each with one job.

| Layer | Modules | Responsibility |
| --- | --- | --- |
| Capability | `hooks/useDeviceTier.ts` | Decide `high` / `medium` / `low`, and whether to mount at all |
| Boundary | `product-3d/ProductViewer.tsx`, `ProductStage.tsx` | Resolve product + tier, then `next/dynamic({ ssr: false })` the scene |
| Scene | `three/Canvas.tsx`, `JacketModel.tsx`, `geometry.ts`, `materials.ts`, `Environment.tsx` | Draw it |

### Tiering

| Tier | DPR | Shadows | Environment | Particles | AA | Frameloop |
| --- | --- | --- | --- | --- | --- | --- |
| `high` | 2 | yes | studio | 900 | yes | always |
| `medium` | 1.5 | yes | studio | 380 | yes | always |
| `low` | 1 | no | none | 0 | no | demand |

Inputs: `hardwareConcurrency`, `deviceMemory`, `pointer: coarse`, viewport width,
`connection.saveData` / `effectiveType`, `prefers-reduced-motion`, WebGL availability.
Save-Data, 2G, no WebGL and reduced motion each force `low`.

### Non-negotiables

1. **Nothing mounts before capability is known.** `useDeviceTier()` reports `pending: true`
   until it has measured; the 2D plate renders during that window.
2. **Nothing imports Three.js above the dynamic boundary.** A page that imports the viewer does
   not pay for the Three.js chunk until a capable device asks for it.
3. **No WebGL, no canvas** — the designed fallback image stands in permanently.
4. **A lost context is recoverable.** `webglcontextlost` is caught, the default prevented, and a
   "Restore view" control offered.
5. **Budgets come from `three.tiers[tier]`**, never from the calling component.
6. **`disposeParts()` on unmount** — no geometry leaks between routes.

### The model

`public/models/` is empty on purpose. `loadJacketGLB()` issues one `HEAD` request for
`/models/meridian-shell.glb` on first mount; on a hit it loads the GLB (with `DRACOLoader`
pointed at self-hosted decoders in `/draco/`), on a miss it renders the **procedural shell**
built from revolved and swept geometry in `three/geometry.ts`. The probe result is cached for
the session. There is no flag and no deploy coupling: dropping the file in swaps the asset.
`public/models/README.md` is the full authoring spec — scale, orientation, node names, material
naming, the `pack` morph target, hotspot anchors and export settings.

The fold is either an authored morph target named `pack`, or a vertex-shader collapse into the
carry box (24 × 16 × 9 cm — the volume the catalogue publishes). The weave is a shader-side
roughness modulation rather than a texture, and is dropped entirely on `medium` and `low`.

---

## 8. Security model

Four layers, and only two of them are load-bearing.

### 8.1 The proxy is an optimisation, not a boundary

`src/proxy.ts` (Next.js 16's replacement for middleware, Node.js runtime) does two cheap things:

1. **Refreshes the Supabase auth cookie.** Server Components cannot write cookies, so without
   this pass a session expires silently mid-visit. It calls `supabase.auth.getUser()`, which
   revalidates the JWT against the Auth server — deliberately not a cookie decode, because it is
   the refresh that matters.
2. **Optimistically redirects** the signed-out away from `/account` and `/admin`, and the
   signed-in away from the auth screens.

It never reads a role and it never grants access. Its matcher excludes API routes, build output
and static assets, so the auth pass does not sit in front of every stylesheet and image.

### 8.2 Authorisation is a data check

`src/lib/auth.ts`:

- Identity comes from `supabase.auth.getUser()`, never from a decoded cookie — a forged or stale
  token cannot promote a request.
- `requireUser()` gates every `/account` screen and preserves the destination in `?next=`.
- `requireAdmin()` reads `profiles.role` **server-side, under RLS**. Hiding a route neither
  grants nor withholds access; a customer who types `/admin` is redirected to
  `/account?notice=admin-only`.
- Redirect targets are validated as same-origin absolute paths in both the proxy and
  `/auth/callback`. An open redirect at the callback would hand a session to another host.

### 8.3 Row Level Security is the real boundary

RLS is enabled on **every** table in `0001_init.sql`. The anon key is public by design; the
policies are what protect the data.

| Table group | Policy |
| --- | --- |
| Catalogue (categories, collections, variants, inventory, images, models) | Public read; admin write |
| `products` | Public read of `status = 'published'`; admin sees all |
| `journal_posts` | Public read of published; admin sees all |
| `reviews` | Read when `approved` or `is_demo`; authenticated users may insert their own; approval is an admin action |
| `profiles` | Self read/write, admin read-all. The update policy pins `role` to its current value, so a user cannot promote themselves |
| `addresses`, `carts`, `cart_items`, `wishlists`, `wishlist_items` | Owner-scoped for all operations |
| `orders`, `order_items` | Owner read, admin all. **Writes go through the service role only** |
| `newsletter_subscribers` | Anonymous insert with `consent = true` enforced in the policy; admin read |
| `analytics_events` | Anonymous insert; admin read |
| `settings` | Public read; admin write |

`public.is_admin()` is a `security definer` function pinned to `search_path = public`, so the
role lookup cannot be shadowed.

### 8.4 The service-role boundary

`createAdminClient()` / `serviceDb()` bypass RLS entirely and are reachable from exactly two
kinds of code:

- A route that has **already** established authority — writing an order the customer just paid
  for, applying a signature-verified Stripe webhook.
- Admin Server Actions that ran `requireAdmin()` first.

Both return `null` without `SUPABASE_SERVICE_ROLE_KEY`, and callers treat null as the demo path
rather than throwing.

### 8.5 Route-handler hygiene

- **Validation at the edge of the process.** Every body and query string is parsed by a zod
  schema in `src/lib/validation.ts` before anything touches it. `readJsonBody()` refuses
  oversized or malformed payloads without throwing into the route.
- **Rate limiting.** `src/lib/rate-limit.ts` buckets per scope and caller address (draft-7
  advisory headers on the response). Generous for reads, tight for anything that writes, sends
  mail or moves money: `newsletter` 5/10min, `contact` 3/10min, `orders` 10/10min, `checkout`
  20/10min, `search` 40/min, `products` 120/min, `analytics` 240/min. The default store is
  in-memory and held on `globalThis` so a dev hot reload does not hand out a fresh budget;
  `setRateLimitStore()` swaps in a shared backend for multi-instance deployments.
- **Stripe webhooks** read the **raw body** (`request.text()`) and verify the signature before
  anything else. `request.json()` is never called there.
- **Errors are sanitised.** `describeStripeError()` passes through only the Stripe error classes
  written for end users; everything else becomes a neutral sentence, because provider messages
  can name internal configuration. `logRouteError()` logs messages, never provider payloads.
- **`/api/health` returns booleans only** — no key, no host, no prefix, no masked fragment.
- **Honeypot + explicit consent** on the newsletter route; the RLS policy refuses the row
  without `consent = true`, so the rule is enforced twice.

---

## 9. Analytics taxonomy

`src/lib/analytics.ts` exports a **closed union**. Adding an event means adding it to the union;
there is no free-form `track(string)`.

| Event | Properties |
| --- | --- |
| `page_view` | `path`, `title?` |
| `product_view` | `productId`, `slug`, `price`, `currency` |
| `3d_view_started` | `productId`, `tier` |
| `3d_interaction` | `productId`, `action`: rotate \| zoom \| hotspot \| variant \| reset \| fullscreen |
| `product_transformation_view` | `productId`, `progress` |
| `add_to_cart` | `productId`, `variantId`, `quantity`, `value`, `currency` |
| `remove_from_cart` | `productId`, `variantId` |
| `wishlist_add` / `wishlist_remove` | `productId` |
| `checkout_started` | `value`, `currency`, `items` |
| `checkout_step` | `step`, `name` |
| `purchase` | `orderId`, `value`, `currency`, `items` |
| `newsletter_signup` | `source` |
| `search` | `query`, `results` |
| `login` / `signup` | `method` |

One funnel, three sinks: PostHog (when keyed), GA4 via `window.gtag` (when keyed), and — for the
admin's own analytics screen — `POST /api/analytics` into the `analytics_events` table. With no
key configured, development logs each event to the console so the taxonomy stays verifiable
without shipping data anywhere. PostHog runs with `autocapture: false` and
`capture_pageview: false`: nothing is collected that this table does not declare.

---

## 10. Performance strategy

**Rendering**

- Server Components by default; client components are small leaves that receive resolved data.
  The homepage is a server component end to end, with the parallax hero, pinned transformation
  sequence, construction explorer and collections scroller as client children.
- `generateStaticParams()` prerenders the seed catalogue's product, collection and journal
  slugs; anything added in Supabase renders on demand.
- Catalogue route handlers send `CACHEABLE_READ` (fresh at the edge for a minute, stale-served
  for five); everything transactional is `no-store`.

**Assets**

- `next/font/google` self-hosts and subsets Archivo, Inter and IBM Plex Mono. No runtime font
  request, no third-party script anywhere in the app.
- Imagery is `.webp` first with `.jpg` alongside, always through `next/image` with an explicit
  `sizes`, `priority` on the LCP plate only, and `--bg-sunken` as the placeholder surface so
  nothing flashes white in dark mode.
- Three.js is behind a dynamic boundary and never enters the initial bundle.

**Runtime**

- Every repo read is `cache()`-wrapped: one round trip per request, not per component.
- `products_full()` collapses six joins into one RPC.
- Frame budget 16.6ms on `high`/`medium`; `low` runs the demand frameloop and draws only on
  change. `AdaptiveDpr` is mounted below `high`.
- GLB budget ≤ 2.5 MB Draco-compressed, textures ≤ 2048² (KTX2/Basis preferred). The procedural
  shell ships no textures at all.
- The theme is committed before first paint by an inlined script — no flash, no layout shift.

**Verification**

```bash
node scripts/verify.mjs     # typecheck → lint → production build
```

Typecheck and build are hard failures; lint is reported but non-blocking.

---

## 11. Conventions

- **Tokens or nothing.** No hex literals, no Tailwind palette colours, no ad-hoc durations. See
  `DESIGN.md` and `VAYRO-DESIGN-TOKENS.md`.
- **`import 'server-only'`** at the top of any module that must never reach the browser.
- **Async request APIs.** `await cookies()`, `await headers()`, `await params`,
  `await searchParams` — every time.
- **One barrel per component family** (`@/components/ui`, `@/components/product`, …). Extend a
  primitive; never re-implement one.
- **Mirrored constants carry a comment naming the other copy.** Shipping thresholds, discount
  codes, shipping methods and country lists exist in both client and server modules because a
  `'use client'` module cannot be imported by server code. Every copy points at its twin.
- **`useToast()`, never `alert()`.**
- **Deterministic renders.** No `Math.random()` or bare `new Date()` in a render path —
  `orderNumber()` hashes a seed, and the demo dataset uses a seeded PRNG with day-anchored
  dates.
