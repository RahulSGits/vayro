# VAYRO — Design System

**This file is the visual source of truth.**

Every page, section and component in this repository follows the language defined here.
No screen invents its own colour, type ramp, spacing rhythm, radius or motion curve. If a
screen needs something this document does not describe, the correct move is to extend the
system — `src/lib/design-tokens.ts` and `src/app/globals.css` — and then use it, never to
add a local value.

Two artefacts implement this document:

| Artefact | Role |
| --- | --- |
| `src/lib/design-tokens.ts` | The typed source. Consumed by TS/TSX and by the WebGL layer. |
| `src/app/globals.css` | The CSS mirror. Declares every `--token` and the helper classes. |

They must agree. When a value changes, it changes in both.
`VAYRO-DESIGN-TOKENS.md` is the reference table that maps one to the other.

The rest of the set:

| Document | Covers |
| --- | --- |
| `VAYRO-BRAND-GUIDELINES.md` | The identity itself — symbol, wordmark, lockups, applications, voice, messaging |
| `VAYRO-DESIGN-TOKENS.md` | Every token, with its CSS variable and TypeScript path |
| `ARCHITECTURE.md` | How the application is built: routes, data flow, security, 3D, performance |
| `docs/MEDIA.md` | The image library and its replacement brief |

---

## 1. Principles

1. **Engineered, not decorated.** Radii are near zero, shadows are rare, rules are hairlines.
   Structure comes from alignment and whitespace, not from boxes and cards.
2. **Restraint is the accent.** There is no bright brand colour. Emphasis is achieved with
   contrast, scale and space. `--signal` exists for genuine alerts and is used almost never.
3. **Type carries the design.** Large display sizes, tight negative tracking, and a wide,
   uppercase label face. Body copy is quiet and generous.
4. **Motion is choreography, not decoration.** Fixed registers, one easing family, everything
   respects `prefers-reduced-motion`.
5. **Mobile is designed, not shrunk.** Layouts collapse from 12 columns to 4 with intent.
6. **Every state is designed.** Loading, empty, error and disabled are part of the component,
   not an afterthought.

---

## 2. Colour

### 2.1 The rules

- **Only CSS variables.** Write `text-[var(--fg-muted)]`, `bg-[var(--bg-sunken)]`.
  Never a hex literal in a component, never a Tailwind palette colour (`text-gray-500`,
  `bg-zinc-900`) — those colours are not in this brand.
- **Semantic tokens first.** Components use `--bg` / `--fg` / `--border` / `--accent`.
  The palette variables (`--ink`, `--forest`, …) exist for the rare case where a specific
  material colour is meant regardless of theme — brand artwork, a swatch, a chart series.
- **Inverted regions.** Wrap any block that flips the palette in `data-surface="inverse"`.
  It re-declares the whole semantic set (and `color-scheme`) so descendants need no special
  casing, and it inverts correctly in *both* themes.
- **Transparency uses `color-mix`.** `color-mix(in oklab, var(--fg) 8%, transparent)` — never
  an opacity-modified hex, which would break under theme swap.

### 2.2 Palette (theme-independent)

