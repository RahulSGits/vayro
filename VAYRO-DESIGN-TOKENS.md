# VAYRO — Design Tokens

The complete token reference. Every value below exists in exactly two places and they must
agree:

| Artefact | Role |
| --- | --- |
| `src/lib/design-tokens.ts` | The typed source. Imported by TS/TSX and by the WebGL layer. |
| `src/app/globals.css` | The CSS mirror. Declares every custom property and the helper classes. |

**How to consume them**

- In markup and Tailwind classes → the **CSS variable**: `text-[var(--fg-muted)]`,
  `border-[var(--border)]`, `duration-[var(--d-fast)]`.
- In TypeScript (motion configs, Three.js materials, computed styles) → the **TS path**:
  `motion.duration.slow`, `three.tiers.high`, `palette.forest`.
- Never a raw hex, never a Tailwind palette colour, never a hard-coded millisecond value.

A dash in this document's "CSS variable" column means the token is TS-only — it has no CSS
mirror because nothing in CSS needs it.

Rationale and usage rules live in `DESIGN.md`. This file is the lookup table.

---

## 1. Colour — palette

Theme-independent raw material. Components do not reference these directly except where a
specific physical colour is meant regardless of theme (brand artwork, a product swatch, a
chart series).

| CSS variable | TS token path | Value | Name |
| --- | --- | --- | --- |
| `--ink` | `palette.ink` | `#0B0C0B` | VAYRO Black — never pure `#000` |
| `--ink-80` | `palette.ink80` | `#1A1C1A` | Ink 80 |
| `--ink-60` | `palette.ink60` | `#2A2D2B` | Ink 60 |
| `--graphite` | `palette.graphite` | `#3A3E3C` | Graphite |
| `--slate` | `palette.slate` | `#5C6360` | Slate |
| `--titanium` | `palette.titanium` | `#8C9195` | Titanium |
| `--stone` | `palette.stone` | `#B9B2A5` | Stone |
| `--sand` | `palette.sand` | `#D8D0C0` | Sand |
| `--bone` | `palette.bone` | `#EAE5DB` | Bone |
| `--ivory` | `palette.ivory` | `#F4F1EA` | VAYRO Ivory — warm off-white |
| `--white` | `palette.white` | `#FBFAF7` | White — not `#FFF` |
| `--forest` | `palette.forest` | `#1E2C25` | Deep Forest |
| `--olive` | `palette.olive` | `#3D4536` | Deep Olive |
| `--moss` | `palette.moss` | `#5A6350` | Moss |
| `--signal` | `palette.signal` | `#C4501E` | Signal — restrained ember, true alerts only |
| `--positive` | `palette.positive` | `#2F6B4F` | Positive |
| `--warning` | `palette.warning` | `#8A6A1F` | Warning |
| `--danger` | `palette.danger` | `#9B2C20` | Danger |

## 2. Colour — semantic

The only colour tokens a component should normally name. Declared on `:root` for light and
redefined under `:root[data-theme="dark"]`.

