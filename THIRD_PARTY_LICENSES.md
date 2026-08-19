<div align="center">

# VAYRO — Third-Party Licences

**Every dependency that reaches production, what it is licensed under, and what
that obliges VAYRO to do about it.**

</div>

---

## Contents

1. [Method](#1-method)
2. [Summary](#2-summary)
3. [Flags — read these before shipping](#3-flags--read-these-before-shipping)
4. [Direct production dependencies](#4-direct-production-dependencies)
5. [Direct development dependencies](#5-direct-development-dependencies)
6. [Transitive production dependencies](#6-transitive-production-dependencies)
7. [Platform binaries](#7-platform-binaries)
8. [Typefaces](#8-typefaces)
9. [First-party assets](#9-first-party-assets)
10. [Attribution obligations, in one place](#10-attribution-obligations-in-one-place)
11. [Re-running this audit](#11-re-running-this-audit)

---

## 1. Method

Every licence below was read out of the installed package — `node_modules/<pkg>/package.json`
and the `LICENSE` / `LICENSE.md` / `license` file sitting beside it — not inferred from a
registry page, a badge, or memory. Where a manifest declares no licence field, the package's own
`LICENSE` file and README were opened and the finding is recorded as such.

Production and development are separated by `package-lock.json`'s own `dev` flag, because the
distinction is legally load-bearing: a copyleft build tool that never ships a byte to a browser
is a different question from a copyleft library inside the bundle.

**Audited against:** `package-lock.json` v3 · 538 lockfile entries · 161 production, 377
development-only. 126 non-optional production packages; the remainder are per-platform binaries
(§7).

**Audit date:** 2026-08-19. Re-run it (§11) whenever `package.json` changes.

---

## 2. Summary

Across the **production** tree:

| Licence | Packages | Category |
| --- | --- | --- |
| MIT | 93 | Permissive |
| Apache-2.0 | 14 | Permissive, patent grant, NOTICE convention |
| BSD-3-Clause | 7 | Permissive |
| ISC | 6 | Permissive |
| `0BSD` · `MIT-0` · `Unlicense` | 3 | Public-domain equivalent |
| `(Apache-2.0 AND MIT)` | 1 | posthog-js |
| `(MPL-2.0 OR Apache-2.0)` | 1 | dompurify — take the Apache-2.0 arm |
| `CC-BY-4.0` | 1 | caniuse-lite — build-time data |
| Bespoke | 1 | **GSAP** — see §3 |
| Not declared in the manifest | 1 | **webgl-constants** — MIT per its own LICENSE file |
| LGPL-3.0-or-later | 1 | libvips, inside an optional native binary — see §3 and §7 |

**The headline:** nothing that reaches the browser is copyleft. Every byte of JavaScript, CSS,
WASM and font served to a customer is MIT, BSD, ISC, Apache-2.0, a public-domain equivalent, or
first-party VAYRO work. The three copyleft-adjacent items in the tree (`libvips`, `lightningcss`,
`axe-core`) are all build-time or tooling, and two of them are development-only.

---

## 3. Flags — read these before shipping

Five entries need a decision or an acknowledgement rather than a row in a table.

### 3.1 GSAP — a bespoke licence, not an SPDX identifier

```
gsap@3.15.0
license: "Standard 'no charge' license: https://gsap.com/standard-license."
Copyright (c) 2008-2026, GreenSock. All rights reserved.
```

There is **no `LICENSE` file in the package** — the terms live at that URL and the README
restates them. This is the one dependency in the tree whose terms cannot be read offline, which
is why it gets its own section.

The package's own README states the current position plainly:

> Thanks to Webflow, GSAP is now 100% FREE including ALL of the bonus plugins […] That's right —
> the entire GSAP toolset is FREE, even for commercial use!

**What VAYRO actually uses:** `gsap` core and `ScrollTrigger`, both from the free tier under any
reading of the licence, historic or current. No Club-GSAP-era plugin (`SplitText`, `MorphSVG`,
`ScrollSmoother`, `DrawSVG`, `Inertia`, …) is imported anywhere in `src/`, even though the npm
package now ships all of them in the same tarball.

**What still needs care:**

- The standard licence restricts one specific shape of commercial use — a product where end
  users are charged *for access to GSAP-based features*. A storefront selling jackets is not
  that. Read the terms before that ever changes.
- **Do not start importing bonus plugins casually.** They are in `node_modules/gsap/` and will
  import cleanly. Each one is a licence question re-opened, and a build that succeeds is not
  evidence that the terms were checked.
- Because the terms are a URL rather than a file, **capture a dated copy of
  <https://gsap.com/standard-license> with the release** if your legal process requires an
  archivable record.

> Consider whether GSAP is load-bearing at all. It is used for exactly one thing: the
> `ScrollTrigger` binding in `TransformationScene`. That is the only dependency in the tree with
> a bespoke licence, and it is one scroll binding deep. Not a recommendation to remove it — a
> note that the exposure is small and known.

### 3.2 sharp / libvips — LGPL-3.0-or-later, and why it does not matter here

```
sharp@0.35.3                      Apache-2.0
@img/sharp-libvips-<platform>     LGPL-3.0-or-later   (optional, per-platform)
```

`sharp` itself is Apache-2.0. Its prebuilt native payload bundles **libvips**, which is
LGPL-3.0-or-later. It appears in the tree twice over:

1. As a `devDependency` of this repository, used by `scripts/build-media.mjs`,
   `build-brand-png.mjs` and `build-mockups.mjs` to generate the artwork in `public/`.
2. As an **optional dependency of `next` itself** — Next.js uses it for on-demand image
   optimisation at runtime.

Neither is a distribution problem:

- Nothing from libvips reaches the browser. It is a server-side native library; what customers
  receive are the AVIF/WebP bytes it produced, and image output is not a derivative work of the
  encoder.
- LGPL's relinking obligation attaches to *distributing* the linked work. VAYRO deploys a
  service; it does not ship binaries to users.
- `sharp` is dynamically loaded by Next at runtime, which is the arrangement LGPL §4 is written
  to accommodate in any case.

**Record it, do not act on it.** If VAYRO ever ships a self-hosted, redistributable build (a
Docker image handed to a third party, an on-premise bundle), revisit this — that is distribution,
and the LGPL notice and relink obligations start applying to the native payload.

### 3.3 caniuse-lite — CC-BY-4.0

```
caniuse-lite@1.0.30001809   CC-BY-4.0   (production tree, via next and browserslist)
```

A Creative Commons **Attribution** licence on a browser-support dataset, pulled in by Next.js and
by `browserslist`. It is consumed at build time to decide transpilation targets; none of its data
is served.

CC-BY requires attribution when the licensed material is *shared*. This document is that
attribution: the data is from the [caniuse.com](https://caniuse.com) database by Alexis Deveria
and contributors, distributed under CC-BY-4.0. No further step is needed unless VAYRO
redistributes the dataset itself, which it does not.

### 3.4 dompurify — dual-licensed `(MPL-2.0 OR Apache-2.0)`

```
dompurify@3.4.13   (MPL-2.0 OR Apache-2.0)   via posthog-js
```

A dual licence is a choice, and the choice is yours. **Take the Apache-2.0 arm** and MPL's
file-level copyleft never engages. Nothing in this repository modifies DOMPurify's source, so
even the MPL arm would impose nothing beyond notice retention — but electing Apache-2.0 removes
the question entirely and keeps the bundle uniformly permissive.

### 3.5 webgl-constants — no licence field in the manifest

```
webgl-constants@1.1.1   (no `license` in package.json)   via detect-gpu → @react-three/drei
```

The package ships a `LICENSE` file and its README states: my work is released under the MIT
license, by Tim van Scherpenzeel. **It is MIT** — the manifest field is simply missing, which is
why automated scanners flag it as unknown. Recorded here so the next audit does not re-open it.

### 3.6 Development-only copyleft, for completeness

| Package | Licence | Where it comes from |
| --- | --- | --- |
| `lightningcss` (+ platform binaries) | MPL-2.0 | Tailwind CSS 4's build pipeline |
| `axe-core` | MPL-2.0 | `eslint-plugin-jsx-a11y`, via `eslint-config-next` |

Both are `dev: true` in the lockfile. Neither is imported by application code, neither is
bundled, and MPL-2.0 is file-level copyleft that engages only on modifying the licensed files —
which nothing here does.

---

## 4. Direct production dependencies

Everything in `dependencies` in `package.json`, with the licence read from the installed package.

| Package | Version | Licence | Attribution file | What it does here |
| --- | --- | --- | --- | --- |
| `@google/model-viewer` | 4.3.1 | **Apache-2.0** | `LICENSE` | The AR runtime — Scene Viewer and Quick Look hand-offs (`src/components/ar/ModelViewerFallback.tsx`) |
| `@react-three/drei` | 10.7.8 | MIT | `LICENSE` | `Environment`, `Lightformer`, `ContactShadows`, `OrbitControls`, `Html`, `useGLTF`, `useProgress` |
| `@react-three/fiber` | 9.7.0 | MIT | — (declared in manifest; author Paul Henschel) | React renderer for three.js. The whole 3D layer |
| `@stripe/stripe-js` | 9.13.0 | MIT | `LICENSE` | Stripe Elements loader |
| `@supabase/ssr` | 0.12.4 | MIT | `LICENSE` | Cookie-based Supabase auth for Server Components and the proxy |
| `@supabase/supabase-js` | 2.112.3 | MIT | `LICENSE` | Database, auth and storage client |
| `animejs` | 4.5.0 | MIT | `LICENSE.md` | Small timeline animations (`animate`, `createTimeline`) |
| `class-variance-authority` | 0.7.1 | **Apache-2.0** | `LICENSE` | Variant typing for the UI primitives |
| `clsx` | 2.1.1 | MIT | `license` | Class composition, behind `cn()` |
| `gsap` | 3.15.0 | **Bespoke — see §3.1** | none in package | `ScrollTrigger` for the transformation section |
| `lucide-react` | 1.31.0 | ISC | `LICENSE` | Generic icons. The VAYRO icon set in `@/components/icons` is first-party |
| `motion` | 13.1.0 | MIT | `LICENSE.md` | `motion/react` — page and component motion |
| `next` | 16.3.1 | MIT | `license.md` | The framework |
| `posthog-js` | 1.417.4 | **`(Apache-2.0 AND MIT)`** | `LICENSE` | Product analytics, when configured |
| `react` | 19.2.8 | MIT | `LICENSE` | — |
| `react-dom` | 19.2.8 | MIT | `LICENSE` | — |
| `resend` | 6.20.0 | MIT | `LICENSE` | Transactional email |
| `stripe` | 22.5.0 | MIT | `LICENSE` | Server-side payments and webhook verification |
| `tailwind-merge` | 3.6.0 | MIT | `LICENSE.md` | Conflict resolution inside `cn()` |
| `three` | 0.185.1 | MIT | `LICENSE` | WebGL engine. Copyright © 2010-2026 three.js authors |
| `zod` | 4.4.3 | MIT | `LICENSE` | Runtime validation at every boundary |
| `zustand` | 5.0.15 | MIT | `LICENSE` | Cart and wishlist stores |

Two of these are Apache-2.0 and therefore carry the NOTICE convention: **`@google/model-viewer`**
and **`class-variance-authority`**. See §10.

---

## 5. Direct development dependencies

Not distributed. Listed because a build toolchain is still a supply chain.

| Package | Version | Licence |
| --- | --- | --- |
| `@tailwindcss/postcss` | 4.3.3 | MIT |
| `@types/node` | 20.19.43 | MIT |
| `@types/react` | 19.2.18 | MIT |
| `@types/react-dom` | 19.2.4 | MIT |
| `@types/three` | 0.185.4 | MIT |
| `eslint` | 9.39.5 | MIT |
| `eslint-config-next` | 16.3.1 | MIT |
| `sharp` | 0.35.3 | Apache-2.0 (+ LGPL native payload — §3.2) |
| `tailwindcss` | 4.3.3 | MIT |
| `typescript` | 5.9.3 | **Apache-2.0** |

---

## 6. Transitive production dependencies

126 non-optional packages. The 3D and AR layers are the deepest part of the tree and the part
most worth knowing by name, so they are broken out first.

### 6.1 The 3D layer

| Package | Version | Licence | Reached via |
| --- | --- | --- | --- |
| `three-stdlib` | 2.36.1 | MIT | drei — **and imported directly** by `JacketModel` (`SkeletonUtils`), `optimization.ts` (`KTX2Loader`) and `ProductViewerScene` (the `OrbitControls` type) |
| `draco3d` | 1.5.7 | **Apache-2.0** | three-stdlib. Geometry decompression |
| `@types/draco3d` · `@types/offscreencanvas` · `@types/webxr` | — | MIT | three-stdlib |
| `fflate` | 0.8.3 (+ 0.6.11, 0.4.9 nested) | MIT | three-stdlib, posthog-js |
| `potpack` | 1.0.2 | ISC | three-stdlib |
| `camera-controls` | 3.1.2 | MIT | drei |
| `maath` | 0.10.8 | MIT | drei |
| `meshline` | 3.3.1 | MIT | drei |
| `three-mesh-bvh` | 0.8.3 | MIT | drei |
| `troika-three-text` · `troika-three-utils` · `troika-worker-utils` | 0.52.x | MIT | drei |
| `webgl-sdf-generator` | 1.1.1 | MIT | troika |
| `bidi-js` | 1.0.3 | MIT | troika |
| `detect-gpu` | 5.0.70 | MIT | drei |
| `webgl-constants` | 1.1.1 | MIT (**per LICENSE file** — §3.5) | detect-gpu |
| `stats-gl` | 2.4.2 | MIT | drei (bundles its own `three@0.170.0`, MIT) |
| `stats.js` · `@types/stats.js` | 0.17.x | MIT | drei |
| `glsl-noise` | 0.0.0 | MIT | drei |
| `hls.js` | 1.7.0 | **Apache-2.0** | drei (video textures) |
| `@mediapipe/tasks-vision` | 0.10.17 | **Apache-2.0** | drei (face/hand tracking helpers) |
| `@monogrid/gainmap-js` | 3.4.0 | MIT | drei **and** model-viewer |
| `@dimforge/rapier3d-compat` | 0.12.0 | **Apache-2.0** | drei's physics helpers |
| `meshoptimizer` | 1.1.1 | MIT | three-stdlib / gltf tooling |
| `@tweenjs/tween.js` | 23.1.3 | MIT | camera-controls |
| `promise-worker-transferable` | 1.0.4 | **Apache-2.0** | troika |
| `suspend-react` · `its-fine` · `tunnel-rat` · `react-use-measure` · `utility-types` | — | MIT | fiber / drei |
| `@use-gesture/react` · `@use-gesture/core` | 10.3.1 | MIT | drei |

> Several of these — `hls.js`, `@mediapipe/tasks-vision`, `@dimforge/rapier3d-compat` — are
> drei's dependencies for features VAYRO does not use. They are in `node_modules`; they are not
> in the bundle, because the site imports named drei components and nothing pulls those code
> paths. Listed for completeness of the supply chain, not because they ship.

### 6.2 The AR layer

| Package | Version | Licence | Reached via |
| --- | --- | --- | --- |
| `lit` · `lit-html` · `lit-element` · `@lit/reactive-element` · `@lit-labs/ssr-dom-shim` | 3.x / 4.x / 2.x | **BSD-3-Clause** | `@google/model-viewer` — the custom element is a Lit element |
| `@types/trusted-types` | 2.0.7 | MIT | lit |

`@google/model-viewer` declares `three@^0.183.0` as a peer dependency while this repository pins
`three@^0.185.1`. That range does not formally admit 0.185, so npm may report a peer conflict on
a clean install; see `DEPLOYMENT.md` §2 for the install note. It is a compatibility matter, not a
licence one.

### 6.3 Everything else

| Package | Version | Licence |
| --- | --- | --- |
| `@babel/runtime` | 7.29.7 | MIT |
| `@img/colour` | 1.1.0 | MIT |
| `@next/env` | 16.3.1 | MIT |
| `@posthog/browser-common` · `@posthog/core` · `@posthog/types` | — | MIT |
| `@stablelib/base64` | 1.0.1 | MIT |
| `@supabase/auth-js` · `functions-js` · `phoenix` · `postgrest-js` · `realtime-js` · `storage-js` | 2.x / 0.4.5 | MIT |
| `@swc/helpers` | 0.5.23 | **Apache-2.0** |
| `@types/react-reconciler` | 0.28.9 | MIT |
| `base64-js` | 1.5.1 | MIT |
| `baseline-browser-mapping` | 2.11.15 | **Apache-2.0** |
| `buffer` | 6.0.3 | MIT |
| `caniuse-lite` | 1.0.30001809 | **CC-BY-4.0** — §3.3 |
| `client-only` | 0.0.1 | MIT |
| `cookie` | 1.1.1 | MIT |
| `core-js` | 3.50.0 | MIT |
| `cross-env` | 7.0.3 | MIT |
| `cross-spawn` · `path-key` · `shebang-command` · `shebang-regex` · `which` · `isexe` | — | MIT / ISC |
| `detect-libc` | 2.1.2 | **Apache-2.0** |
| `dompurify` | 3.4.13 | **`(MPL-2.0 OR Apache-2.0)`** — §3.4 |
| `fast-sha256` | 1.3.0 | **Unlicense** |
| `framer-motion` · `motion-dom` · `motion-utils` | 13.x | MIT |
| `iceberg-js` | 0.8.1 | MIT |
| `ieee754` | 1.2.1 | BSD-3-Clause |
| `immediate` · `lie` · `is-promise` | — | MIT |
| `nanoid` | 3.3.18 | MIT |
| `picocolors` | 1.1.1 | ISC |
| `postal-mime` | 2.7.5 | **MIT-0** |
| `postcss` | 8.5.23 | MIT |
| `preact` | 10.29.8 | MIT |
| `query-selector-shadow-dom` | 1.0.1 | MIT |
| `require-from-string` | 2.0.2 | MIT |
| `scheduler` | 0.27.0 | MIT |
| `semver` | 7.8.5 | ISC |
| `source-map-js` | 1.2.1 | BSD-3-Clause |
| `standardwebhooks` | 1.0.0 | MIT |
| `styled-jsx` | 5.1.6 | MIT |
| `tslib` | 2.8.1 | **0BSD** |
| `use-sync-external-store` | 1.6.0 | MIT |
| `web-vitals` · `web-vitals-soft-navs` | 5.3.0 / 6.0.0 | **Apache-2.0** |

---

## 7. Platform binaries

The lockfile carries per-platform native packages that npm installs selectively. On this machine
most are absent; they are listed here because a Linux CI runner or a Vercel build *will* install
some of them.

| Family | Licence | Notes |
| --- | --- | --- |
| `@next/swc-<platform>` (8 variants) | MIT | Next.js's Rust compiler. Same licence as `next` |
| `@img/sharp-<platform>` (14 variants) | Apache-2.0 | sharp's own native bindings |
| `@img/sharp-libvips-<platform>` (10 variants) | **LGPL-3.0-or-later** | The libvips payload — §3.2 |
| `@emnapi/runtime` | MIT | WASM variants of sharp |
| `lightningcss-<platform>` | MPL-2.0 | Development-only — §3.6 |

Exactly one of these families is copyleft, and it is a server-side image encoder that is never
distributed. See §3.2.

---

## 8. Typefaces

Three families, all loaded through `next/font/google` in `src/app/layout.tsx`, which **downloads
them at build time and self-hosts the `.woff2` files** from `/_next/static/media/`. No request
ever leaves for `fonts.googleapis.com` or `fonts.gstatic.com` at runtime — which is also why the
CSP in `next.config.ts` needs no font host in `font-src`.

Self-hosting is redistribution, so the licence terms apply to VAYRO directly, not merely to
Google.

| Family | Role | Weights shipped | Licence | Copyright line (verified against the upstream `OFL.txt`) |
| --- | --- | --- | --- | --- |
| **Archivo** | Display — `--font-display` | 400 · 500 · 600 | SIL Open Font License 1.1 | `Copyright 2020 The Archivo Project Authors (https://github.com/Omnibus-Type/Archivo)` |
| **Inter** | Sans — `--font-sans` | 400 · 500 · 600 | SIL Open Font License 1.1 | `Copyright 2020 The Inter Project Authors (https://github.com/rsms/inter)` |
| **IBM Plex Mono** | Technical accent — `--font-mono` | 400 · 500 | SIL Open Font License 1.1 | `Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"` |

All three verified as **SIL OFL 1.1** against the `OFL.txt` shipped in the `google/fonts`
repository for each family, not from memory.

### What OFL 1.1 requires of VAYRO

- **Notice retention.** The copyright notice and licence must travel with any redistributed font
  file. `next/font` copies the binaries as-is without a licence file beside them, so **this
  section is the notice** — keep it with any distribution of the built site.
- **Reserved Font Names.** IBM Plex carries the Reserved Font Name "Plex". A modified derivative
  may not be released under that name. VAYRO does not modify or subset-and-rename any font, so
  this does not engage — but it rules out ever shipping a hand-edited "VAYRO Plex".
- **No standalone sale.** The fonts may not be sold on their own. Bundled inside the site, they
  are fine.
- **Derivatives inherit OFL.** Relevant only if a family is ever forked or a custom wordmark font
  is built from one of them.

> The VAYRO wordmark is **not** set in any of these faces. It is drawn from geometry in
> `scripts/wordmark.mjs` (§9), so no font's outlines are embedded in the logo and no OFL
> derivative-work question arises for the brand mark.

---

## 9. First-party assets

Everything in this section is **original to this project** and carries no third-party licence,
attribution requirement or usage restriction. This matters commercially: there is no stock
photograph, no purchased icon set, no licensed 3D scan and no borrowed typeface anywhere in the
product surface.

| Asset class | Location | Provenance |
| --- | --- | --- |
| Brand vector — mark, wordmark, lockups | `public/brand/*.svg` | **Generated from geometry in code** by `scripts/outline.mjs`, `scripts/wordmark.mjs`, `scripts/brand.mjs`. Never hand-drawn from a template, never traced |
| Brand raster | `public/brand/png/` | `scripts/build-brand-png.mjs`, rendered from the same geometry at density 600 |
| Application mockups | `public/brand/applications/` | `scripts/build-mockups.mjs`, compositing the generated mark |
| Editorial and studio imagery | `public/media/*.{webp,jpg}` | **Generated, not photographed.** Art-directed compositions built from the brand palette by `scripts/build-media.mjs`. See `docs/MEDIA.md`, which documents each plate and what a real photograph would replace it with |
| Material macros | `public/media/material-*.{webp,jpg}` | Generated warp-and-weft weave structure — no fabric photography |
| Icon set | `src/components/icons/` | Drawn for VAYRO in the brand's line weight. `lucide-react` (ISC) is available for generic UI glyphs and is separately licensed |
| 3D geometry | `src/components/three/geometry.ts` | The Meridian shell is **built procedurally in code** — revolved and swept from a profile table. It is not a scan, not a marketplace asset, and not derived from one |
| Shaders | `src/components/three/materials.ts`, `Environment.tsx` | Written for this project — the fold, the ripstop weave, the drifting motes |
| Design tokens, layout system, motion presets | `src/lib/` | Original |
| Product copy, specifications, journal entries | `src/data/catalog.ts` | Original. The Meridian is a fictional product; its specifications are internally consistent and invented |
| Database schema | `supabase/migrations/` | Original |

`public/models/` is empty by design (`3D_ARCHITECTURE.md` §6). **If a real GLB is ever
commissioned, scanned or purchased, its licence belongs in this document** — that is the single
most likely way a third-party asset enters this repository, and it would arrive without a
`package.json` to declare itself.

The same applies to the two other asset routes that bypass npm entirely:

- **Photography** replacing the generated plates in `public/media/` (see `docs/MEDIA.md` §10 for
  the commissioning brief). Record the shoot licence, the model releases and the usage term.
- **Decoders** copied into `public/draco/` and `public/basis/` (`3D_ARCHITECTURE.md` §12). These
  come out of `node_modules/three/examples/jsm/libs/`, so they inherit three.js's MIT licence —
  but the Draco decoder within is Google's, **Apache-2.0**. Once those files are committed to
  `public/`, `draco3d`'s Apache-2.0 licence applies to files VAYRO serves directly, and its
  notice belongs in §10.

---

## 10. Attribution obligations, in one place

Most of the tree is MIT/ISC/BSD, which requires the copyright notice and permission notice to be
retained in redistributions. For a hosted web application, publishing this file satisfies that —
there is no requirement to inject notices into the served bundle.

**Apache-2.0 packages** additionally carry §4(d): if the work ships a `NOTICE` file, its contents
must be reproduced in derivative distributions. The Apache-2.0 dependencies in the production
tree are:

```
@google/model-viewer   4.3.1     Copyright Google LLC
class-variance-authority 0.7.1   Copyright Joe Bell
draco3d                1.5.7     Copyright Google LLC
@mediapipe/tasks-vision 0.10.17  Copyright Google LLC
hls.js                 1.7.0     Copyright Dailymotion
@dimforge/rapier3d-compat 0.12.0 Copyright Dimforge
@swc/helpers           0.5.23
baseline-browser-mapping 2.11.15
detect-libc            2.1.2
promise-worker-transferable 1.0.4
web-vitals             5.3.0     Copyright Google LLC
web-vitals-soft-navs   6.0.0
sharp                  0.35.3    Copyright Lovell Fuller
typescript             5.9.3     Copyright Microsoft Corp.  (dev)
```

None of these ships a `NOTICE` file requiring propagation as of this audit — verified by looking
for `NOTICE*` alongside each `LICENSE`. Re-check on upgrade; a new `NOTICE` file is exactly the
kind of thing a minor version bump can introduce silently.

**Explicit attributions**, gathered so they exist in one place:

- three.js — © 2010–2026 three.js authors, MIT.
- React and React DOM — © Meta Platforms, Inc. and affiliates, MIT.
- Next.js — © Vercel, Inc., MIT.
- `<model-viewer>` — © Google LLC, Apache-2.0.
- Lit — © Google LLC, BSD-3-Clause.
- Draco — © Google LLC, Apache-2.0.
- GSAP — © 2008–2026 GreenSock, under GreenSock's standard "no charge" licence.
- caniuse-lite — data from the caniuse.com database, CC-BY-4.0.
- Archivo — © 2020 The Archivo Project Authors, SIL OFL 1.1.
- Inter — © 2020 The Inter Project Authors, SIL OFL 1.1.
- IBM Plex Mono — © 2017 IBM Corp., Reserved Font Name "Plex", SIL OFL 1.1.

---

## 11. Re-running this audit

The audit is a script's worth of work and should be repeated whenever `package.json` changes.

```bash
# Every production package, its version and its declared licence.
node -e '
const fs = require("fs");
const lock = require("./package-lock.json");
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  let licence = "(unresolved)";
  try { licence = JSON.parse(fs.readFileSync(path + "/package.json", "utf8")).license ?? "(none)"; }
  catch {}
  console.log([path.replace(/^node_modules\//, ""), entry.version, licence,
               entry.optional ? "optional" : ""].join(" | "));
}'
```

```bash
# Anything that is not a recognised permissive identifier — the review queue.
npm ls --omit=dev --all --parseable 2>/dev/null | \
  xargs -I{} sh -c 'node -e "
    const p = require(\"{}/package.json\");
    const l = String(p.license ?? \"NONE\");
    if (!/^(MIT|ISC|BSD-[23]-Clause|Apache-2\.0|0BSD|MIT-0|Unlicense|CC0-1\.0)$/.test(l))
      console.log(p.name, p.version, l);
  " 2>/dev/null'
```

```bash
# Which top-level package pulls in a flagged transitive dependency.
npm ls <package-name> --omit=dev
```

**A declared licence field is a claim, not a finding.** For anything that is not plain MIT, open
the package's `LICENSE` file before recording it — that is how `webgl-constants` (§3.5) and GSAP
(§3.1) were resolved, and neither would have been correct from the manifest alone.

Checklist for a new dependency:

- [ ] Licence read from the installed package, not from the registry page
- [ ] Copyleft? Determine whether it reaches the browser, the server, or only the build
- [ ] Apache-2.0? Check for a `NOTICE` file to propagate
- [ ] Dual-licensed? Record which arm is elected, and why
- [ ] No licence field? Open `LICENSE` and the README; record where the answer came from
- [ ] Non-npm asset (font, model, photograph, decoder)? It has no manifest — add it to §9
      by hand, because nothing else will

---

<div align="center">

*Audited 2026-08-19 against `package-lock.json` v3.*
*This document is the notice file. Keep it with any distribution of the built site.*

`README.md` · `DEPLOYMENT.md` · `3D_ARCHITECTURE.md` · `docs/MEDIA.md`

</div>