| Token | Hex | Name | Notes |
| --- | --- | --- | --- |
| `--ink` | `#0B0C0B` | VAYRO Black | Primary dark. Never pure `#000`. |
| `--ink-80` | `#1A1C1A` | Ink 80 | Elevated dark surface. |
| `--ink-60` | `#2A2D2B` | Ink 60 | Dark structure, hairlines on ink. |
| `--graphite` | `#3A3E3C` | Graphite | Secondary structure; primary button hover. |
| `--slate` | `#5C6360` | Slate | Muted foreground, light theme. |
| `--titanium` | `#8C9195` | Titanium | Subtle foreground, both themes. |
| `--stone` | `#B9B2A5` | Stone | Muted foreground, dark theme. |
| `--sand` | `#D8D0C0` | Sand | Warm neutral; a product colourway. |
| `--bone` | `#EAE5DB` | Bone | Sunken light surface; dark-theme accent. |
| `--ivory` | `#F4F1EA` | VAYRO Ivory | Primary light. Warm off-white. |
| `--white` | `#FBFAF7` | White | Elevated light surface. Not `#FFF`. |
| `--forest` | `#1E2C25` | Deep Forest | Light-theme accent. |
| `--olive` | `#3D4536` | Deep Olive | Supporting natural tone. |
| `--moss` | `#5A6350` | Moss | Supporting natural tone. |
| `--signal` | `#C4501E` | Signal | Restrained ember. True alerts only. |
| `--positive` | `#2F6B4F` | Positive | Success. |
| `--warning` | `#8A6A1F` | Warning | Caution, low stock. |
| `--danger` | `#9B2C20` | Danger | Destructive, validation failure. |

### 2.3 Semantic tokens