| CSS variable | TS token path | Light | Dark |
| --- | --- | --- | --- |
| `--bg` | `semantic.{theme}.bg` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--bg-elevated` | `semantic.{theme}.bgElevated` | `#FBFAF7` white | `#1A1C1A` ink-80 |
| `--bg-sunken` | `semantic.{theme}.bgSunken` | `#EAE5DB` bone | `#060706` |
| `--bg-inverse` | `semantic.{theme}.bgInverse` | `#0B0C0B` ink | `#F4F1EA` ivory |
| `--fg` | `semantic.{theme}.fg` | `#0B0C0B` ink | `#F4F1EA` ivory |
| `--fg-muted` | `semantic.{theme}.fgMuted` | `#5C6360` slate | `#B9B2A5` stone |
| `--fg-subtle` | `semantic.{theme}.fgSubtle` | `#8C9195` titanium | `#8C9195` titanium |
| `--fg-inverse` | `semantic.{theme}.fgInverse` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--border` | `semantic.{theme}.border` | `rgba(11,12,11,0.12)` | `rgba(244,241,234,0.14)` |
| `--border-strong` | `semantic.{theme}.borderStrong` | `rgba(11,12,11,0.26)` | `rgba(244,241,234,0.30)` |
| `--accent` | `semantic.{theme}.accent` | `#1E2C25` forest | `#EAE5DB` bone |
| `--accent-fg` | `semantic.{theme}.accentFg` | `#F4F1EA` ivory | `#0B0C0B` ink |
| `--overlay` | `semantic.{theme}.overlay` | `rgba(11,12,11,0.44)` | `rgba(6,7,6,0.62)` |
| `--scrim` | `semantic.{theme}.scrim` | `linear-gradient(180deg, rgba(11,12,11,0) 0%, rgba(11,12,11,0.55) 100%)` | `linear-gradient(180deg, rgba(6,7,6,0) 0%, rgba(6,7,6,0.72) 100%)` |

**Theme mechanics**

- `data-theme` is written on `<html>` before first paint by `themeScript`
  (`src/components/providers/ThemeProvider.tsx`). **Dark is the default**; an explicit choice
  stored at `localStorage['vayro.theme']` always wins.
- `[data-surface="inverse"]` redeclares the whole semantic set (plus `color-scheme`,
  `background` and `color`) so an inverted region needs no per-component casing — and it
  inverts correctly in *both* themes.
- `.theme-switching` is applied to `<html>` for 400 ms during a swap so surfaces cross-fade
  instead of snapping.

## 3. Tailwind bridge

`@theme inline` in `globals.css` republishes the semantic set as Tailwind colour utilities.
Both forms are legal; prefer the arbitrary-value form (`bg-[var(--bg-sunken)]`) since it is
the one the rest of the codebase uses.

| Tailwind token | Resolves to |
| --- | --- |
| `--color-bg` · `--color-bg-elevated` · `--color-bg-sunken` · `--color-bg-inverse` | the matching `--bg*` |
| `--color-fg` · `--color-fg-muted` · `--color-fg-subtle` · `--color-fg-inverse` | the matching `--fg*` |
| `--color-line` | `var(--border)` |
| `--color-line-strong` | `var(--border-strong)` |
| `--color-accent` · `--color-accent-fg` | `var(--accent)` / `var(--accent-fg)` |

## 4. Typography — families

| CSS variable | TS token path | Family | Weights loaded |
| --- | --- | --- | --- |
| `--font-display` | `type.family.display` | Archivo | 400 / 500 / 600 |
| `--font-sans` | `type.family.sans` | Inter | 400 / 500 / 600 |
| `--font-mono` | `type.family.mono` | IBM Plex Mono | 400 / 500 |

All three are loaded through `next/font/google` in `src/app/layout.tsx` — self-hosted,
subset, `display: swap`. `body` sets Inter with `font-synthesis-weight: none`, so a weight
that was not loaded is never faked.

## 5. Typography — scale

Each row is a CSS helper class **and** a TS entry under `type.scale.*`. Use the class; the TS
entry exists for canvas, SVG and computed-style work.

| Helper class | TS token path | Family | Size | Line height | Tracking | Weight |
| --- | --- | --- | --- | --- | --- | --- |
| `.t-display-xl` | `type.scale.displayXl` | display | `clamp(3.4rem, 11vw, 9.5rem)` | 0.88 | −0.04em | 500 |
| `.t-display-lg` | `type.scale.displayLg` | display | `clamp(2.6rem, 7.5vw, 6rem)` | 0.92 | −0.035em | 500 |
| `.t-display-md` | `type.scale.displayMd` | display | `clamp(2rem, 4.6vw, 3.5rem)` | 0.98 | −0.03em | 500 |
| `.t-h1` | `type.scale.h1` | display | `clamp(1.9rem, 3.6vw, 2.75rem)` | 1.06 | −0.025em | 500 |
| `.t-h2` | `type.scale.h2` | display | `clamp(1.5rem, 2.6vw, 2rem)` | 1.12 | −0.02em | 500 |
| `.t-h3` | `type.scale.h3` | sans | `clamp(1.15rem, 1.7vw, 1.375rem)` | 1.24 | −0.012em | 500 |
| `.t-body-lg` | `type.scale.bodyLg` | sans | `1.0625rem` (17px) | 1.62 | −0.006em | 400 |
| *(body default)* | `type.scale.body` | sans | `0.9375rem` (15px) | 1.66 | −0.004em | 400 |
| `.t-body-sm` | `type.scale.bodySm` | sans | `0.8125rem` (13px) | 1.6 | 0 | 400 |
| `.t-label` | `type.scale.label` | sans | `0.6875rem` (11px) | 1.1 | 0.22em, uppercase | 500 |
| `.t-label-sm` | `type.scale.labelSm` | sans | `0.625rem` (10px) | 1.1 | 0.26em, uppercase | 500 |
| `.t-caption` | `type.scale.caption` | sans | `0.75rem` (12px) | 1.45 | 0.01em | 400 |
| `.t-spec` | `type.scale.spec` | **mono** | `0.75rem` (12px) | 1.5 | 0.06em, tabular | 400 |
| `.t-price` | `type.scale.price` | sans | `1.0625rem` | 1.2 | −0.01em, tabular | 500 |
| `.t-price-lg` | `type.scale.priceLg` | display | `1.5rem` | 1.1 | −0.02em, tabular | 500 |

Wrapping helpers, CSS only: `.t-balance` → `text-wrap: balance` (headlines) ·
`.t-pretty` → `text-wrap: pretty` (paragraphs).

## 6. Space

4px base. Named steps only — a value outside this scale is a bug.

| TS token path | Value | px |
| --- | --- | --- |
| `space.px` | `1px` | 1 |
| `space[0]` | `0` | 0 |
| `space[1]` | `0.25rem` | 4 |
| `space[2]` | `0.5rem` | 8 |
| `space[3]` | `0.75rem` | 12 |
| `space[4]` | `1rem` | 16 |
| `space[5]` | `1.25rem` | 20 |
| `space[6]` | `1.5rem` | 24 |
| `space[8]` | `2rem` | 32 |
| `space[10]` | `2.5rem` | 40 |
| `space[12]` | `3rem` | 48 |
| `space[16]` | `4rem` | 64 |
| `space[20]` | `5rem` | 80 |
| `space[24]` | `6rem` | 96 |
| `space[32]` | `8rem` | 128 |
| `space[40]` | `10rem` | 160 |
| `space[48]` | `12rem` | 192 |

Tailwind's default spacing utilities map onto these directly (`p-6` = 24px = `space[6]`).

## 7. Section rhythm

| CSS variable | TS token path | Value | Helper class |
| --- | --- | --- | --- |
| `--section-tight` | `section.tight` | `clamp(3rem, 6vw, 5rem)` | `.section-tight` |
| `--section` | `section.default` | `clamp(4.5rem, 9vw, 8rem)` | `.section` |
| `--section-loose` | `section.loose` | `clamp(6rem, 13vw, 12rem)` | `.section-loose` |

## 8. Layout

| CSS variable | TS token path | Value | Notes |
| --- | --- | --- | --- |
| `--max-w` | `layout.maxWidth` | `90rem` (1440px) | `.shell` container width |
| `--max-text` | `layout.maxText` | `38rem` | Measure cap for body copy (≈68 characters) |
| `--gutter` | `layout.gutter` | `clamp(1.25rem, 4vw, 3.5rem)` | 20px phone → 56px large desktop |
| `--header-h` | `layout.headerH` | `4.5rem` (72px) | Header at rest |
| — | `layout.headerHSm` | `3.5rem` (56px) | Header once scrolled — TS only |
| — | `layout.columns` | `12` | `.grid-12`; collapses to 4 below 768px |