| Token | Light — resolves to | Dark — resolves to |
| --- | --- | --- |
| `--bg` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--bg-elevated` | `#FBFAF7` white | `#1A1C1A` ink-80 |
| `--bg-sunken` | `#EAE5DB` bone | `#060706` |
| `--bg-inverse` | `#0B0C0B` ink | `#F4F1EA` ivory |
| `--fg` | `#0B0C0B` ink | `#F4F1EA` ivory |
| `--fg-muted` | `#5C6360` slate | `#B9B2A5` stone |
| `--fg-subtle` | `#8C9195` titanium | `#8C9195` titanium |
| `--fg-inverse` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--border` | `rgba(11,12,11,.12)` | `rgba(244,241,234,.14)` |
| `--border-strong` | `rgba(11,12,11,.26)` | `rgba(244,241,234,.30)` |
| `--accent` | `#1E2C25` forest | `#EAE5DB` bone |
| `--accent-fg` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--overlay` | `rgba(11,12,11,.44)` | `rgba(6,7,6,.62)` |
| `--scrim` | ink gradient, 0 → 55% | near-black gradient, 0 → 72% |

**Dark is the default theme.** `themeScript` in `src/components/providers/ThemeProvider.tsx`
is inlined in `<head>` and commits `data-theme` before first paint, so there is no flash.
An explicit choice (`localStorage['vayro.theme']`) always wins.

### 2.4 Contrast

| Pair | Ratio | Verdict |
| --- | --- | --- |
| ink on ivory | ~17.5:1 | AAA, all sizes |
| ivory on ink | ~17.5:1 | AAA, all sizes |
| slate on ivory | ~5.9:1 | AA body, AAA large |
| stone on ink | ~9.4:1 | AAA |
| titanium on ivory | ~3.0:1 | Large text and non-text only — never body copy |
| titanium on ink | ~5.7:1 | AA body |

`--fg-subtle` is a **decorative** foreground. Use it for eyebrows over a rule, disabled
glyphs, and 12px+ metadata that repeats information available elsewhere. It is not a body
colour in the light theme.

---

## 3. Typography

Three faces, all loaded through `next/font/google` in `src/app/layout.tsx`, all self-hosted
and subset by the framework. No external font requests are made at runtime.

| Role | Family | Weights | CSS variable | Used for |
| --- | --- | --- | --- | --- |
| Display | **Archivo** | 400 / 500 / 600 | `--font-display` | Headlines, campaign, editorial, price-lg |
| Primary sans | **Inter** | 400 / 500 / 600 | `--font-sans` | Navigation, body, product info, all UI |
| Technical | **IBM Plex Mono** | 400 / 500 | `--font-mono` | Specs, measurements, SKUs, order numbers |

`body` sets Inter at `0.9375rem / 1.66 / -0.004em` with `font-synthesis-weight: none` — a
missing weight must never be faked.

### 3.1 The ramp

Use the helper class. Do not restate the numbers.

| Class | Family | Size | Line height | Tracking | Weight |
| --- | --- | --- | --- | --- | --- |
| `.t-display-xl` | display | `clamp(3.4rem, 11vw, 9.5rem)` | 0.88 | −0.04em | 500 |
| `.t-display-lg` | display | `clamp(2.6rem, 7.5vw, 6rem)` | 0.92 | −0.035em | 500 |
| `.t-display-md` | display | `clamp(2rem, 4.6vw, 3.5rem)` | 0.98 | −0.03em | 500 |
| `.t-h1` | display | `clamp(1.9rem, 3.6vw, 2.75rem)` | 1.06 | −0.025em | 500 |
| `.t-h2` | display | `clamp(1.5rem, 2.6vw, 2rem)` | 1.12 | −0.02em | 500 |
| `.t-h3` | sans | `clamp(1.15rem, 1.7vw, 1.375rem)` | 1.24 | −0.012em | 500 |
| `.t-body-lg` | sans | `1.0625rem` (17px) | 1.62 | −0.006em | 400 |
| *(body default)* | sans | `0.9375rem` (15px) | 1.66 | −0.004em | 400 |
| `.t-body-sm` | sans | `0.8125rem` (13px) | 1.6 | 0 | 400 |
| `.t-label` | sans | `0.6875rem` (11px) | 1.1 | **0.22em**, uppercase | 500 |
| `.t-label-sm` | sans | `0.625rem` (10px) | 1.1 | **0.26em**, uppercase | 500 |
| `.t-caption` | sans | `0.75rem` (12px) | 1.45 | 0.01em | 400 |
| `.t-spec` | **mono** | `0.75rem` (12px) | 1.5 | 0.06em, tabular | 400 |
| `.t-price` | sans | `1.0625rem` | 1.2 | −0.01em, tabular | 500 |
| `.t-price-lg` | display | `1.5rem` | 1.1 | −0.02em, tabular | 500 |

Utility: `.t-balance` (`text-wrap: balance`) on headlines, `.t-pretty` on paragraphs.

### 3.2 Usage rules

- **One display size per viewport.** Two competing display headlines in the same screenful
  is the most common way this system is broken.
- **Labels are structural.** `.t-label` sits above a headline as an eyebrow, or inside a
  hairline rule as a section marker. It is never a paragraph.
- **`.t-spec` earns its place.** Mono is for numbers that are measurements — `318 g`,
  `24 × 16 × 9 cm`, `MER-BAS-M`, `VY-01041`. It is not a style, it is a signal that the
  content is technical fact.
- **Prices are tabular.** `.t-price` / `.t-price-lg` set `font-variant-numeric: tabular-nums`
  so a column of prices aligns.
- **Measure.** Body copy is capped at `--max-text` (38rem ≈ 68 characters).

---

## 4. Space, grid and layout

### 4.1 Scale

4px base. Named steps only.

`px · 0 · 1 (4) · 2 (8) · 3 (12) · 4 (16) · 5 (20) · 6 (24) · 8 (32) · 10 (40) · 12 (48) ·
16 (64) · 20 (80) · 24 (96) · 32 (128) · 40 (160) · 48 (192)`

Tailwind's spacing utilities map onto these directly; anything outside the scale is a bug.

### 4.2 Vertical rhythm

The page beat is a section, not a margin.

| Class | Padding-block | When |
| --- | --- | --- |
| `.section-tight` | `clamp(3rem, 6vw, 5rem)` | Dense utility areas — filter bars, account panels |
| `.section` | `clamp(4.5rem, 9vw, 8rem)` | The default. Every content section. |
| `.section-loose` | `clamp(6rem, 13vw, 12rem)` | Statement moments, full-bleed editorial |

### 4.3 Containers

| Class | Behaviour |
| --- | --- |
| `.shell` | `max-width: 90rem` (1440), centred, `padding-inline: var(--gutter)` |
| `.shell-wide` | Full width with the same gutter — for edge-to-edge media |

`--gutter` is `clamp(1.25rem, 4vw, 3.5rem)`: 20px on a phone, 56px on a large desktop.

### 4.4 Grid

`.grid-12` is a 12-column grid with `gap: var(--gutter)`. **Below 768px it becomes a
4-column grid** — spans must be written so they survive that collapse (a `col-span-6` on a
12-col grid becomes half of 4 columns, which is usually what you want; a `col-span-5` does
not, and needs an explicit mobile span).

Common editorial spans:

| Pattern | Desktop | Mobile |
| --- | --- | --- |
| Full-bleed statement | `col-span-12` | `col-span-4` |
| Editorial split | `col-span-6` / `col-span-6` | stacked `col-span-4` |
| Text column beside media | `col-span-5` + `col-start-8 col-span-5` | stacked |
| Product grid | 3 across (`lg`), 2 across (`md`), 2 across (`sm`) | |

### 4.5 Rules

`.rule` is a 1px `--border` divider. It is the primary structural device in this design —
prefer a rule over a card wherever the job is separation rather than grouping.

### 4.6 Header

`--header-h: 4.5rem` (72px) at rest, compacting to `3.5rem` (56px) once scrolled.
`html:focus-within { scroll-padding-top: calc(var(--header-h) + 1rem) }` keeps anchor
targets clear of it.

---

## 5. Radii, elevation and borders

### 5.1 Radii

| Token | Value | Applied to |
| --- | --- | --- |
| `--r-xs` | 2px | Focus ring rounding, chips, swatch outlines |
| `--r-sm` | 3px | Inputs, Stripe Elements, small controls |
| `--r-md` | 4px | Dialog and drawer panels |
| `--r-lg` | 6px | The largest radius in the system |
| `--r-pill` | 999px | Scrollbar thumb, spinner, count badges only |

**There is no `rounded-xl` / `2xl` / `3xl` in this brand.** Buttons and cards are square.

### 5.2 Elevation

| Token | Light | Purpose |
| --- | --- | --- |
| `--sh-sm` | `0 1px 2px rgba(11,12,11,.06), 0 1px 1px rgba(11,12,11,.04)` | Hairline lift |
| `--sh-md` | `0 4px 16px rgba(11,12,11,.08), 0 1px 2px rgba(11,12,11,.05)` | Popovers, toasts |
| `--sh-lg` | `0 12px 40px rgba(11,12,11,.12), 0 2px 6px rgba(11,12,11,.06)` | Drawers |
| `--sh-xl` | `0 28px 80px rgba(11,12,11,.18), 0 4px 12px rgba(11,12,11,.08)` | Modal dialogs |

Dark theme replaces all four with pure-black shadows (`.5 → .7` alpha) because a tinted
shadow on ink reads as fog.

**Shadow is the exception.** Default to a hairline border and a change of surface
(`--bg-elevated` / `--bg-sunken`). Shadow is reserved for things that genuinely float above
the page: drawers, dialogs, toasts.

### 5.3 Borders

Always 1px, always a token. `--border` for structure, `--border-strong` for interactive
edges (input underlines, secondary buttons, filter chips).

---

## 6. Motion

### 6.1 Registers

Nothing animates at a duration outside this set.

| Register | ms | CSS var | TS token | Use |
| --- | --- | --- | --- | --- |
| Instant | 90 | `--d-instant` | `motion.duration.instant` | Pressed states, checkbox tick |
| **Fast** | **160** | `--d-fast` | `.fast` | Functional feedback — hover, focus, colour change |
| **Standard** | **340** | `--d-standard` | `.standard` | UI transitions — panels, tabs, fades |
| **Slow** | **520** | `--d-slow` | `.slow` | Entrances, drawers, headline reveals |
| **Cinematic** | **900** | `--d-cine` | `.cinematic` | Storytelling — image reveals, hero |
| **Epic** | **1200** | `--d-epic` | `.epic` | Once per page, at most |

### 6.2 Easing

| Name | Curve | Character |
| --- | --- | --- |
| `--e-out` / `ease.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default.** Firm arrival, no bounce |
| `--e-in-out` / `ease.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetrical, for reversible motion |
| `--e-in` / `ease.in` | `cubic-bezier(0.5, 0, 0.75, 0)` | Exits only |
| `--e-fold` / `ease.fold` | `cubic-bezier(0.32, 0.72, 0, 1)` | Material that folds — drawers, clip reveals, the 3D fold |

No spring physics, no overshoot, no bounce. The brand does not wobble.

### 6.3 Stagger

`tight 0.035s` · `default 0.06s` · `loose 0.11s`. Applied through `staggerText` /
`staggerTight` in `src/lib/motion.ts`.

### 6.4 Presets

Import from `@/lib/motion` — never write a bare `transition={{ duration: 0.4 }}`.

| Preset | What it does |
| --- | --- |
| `fadeUp` | opacity 0→1, y 22→0, slow |
| `fadeIn` | opacity only, standard |
| `scaleReveal` | opacity + scale 0.965→1, cinematic |
| `imageReveal` | `clip-path: inset(0 0 100% 0)` → 0, scale 1.06→1, cinematic + fold ease. **The signature reveal.** |
| `clipText` | y 110%→0 inside an overflow-hidden mask, slow + fold |
| `staggerText` / `staggerTight` | Parent orchestrators |
| `cardLift` | y 0 → −6 on hover, standard |
| `pageTransition` | opacity in standard, out fast |
| `drawer` | x 100%→0 slow/fold in, standard/in out |
| `inView` | `{ once: true, amount: 0.25, margin: '0px 0px -12% 0px' }` |
| `t.fast / .standard / .slow / .cinematic / .fold` | Ready-made `Transition` objects |

The `<Reveal>` and `<RevealText>` components in `@/components/ui` wrap all of the above.
Scroll entrances go through them.

### 6.5 Reduced motion

`globals.css` collapses every animation and transition to `0.001ms` under
`prefers-reduced-motion: reduce`, and turns off smooth scrolling. On top of that:

- `useDeviceTier()` forces tier **low** when reduced motion is set — WebGL scenes render
  still, with no auto-rotation and no idle drift.
- Components that drive motion imperatively check `useReducedMotion()` from `motion/react`
  (`ProductCard` is the reference implementation).
- Content must never *depend* on motion: anything revealed by an animation is present and
  legible without it.

---

## 7. Components

Every primitive lives in `@/components/ui` and is exported from its barrel. Extend a
primitive; never re-implement one.

### 7.1 Button (`Button`, `ButtonLink`)

Uppercase, 500 weight, wide tracking, square, `active:scale-[0.985]`, transition at
`--d-fast` / `--e-out`.

| Variant | Rest | Hover |
| --- | --- | --- |
| `primary` | `--fg` on `--bg` (inverted) | background `--graphite` |
| `secondary` | 1px `--border-strong`, `--fg` text | fills to `--fg` / `--bg` |
| `ghost` | text only | `color-mix(fg 8%)` wash |
| `quiet` | `--fg-muted` | `--fg` |
| `accent` | `--accent` / `--accent-fg` | 90% opacity |
| `danger` | `--danger` | 90% opacity |
| `link` | underlined, offset 6px, normal case | decoration goes to `--fg` |

| Size | Height | Padding | Type |
| --- | --- | --- | --- |
| `xs` | 32px | 12px | 10px / 0.20em |
| `sm` | 40px | 16px | 11px / 0.20em |
| `md` | **48px** | 24px | 11px / 0.22em |
| `lg` | 56px | 32px | 12px / 0.22em |
| `icon` | 40 × 40 | — | — |

`block` stretches to full width. Disabled is `opacity: .4` + `pointer-events: none`.
`ButtonLink` takes the same variants and renders `next/link`.

### 7.2 Field / Input / Textarea / Select / Checkbox

Inputs are **underlines, not boxes**: transparent background, `border-bottom` at
`--border-strong`, no horizontal padding, `py-3`. Focus moves the underline to `--fg`.
Invalid moves it to `--danger`.

`<Field>` owns the label/hint/error contract: it generates the id, wires
`aria-describedby`, and renders the error with `role="alert"`. Labels are `.t-label` in
`--fg-muted`; required is a subtle `*`.

### 7.3 Cards

There is no generic Card component, by design. A "card" in VAYRO is an image, a hairline,
and type. `ProductCard` is the canonical example:

- Aspect ratio is themeable from outside: `[--card-aspect:4/5]` in `className`.
- One tab stop for the tile (the title link covers it via a pseudo-element), with the
  wishlist and quick-add controls stacked above.
- Hover crossfades to the second image and lifts the article by 6px (`cardLift`).
- Quick-add opens a size picker rather than guessing a variant.
- `priority` must be set on the first row so the LCP plate is not lazy-loaded.

### 7.4 Navigation

The header has **two states in one element**, so the change is a settle rather than a swap:

| State | When | Appearance |
| --- | --- | --- |
| Glass | Homepage, `scrollY ≤ 60` | No background, no rule, ivory tokens forced via an inline token overlay so it reads over a dark hero in either theme |
| Settled | Any other route, or past the threshold | Surface background, hairline bottom rule, height 72 → 56px |

Hysteresis: it takes 60px of scroll to settle and returns to glass only near the very top
(24px), so the header never flickers. Cart and wishlist counts are hidden for exactly one
render after hydration (`useSyncExternalStore`) because the stores rehydrate from
`localStorage` before React runs.

Mobile navigation is a full overlay (`MobileMenu`); search is a separate overlay. Only one
transient surface can be open at a time, and it is stamped with the route it opened on, so
navigating dismisses it without a synchronising effect.

### 7.5 Overlays

| Component | Behaviour |
| --- | --- |
| `Dialog` | Portal, `--overlay` scrim, focus trap, Escape to close, scroll lock, `--sh-xl` |
| `Drawer` | Same, entering on the `drawer` preset from left or right, `--sh-lg` |
| `Toast` | Max 3 on screen, auto-dismiss 5000ms (0 = manual), pause on hover/focus, polite live region, tone accent bar |

`useToast()` is the **only** out-of-band channel. `alert()` is banned.

### 7.6 States

| Component | Design |
| --- | --- |
| `Skeleton` | `color-mix(fg 7%)` block with a 1.6s shimmer sweep. `aria-hidden`. |
| `Spinner` | 2px ring, `--border-strong` with `--fg` top, `role="status"` |
| `EmptyState` | 30px VAYRO mark in `--fg-subtle`, `.t-h3` title, `.t-body-sm` body, optional action |
| `ErrorState` | `.t-label-sm` "Error" in `--danger`, then title/body/action, `role="alert"` |

Every route segment ships `loading.tsx`; segments that can fail ship `error.tsx`; dynamic
segments ship `not-found.tsx`.

### 7.7 Badge

`.t-label-sm`, 8px/4px padding, square. Tones: `default` (inverted), `inverse`, `outline`
(the default — hairline + muted text), `accent`, `muted`, `warning`.

### 7.8 Brand components

`VayroMark`, `VayroWordmark`, `VayroLockup`, `ContourField` from `@/components/brand`.
They inherit `currentColor` — never set a fill on them. See `VAYRO-BRAND-GUIDELINES.md`
for construction, clear space and minimum sizes.

`ContourField` opacity must stay at or below **0.14**.

---

## 8. Component state matrix

Every interactive component implements all of these. Missing one is an incomplete component.

| State | Expression |
| --- | --- |
| Rest | Token defaults |
| Hover | Colour or surface change at `--d-fast`. Pointer-fine devices only. |
| Focus-visible | `outline: 2px solid var(--fg)`, `outline-offset: 3px`, `--r-xs`. Global, never removed. |
| Active | `scale(0.985)` for buttons; underline shift for inputs |
| Selected / current | Solid `--fg` fill or a 1px `--fg` border, plus `aria-current` |
| Disabled | `opacity: .4`, `pointer-events: none`, `aria-disabled` |
| Loading | `Spinner` inside the control, control disabled, label retained |
| Invalid | `--danger` border + `role="alert"` message, `aria-invalid` |
| Empty | `EmptyState` with a route back |
| Error | `ErrorState` with a retry |

---

## 9. 3D and WebGL

The rules the WebGL layer must obey — all enforced centrally so no calling surface repeats
them. See `ARCHITECTURE.md` §7 for the module structure.

### 9.1 Hard rules

1. **Nothing mounts before capability is known.** `useDeviceTier()` reports `pending: true`
   until it has measured; the 2D plate renders during that window.
2. **No WebGL, no canvas.** If `detectWebGL()` fails, the caller's fallback image stands in
   permanently. The fallback is a real designed view, not a grey box.
3. **Budgets come from the tier, never from the component.** DPR, antialias and shadows are
   read from `three.tiers[tier]`.
4. **Nothing imports Three.js above the dynamic boundary.** `ProductViewer` resolves the
   product and the tier, then `next/dynamic({ ssr: false })` requests the scene chunk. A page
   that imports the viewer does not pay for Three.js until a capable device asks.
5. **A lost context is recoverable.** `webglcontextlost` is caught, the default prevented, and
   a "Restore view" control offered. A black rectangle is never acceptable.
6. **Reduced motion keeps the 3D, removes the autonomy.** Still frame, no auto-rotation, no
   idle drift; movement only on user input.

### 9.2 Device tiers

| Tier | DPR cap | Shadows | Environment | Particles | AA | Frameloop |
| --- | --- | --- | --- | --- | --- | --- |
| `high` | 2 | yes | studio | 900 | yes | always |
| `medium` | 1.5 | yes | studio | 380 | yes | always |
| `low` | 1 | no | none | 0 | no | demand |

Detection inputs: `hardwareConcurrency`, `deviceMemory`, `pointer: coarse`, viewport width,
`connection.saveData` / `effectiveType`, `prefers-reduced-motion`, WebGL availability.
Save-Data, 2G, no WebGL or reduced motion all force `low`. `AdaptiveDpr` is mounted on
everything below `high`.

### 9.3 Camera and material language

| Property | Value |
| --- | --- |
| FOV | 32° — long lens; product photography, not a game camera |
| Near / far | 0.1 / 120 |
| Rest position | `[0, 0.15, 5.2]` |
| Orbit speed | 0.16 — slow enough that it never reads as a demo |
| Polar limits | 0.78 → 1.92 rad |
| Damping | 0.07 |
| Shell roughness / metalness | 0.62 / 0.04 |
| Hardware roughness / metalness | 0.28 / 0.92 |
| Tone mapping | ACES Filmic, exposure 1.02, transparent clear |

Finishes (`SHELL_FINISHES`) are **offsets from these numbers**, never fresh values:
`ripstop` (the default, 20D grid), `twill`, `coated`, `softshell`.

### 9.4 Performance budgets

| Budget | Target |
| --- | --- |
| Procedural shell triangles | ≤ ~120k at `high` |
| GLB payload | ≤ 2.5 MB, Draco compressed |
| Textures | ≤ 2048², KTX2/Basis preferred. The procedural shell ships none. |
| Scene chunk | Loaded only after tier detection, only on capable devices |
| Frame budget | 16.6ms at `high`/`medium`; `low` runs on demand and draws only on change |
| Buffers | `disposeParts()` on unmount — no leaked geometry between routes |

The weave pattern is a shader-side roughness modulation, not a texture, and is dropped
entirely on `medium` and `low`.

---

## 10. Responsive behaviour

| Breakpoint | Width | Named |
| --- | --- | --- |
| `sm` | 480px / 30rem | Large phone |
| `md` | 768px / 48rem | Tablet — **the grid switch** |
| `lg` | 1024px / 64rem | Small laptop |
| `xl` | 1280px / 80rem | Desktop |
| `2xl` | 1536px / 96rem | Large desktop |

Rules:

- **Type is fluid, not stepped.** Display sizes use `clamp()` against `vw`, so there is no
  breakpoint at which a headline jumps.
- **Gutter and section padding are fluid too** — the whole page breathes with the viewport.
- **12 → 4 columns at 768px.** Design the 4-column layout deliberately.
- **Hover is a capability, not a size.** Hover affordances sit behind
  `@media (hover: hover) and (pointer: fine)`; the custom cursor layer only engages there.
- **Touch targets ≥ 44px.** The `md` button (48px) is the default for a reason.
- **Mobile buy bar.** Product pages pin a compact purchase bar on small screens rather than
  making the reader scroll back up.
- **Overflow.** `body` sets `overflow-x: hidden`; any wide element (spec table, filter row)
  scrolls inside its own container.

---

## 11. Accessibility

Non-negotiable, and checked before anything ships.

- **Semantic HTML first.** `header` / `nav` / `main#main` / `footer` / `article` / `section`
  with a heading. A `div` with a click handler is never a control.
- **Skip link.** `.skip-link` is the first focusable element and targets `#main`.
- **Focus is always visible.** The global `:focus-visible` rule is a 2px `--fg` outline at
  3px offset. It is never removed — if it looks wrong, the layout is wrong.
- **Keyboard paths.** Every drawer, dialog, tab set, accordion and menu traps focus while
  open, restores it on close, and closes on Escape.
- **Live regions.** Toasts are polite. Form errors use `role="alert"`. `Spinner` is
  `role="status"` with a label.
- **Images.** Every `next/image` carries a real `alt`; decorative art is `aria-hidden`.
  Brand SVGs render as `presentation` unless given a `title`.
- **Colour is never the only signal.** Stock, order status and validation always carry text.
- **Motion.** See §6.5.
- **Contrast.** See §2.4.
- **Zoom.** Layouts must survive 200% zoom without horizontal scroll — the fluid gutter and
  `clamp()` ramp do most of this work.

---

## 12. Imagery

- Format: `.webp` first, `.jpg` alongside as the fallback and for social cards.
- Always `next/image` with an explicit `sizes`; `fill` plus a positioned parent for
  art-directed plates.
- `priority` on the LCP plate only (hero, first product row).
- Placeholder surface is `--bg-sunken` so nothing flashes white in dark mode.
- Overlaid type sits on `--scrim`, never directly on the photograph.
- Aspect ratios in the library: 16:9 landscape, 3:4 portrait, 1:1 material macro,
  ~18:25 studio. See `docs/MEDIA.md` for the full inventory and replacement brief.

---

## 13. Checklist before a screen is done

- [ ] No hex literals, no Tailwind palette colours, no `rounded-xl`+
- [ ] Only `.t-*` type classes; one display size per viewport
- [ ] `.shell` / `.section*` used for rhythm; no ad-hoc page padding
- [ ] Motion from `@/lib/motion`; reduced motion verified
- [ ] Loading, empty and error states exist and are designed
- [ ] Full keyboard pass: tab order, focus visibility, Escape, focus restore
- [ ] Both themes checked, plus any `data-surface="inverse"` region
- [ ] 375px, 768px, 1440px checked — and 200% zoom
- [ ] `npx tsc --noEmit -p tsconfig.json` clean