Container helpers: `.shell` (max-width + gutter, centred) · `.shell-wide` (full width, same
gutter) · `.grid-12` (12 → 4 columns at 768px, `gap: var(--gutter)`) · `.rule` (1px `--border`
divider) · `.contour` (repeating 115° hairline field at `color-mix(fg 6%)`).

## 9. Radii

| CSS variable | TS token path | Value | Applied to |
| --- | --- | --- | --- |
| — | `radius.none` | `0` | Buttons, cards, images, sections |
| `--r-xs` | `radius.xs` | `2px` | Focus ring rounding, chips, swatch outlines |
| `--r-sm` | `radius.sm` | `3px` | Inputs, Stripe Elements, small controls |
| `--r-md` | `radius.md` | `4px` | Dialog and drawer panels |
| `--r-lg` | `radius.lg` | `6px` | The largest radius in the system |
| `--r-pill` | `radius.pill` | `999px` | Scrollbar thumb, spinner, count badges only |

There is no `rounded-xl` / `2xl` / `3xl` in this brand.

## 10. Elevation

| CSS variable | TS token path | Light value | Dark value |
| --- | --- | --- | --- |
| — | `shadow.none` | `none` | `none` |
| `--sh-sm` | `shadow.sm` | `0 1px 2px rgba(11,12,11,.06), 0 1px 1px rgba(11,12,11,.04)` | `0 1px 2px rgba(0,0,0,.5)` |
| `--sh-md` | `shadow.md` | `0 4px 16px rgba(11,12,11,.08), 0 1px 2px rgba(11,12,11,.05)` | `0 4px 18px rgba(0,0,0,.55)` |
| `--sh-lg` | `shadow.lg` | `0 12px 40px rgba(11,12,11,.12), 0 2px 6px rgba(11,12,11,.06)` | `0 14px 44px rgba(0,0,0,.6)` |
| `--sh-xl` | `shadow.xl` | `0 28px 80px rgba(11,12,11,.18), 0 4px 12px rgba(11,12,11,.08)` | `0 30px 90px rgba(0,0,0,.7)` |
| — | `shadow.focus` | `0 0 0 2px var(--bg), 0 0 0 4px var(--fg)` | same |

The TS `shadow` table carries the light values; `globals.css` swaps all four for pure-black
shadows under `data-theme="dark"`, because a tinted shadow on ink reads as fog.

Focus rings in practice come from the global `:focus-visible` rule
(`outline: 2px solid var(--fg); outline-offset: 3px`), not from `shadow.focus`.

## 11. Motion — duration

| CSS variable | TS token path | Value | Register |
| --- | --- | --- | --- |
| `--d-instant` | `motion.duration.instant` | 90ms / `0.09` | Pressed states, checkbox tick |
| `--d-fast` | `motion.duration.fast` | 160ms / `0.16` | Functional feedback — hover, focus, colour |
| `--d-standard` | `motion.duration.standard` | 340ms / `0.34` | UI transitions — panels, tabs, fades |
| `--d-slow` | `motion.duration.slow` | 520ms / `0.52` | Entrances, drawers, headline reveals |
| `--d-cine` | `motion.duration.cinematic` | 900ms / `0.9` | Storytelling — image reveals, hero |
| `--d-epic` | `motion.duration.epic` | 1200ms / `1.2` | Once per page, at most |

CSS carries milliseconds, TS carries seconds (Motion's unit). Nothing animates at a duration
outside this set.

## 12. Motion — easing

| CSS variable | TS token path | Curve | Character |
| --- | --- | --- | --- |
| `--e-out` | `motion.ease.out` / `easeCss.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | **Default.** Firm arrival, no bounce |
| `--e-in-out` | `motion.ease.inOut` / `easeCss.inOut` | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetrical, reversible motion |
| `--e-in` | `motion.ease.in` / `easeCss.in` | `cubic-bezier(0.5, 0, 0.75, 0)` | Exits only |
| `--e-fold` | `motion.ease.fold` / `easeCss.fold` | `cubic-bezier(0.32, 0.72, 0, 1)` | Material that folds — drawers, clip reveals, the 3D fold |
| — | `motion.ease.linear` | `[0, 0, 1, 1]` | Continuous loops only |

`motion.ease.*` are cubic-bézier control-point tuples for Motion; `easeCss.*` are the same
curves as CSS strings.

## 13. Motion — stagger

| TS token path | Value | Preset that uses it |
| --- | --- | --- |
| `motion.stagger.tight` | `0.035` | `staggerTight` |
| `motion.stagger.default` | `0.06` | `staggerText` |
| `motion.stagger.loose` | `0.11` | Long editorial lists |

## 14. Motion — presets

Exported from `src/lib/motion.ts`. Import these rather than writing a bare transition.

| Export | Type | Definition |
| --- | --- | --- |
| `t.fast` / `t.standard` / `t.slow` / `t.cinematic` | `Transition` | Matching duration + `ease.out` |
| `t.fold` | `Transition` | `slow` + `ease.fold` |
| `fadeUp` | `Variants` | opacity 0→1, y 22→0, slow |
| `fadeIn` | `Variants` | opacity 0→1, standard |
| `scaleReveal` | `Variants` | opacity + scale 0.965→1, cinematic |
| `imageReveal` | `Variants` | `clip-path: inset(0 0 100% 0)` → `inset(0)`, scale 1.06→1, cinematic + fold |
| `clipText` | `Variants` | y 110%→0 inside an overflow-hidden mask, slow + fold |
| `staggerText` | `Variants` | `staggerChildren: 0.06`, `delayChildren: 0.05` |
| `staggerTight` | `Variants` | `staggerChildren: 0.035` |
| `cardLift` | object | `rest` y 0 → `hover` y −6, standard |
| `pageTransition` | `Variants` | in standard, out fast + `ease.in` |
| `drawer` | object | x ±100%→0 slow/fold in, standard/in out; custom prop selects the side |
| `inView` | object | `{ once: true, amount: 0.25, margin: '0px 0px -12% 0px' }` |
| `durations` / `eases` / `staggers` | objects | Re-exports of the raw token groups |

## 15. Breakpoints

| Tailwind token | TS token path | Value |
| --- | --- | --- |
| `--breakpoint-sm` | `breakpoint.sm` | `30rem` / 480px |
| `--breakpoint-md` | `breakpoint.md` | `48rem` / 768px — the 12 → 4 column switch |
| `--breakpoint-lg` | `breakpoint.lg` | `64rem` / 1024px |
| `--breakpoint-xl` | `breakpoint.xl` | `80rem` / 1280px |
| `--breakpoint-2xl` | `breakpoint['2xl']` | `96rem` / 1536px |

## 16. Z-index

TS-only (`z` in `design-tokens.ts`). Nothing should invent a stacking value.

| TS token path | Value | Layer |
| --- | --- | --- |
| `z.base` | 0 | Page content |
| `z.raised` | 10 | Hover lifts, sticky sub-elements |
| `z.sticky` | 100 | Sticky rails, mobile buy bar |
| `z.header` | 200 | Site header |
| `z.drawer` | 300 | Cart drawer, filter drawer |
| `z.overlay` | 400 | Scrims |
| `z.modal` | 500 | Dialogs |
| `z.toast` | 600 | Toasts |
| `z.cursor` | 900 | Custom cursor layer |

## 17. 3D / WebGL

TS-only (`three` in `design-tokens.ts`), consumed by `@/components/three` and
`@/components/product-3d`.

| TS token path | Value |
| --- | --- |
| `three.dpr` | `{ min: 1, max: 2 }` |
| `three.tiers.high` | `{ dpr: 2, shadows: true, env: 'studio', particles: 900, aa: true }` |
| `three.tiers.medium` | `{ dpr: 1.5, shadows: true, env: 'studio', particles: 380, aa: true }` |
| `three.tiers.low` | `{ dpr: 1, shadows: false, env: 'none', particles: 0, aa: false }` |
| `three.camera` | `{ fov: 32, near: 0.1, far: 120, position: [0, 0.15, 5.2] }` |
| `three.orbit` | `{ speed: 0.16, maxPolar: 1.92, minPolar: 0.78, damping: 0.07 }` |
| `three.material.shellRoughness` | `0.62` |
| `three.material.shellMetalness` | `0.04` |
| `three.material.hardwareRoughness` | `0.28` |
| `three.material.hardwareMetalness` | `0.92` |

The tier a device is assigned comes from `useDeviceTier()` (`src/hooks/useDeviceTier.ts`);
components read budgets from `three.tiers[tier]` and never choose their own.

## 18. Brand geometry constants

Generated by `node scripts/build-brand.mjs` into `src/lib/brand-art.ts`. Do not hand-edit
that file — edit `scripts/wordmark.mjs` / `scripts/brand.mjs` and regenerate.

| Export | Value | Meaning |
| --- | --- | --- |
| `SYMBOL_PATH` | path data, `0 0 100 100` | The Vector, regular optical cut (≥ 24px) |
| `SYMBOL_MICRO_PATH` | path data, `0 0 100 100` | Micro optical cut (≤ 22px, embroidery, hardware) |
| `GLYPH_PATHS` | `{ V, A, Y, R, O }` | Drawn wordmark glyphs, each `{ w, d }` |
| `CAP_HEIGHT` | `100` | Wordmark cap height, in wordmark units |
| `STEM_WEIGHT` | `14.2` | Stem weight at cap 100 — the system's structural constant |
| `TRACKING` | `17` | Default letter tracking, in wordmark units |
| `WORDMARK_WIDTH` | `446` | Advance width of "VAYRO" at cap 100 |
| `LOCKUP_SYMBOL_RATIO` | `1.3` | Symbol height ÷ wordmark cap height, as used by `VayroLockup` |
| `LOCKUP_GAP_RATIO` | `0.46` | Horizontal lockup gap ÷ cap height |
| `CLEAR_SPACE_RATIO` | `0.28` | Minimum clear space ÷ symbol height |
| `PATTERN_TILE` | `120` | Contour pattern tile size |
| `PATTERN_PATH` | path data | One tile of the contour field |

> **Known divergence.** The static SVG lockups in `public/brand/` are drawn by
> `scripts/brand.mjs` at `SYM_RATIO = 1.204` — the optically resolved ratio documented in
> `VAYRO-BRAND-GUIDELINES.md` §5. `LOCKUP_SYMBOL_RATIO` in the generated TS constants is
> `1.3`, so the React `VayroLockup` sets the symbol marginally larger than the exported
> artwork. Print, packaging and any placed asset should use the SVGs in `public/brand/`.
> Aligning the two means changing the literal in `scripts/build-brand.mjs` and re-running it.

## 19. Storage keys

Not tokens, but the other set of strings that must not be invented twice.

| Key | Written by |
| --- | --- |
| `vayro.theme` | `ThemeProvider` (`light` \| `dark`) |
| `vayro.cart` | `useCart` (zustand `persist`, version 1) |
| `vayro.wishlist` | `useWishlist` (zustand `persist`, version 1) |

---

## Adding a token

1. Add it to `src/lib/design-tokens.ts` in the correct group.
2. Mirror it in `src/app/globals.css` — on `:root`, and under `:root[data-theme="dark"]` and
   `[data-surface="inverse"]` if it is colour.
3. Add the row here, with both names.
4. Only then use it in a component.

A value used in one component and nowhere else is not a token — inline it, or reconsider
whether the component belongs in the system.
