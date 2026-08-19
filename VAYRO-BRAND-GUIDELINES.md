# VAYRO — Brand Guidelines

**Engineered for the way forward.**

This is the brand book: what VAYRO is, how the identity is built, and the rules that keep it
consistent across screen, garment, hardware and print.

Two companion documents complete the set. `DESIGN.md` governs the product interface;
`VAYRO-DESIGN-TOKENS.md` is the token lookup table. Where a rule touches both brand and
interface — colour, type, motion — this document states the intent and `DESIGN.md` states the
implementation.

Every piece of artwork referenced here is **generated from code**, not drawn by hand. The
geometry lives in `scripts/{outline,wordmark,brand}.mjs`; the assets in `public/brand/` and
the TypeScript constants in `src/lib/brand-art.ts` are build outputs. To change the identity,
change the geometry and regenerate — never edit an SVG.

---

## 1. Positioning

VAYRO makes premium outdoor and travel equipment for people who move between environments
rather than into one.

| | |
| --- | --- |
| **Category** | Technical outerwear and travel equipment |
| **Audience** | Considered travellers and urban outdoor users — people who cross a city, an airport and a ridgeline in the same week |
| **Promise** | One layer that behaves like equipment whether it is worn or carried |
| **Proof** | The Meridian Carry Shell: 318 g, 20D recycled ripstop, folds into its own hood as a 2.1 L carry unit |
| **Price posture** | Premium, not luxury. ₹5,999 for the hero piece. Priced on engineering, not on logo |
| **Tone** | Confident, intelligent, minimal, precise, understated |

**Brand attributes:** Movement · Precision · Freedom · Exploration · Intelligence.

**What VAYRO is not.** It is not a neon sportswear label, not an expedition-summit brand, not
a lifestyle-influencer brand. There is no bright accent colour, no exclamation marks, no
manufactured scarcity, and no claim the product cannot pass a test for.

---

## 2. The identity at a glance

| Element | Definition |
| --- | --- |
| Symbol | **The Vector** — a chevron whose ascending arm turns |
| Wordmark | VAYRO, drawn geometric caps, cap height 100u, stem 14.2u, tracking 17u |
| Lockups | Horizontal (default) and stacked (hero, packaging) |
| Optical cuts | Regular ≥ 24px · Micro ≤ 22px, embroidery, hardware, favicons |
| Primaries | VAYRO Black `#0B0C0B` · VAYRO Ivory `#F4F1EA` |
| Accent | Deep Forest `#1E2C25` (light) · Bone `#EAE5DB` (dark) |
| Typefaces | Archivo (display) · Inter (sans) · IBM Plex Mono (technical) |
| Clear space | 0.28 × symbol height, all sides |
| Pattern | The contour field — repeated chevron topography, ≤ 14% opacity |
| Strapline | Engineered for the way forward |
| Product line | One layer. Every destination. |

---

## 3. Symbol exploration

Five directions were drawn on one 100-unit grid, rendered at 16px, reversed on ink, and
reviewed together. The exploration is reproducible: `node scripts/build-exploration.mjs`
writes the comparison sheet.

| | Direction | Idea | Outcome |
| --- | --- | --- | --- |
| **A** | **Forward V — Vector** | Two directional paths; the right arm ascends further. Movement with a destination. | **Survived.** Strongest at 16px. Read as "forward" without illustration. |
| **B** | **Fold V — Two Planes** | One ribbon folded on itself; a tonal split reads as a crease. Speaks directly to the packable product. | **Survived.** Beautiful at scale; the tonal split disappears in single-colour applications. |
| **C** | **Trail V — Switchback** | A route ascending terrain — a literal switchback path. | **Rejected.** Rich at 96px, collapses into noise below 32px. Too illustrative for hardware and embroidery. |
| **D** | **Horizon V — Terrain** | Chevron cut by a horizon line. | **Rejected.** Legible, but the rule reads as a strikethrough — a negation, not a direction. |
| **E** | **Motion V — Velocity** | Repetition implying speed. | **Rejected.** Reads as three marks rather than one. Speed is not the brand idea; direction is. |

### The synthesis

A and B were combined. From **Forward V** came the asymmetry — an ascending arm that goes
further than the descending one. From **Fold V** came the chamfer: every corner is a flat, a
fold seam, rather than a point.

The result is **The Vector**: one closed form that carries the direction of A and the
material logic of B, and holds together at 16px where both C and E failed.

The Fold expression survives as an **extension only** — a two-plane tonal treatment used in
motion and in the 3D system (§19). It is never the primary mark.

---

## 4. The Vector — construction

A single closed chevron. The descending arm splays; the ascending arm rises, **turns**, and
finishes vertical. That turn is the mark's one event: it reads as a change of direction — a
route, a way forward — and it is what stops the symbol reading as the letter V.

### 4.1 Centreline geometry

Drawn as a stroked polyline on a 100 × 100 grid, then converted to a filled outline with
mitred joins and chamfered corners (`offsetOutline()` in `scripts/outline.mjs`), then fitted
into the artboard.

| Point | Coordinate | Role |
| --- | --- | --- |
| P0 | `20, 20` | Descending arm origin — high left |
| P1 | `50, 84` | Vertex — the low point of the form |
| P2 | `70.9, 46` | **The turn** |
| P3 | `72.82, 14` | Terminal — 0.06 slope, effectively vertical |

Derived construction values: vertex `bx = 50`, `by = 84`; turn height `kinkY = 46`; ascending
splay `leg1 = 0.55` (dx per dy), terminal splay `leg2 = 0.06`; terminal `dy = 14`.

### 4.2 Why the turn sits where it does

The turn is placed where the ascending arm has travelled **0.614 of the descending arm's
length** (43.37u against 70.68u) — the golden section, to within half a percent of φ⁻¹
(0.618). It is high enough to read as a deliberate change of heading and low enough that the
terminal still has room to rise.

### 4.3 Chamfers — "nothing in VAYRO comes to a point"

Every corner is flattened:

| Corner | Chamfer | Purpose |
| --- | --- | --- |
| Vertex (P1, outer) | 4.5u | The fold seam. The mark's signature detail |
| The turn (P2, outer) | 3.5u | Keeps the direction change crisp at small sizes |
| Shoulder / terminals | flat cut | Butt terminals, never rounded caps |

The chamfer is not decoration. It is what makes the form read as engineered hardware rather
than drawn type, it is what an embroidery machine can actually produce at 8mm, and it is the
rule the wordmark inherits (§6) and the icon set inherits (§13).

### 4.4 Fitted values

After fitting into the artboard, on the 100-unit viewBox:

| Measurement | Regular cut | Micro cut |
| --- | --- | --- |
| Artboard | `0 0 100 100` | `0 0 100 100` |
| Ink bounding box | x 14.51 → 85.49, y 6 → 94 | x 11.74 → 88.26, y 3 → 97 |
| Ink height | 88u | 94u |
| Perpendicular arm weight | **13.08u** | **20.90u** |
| Optical padding | 6u | 3u |

The mark is intentionally not centred on the descending arm: its optical centre of mass sits
right of the geometric centre, which is what gives it forward bias.

---

## 5. The optical size system

**Two cuts, one form.** A single outline cannot serve a 1024px hero and a 16px favicon: at
small sizes the counter fills in and the chamfers vanish.

| Cut | Use at | Arm weight | Counter | Padding |
| --- | --- | --- | --- | --- |
| **Regular** | **≥ 24px** | 13.08u | Tight — matched to the wordmark's stem architecture | 6u |
| **Micro** | **≤ 22px**, embroidery, woven labels, hardware, favicons, app icons at small sizes | 20.90u (+60%) | Opened out so it survives ink spread, thread and pixel rounding | 3u |

**The threshold is 22px**, implemented in `VayroMark`:

```tsx
<VayroMark size={40} />              // regular, automatically
<VayroMark size={16} />              // micro, automatically
<VayroMark size={18} cut="regular" />  // override — only with a reason
```

Assets: `vayro-symbol.svg` / `vayro-symbol-ivory.svg` (regular) and
`vayro-symbol-micro.svg` / `vayro-symbol-micro-ivory.svg` (micro). `favicon.svg` uses the
micro cut. Physical production — embroidery, woven labels, laser etch, deboss — always uses
the micro cut regardless of reproduction size, because every one of those processes spreads.

---

## 6. Wordmark

**Drawn, not typeset.** VAYRO is a set of five custom glyphs on a 100-unit cap height. It is
never set in Archivo, Inter, or any other typeface, and it is never re-tracked by eye.

| Property | Value |
| --- | --- |
| Cap height | 100u |
| Stem weight | **14.2u** — the system's structural constant |
| Tracking | 17u |
| Total width | 446u ("VAYRO" at default tracking) |
| Glyph widths | V 76 · A 78 · Y 74 · R 70 · O 80 |

### Construction rules

- **Apex chamfers.** The V and A apexes carry a 5.4u flat — the same seam as the symbol's
  vertex. Nothing comes to a point.
- **The O is a superellipse, not a circle.** Drawn with a Bézier constant of `K = 0.615`
  against the circular 0.5523, which flattens its sides into engineered tension. Its base
  carries a horizontal flat — the same seam applied to a curve.
- **The A crossbar** is a rectangle overlapped into both diagonals rather than a fitted
  trapezoid, so the join stays clean when the outline is filled.
- **The R** is a stem, a bowl on a true superelliptical curve, and a straight leg that starts
  inside the bowl.
- **Winding.** All artwork is `fill-rule: nonzero`; outer contours wind positive, counters
  negative. A reversed counter is the failure mode to check for after any geometry change.

Assets: `vayro-wordmark.svg`, `vayro-wordmark-ivory.svg`, plus 1024/2048px PNGs. In React use
`<VayroWordmark height={16} />` — it draws the outlines and carries `aria-label="VAYRO"`.

---

## 7. Lockups

Two configurations. Both are locked: never rescale, re-space or recolour one element
independently of the other.

### 7.1 Horizontal — the default

Headers, footers, email, signage, anything wide.

| Property | Value |
| --- | --- |
| **Symbol height** | **1.204 × wordmark cap height** |
| Gap | 0.46 × cap height |
| Artboard | 612.4 × 120.4u (≈ 5.09 : 1) |
| Alignment | Wordmark optically centred on the symbol's vertical axis |

The 1.204 ratio is the point at which the two elements resolve into one weight:

- The symbol's ink stands **~6% taller than the cap height** (105.95u against 100u),
  overshooting the cap line and the baseline by about 3% each. That overshoot is what makes an
  angled, chamfered form *look* the same height as a flat-topped cap.
- The symbol's arm lands at **15.74u perpendicular against the wordmark's 14.2u stem** —
  11% heavier. That is the standard optical correction a diagonal needs against a vertical:
  drawn at equal measure, the diagonal reads lighter. At this ratio the pair reads as one
  weight, which is the whole point of the number.

### 7.2 Stacked

Hero moments, hang tags, packaging, app splash, square formats.

| Property | Value |
| --- | --- |
| Symbol height | 2.55 × cap height |
| Gap | 0.30 × cap height |
| Artboard | 446 × 385u |
| Alignment | Both elements centred on a shared vertical axis |

### 7.3 Symbol alone

Correct wherever VAYRO has already been named on the same surface, or where the surface is
too small for the wordmark: app icons, favicons, zip pulls, sleeve marks, social avatars,
sticker packs, the 3D viewer watermark.

### 7.4 In code

```tsx
<VayroLockup />                       // horizontal, cap 16px
<VayroLockup variant="stacked" cap={28} />
<VayroMark size={24} />
<VayroWordmark height={18} />
```

All four inherit `currentColor`. **Never set a fill on a brand component** — colour comes from
the surrounding surface tokens, which is what makes the mark correct in both themes and inside
`data-surface="inverse"` regions automatically.

---

## 8. Clear space and minimum sizes

### Clear space

**Minimum clear space on all sides = 0.28 × symbol height** (`CLEAR_SPACE_RATIO`).

For the horizontal lockup, measure from the artboard edges, not from the ink. Nothing enters
that field: no type, no rule, no image edge, no button. Where the mark sits on photography,
the clear-space field must also be free of high-frequency detail — add a scrim rather than
trusting a quiet-looking corner.

### Minimum sizes

| Application | Minimum | Cut |
| --- | --- | --- |
| Symbol, screen | **16px** | Micro |
| Symbol, embroidered | **8mm** | Micro |
| Symbol, laser etch / deboss | 6mm | Micro |
| Horizontal lockup, screen | **96px wide** | Regular |
| Stacked lockup, screen | **64px wide** | Regular |
| Horizontal lockup, print | 22mm wide | Regular |
| Wordmark alone | 60px wide | — |

Below the screen minimums, use the symbol alone. There is no smaller lockup.

---

## 9. Scale and legibility tests

Every candidate and the final mark were tested at fixed pixel sizes and at physical viewing
distance. `node scripts/build-identity-sheet.mjs` regenerates the review sheet with live
renders at 16 / 24 / 32 / 48 / 96 / 180px in both cuts.

### 9.1 Screen

| Size | Regular cut | Micro cut | Verdict |
| --- | --- | --- | --- |
| **16px** | Counter closes; the turn and the vertex chamfer disappear; reads as a filled wedge | Counter holds, turn still legible, chamfers read as a slight softening | **Micro only.** This is why the second cut exists |
| **32px** | Usable; the turn reads, the chamfers are a hint | Slightly heavy but correct; preferred on textured ground | **Either.** Regular on flat digital surfaces, micro on fabric, print and anything that spreads |
| **100px** | Full construction visible: turn, both chamfers, the asymmetry of the arms | Reads as overweight — the counter is too open at this size | **Regular** |
| **300px** | The intended presentation. The chamfer at the vertex is a distinct flat, not a rounded corner; the forward bias is unmistakable | Not for use | **Regular** |

Rejected concepts at 16px, for the record: **Trail V** became an unresolvable tangle; **Motion
V** merged into a solid block; **Horizon V** kept its strikethrough reading at every size.

### 9.2 Physical

| Distance | Application | Reading |
| --- | --- | --- |
| **1 m** — hand / rail distance | Hang tag, care label, zip pull, chest mark, product box | Symbol and wordmark both fully resolved. The chamfers are visible as flats and the mark reads as machined. At 34mm the embroidered chest mark holds its counter; the 8mm sleeve mark reads as a mark, not a smudge, because it uses the micro cut |
| **10 m** — shopfront / rail-end distance | Window vinyl, retail signage, event backdrop | The symbol survives; the wordmark's counters (R, O) begin to close below 60mm cap height. At this distance use the **symbol alone at ≥ 180mm**, or the horizontal lockup at ≥ 300mm wide. The asymmetry — one arm higher than the other — remains the recognition cue at the point where interior detail is gone |

Test rule of thumb for any new application: view it at the real distance, in the real
material, at the real size. A logo that only works on a monitor is half a logo.

---

## 10. Incorrect usage

Regenerate the visual version of this table with `node scripts/build-identity-sheet.mjs`.

| Never | Why |
| --- | --- |
| **Rotate the mark** | The vertical terminal is the "forward" cue. Rotated, it becomes an arrow or a check mark |
| **Stretch or condense** | The stem architecture is shared with the wordmark. Any non-uniform scale breaks the weight match |
| **Outline it** | The mark is a filled form. A stroked version has none of the chamfer logic |
| **Add effects** | No gradients, glows, drop shadows, bevels or transparency on the mark itself |
| **Re-typeset the wordmark** | VAYRO is drawn. Setting it in a font — including Archivo — is a different logo |
| **Change lockup spacing** | The gap and the 1.204 ratio are the lockup |
| **Use the regular cut below 24px** | The counter closes. Use the micro cut |
| **Recolour outside the palette** | Ink, ivory, or `currentColor`. Never a brand-adjacent tint, never a photo-sampled colour |
| **Place on busy imagery** | Either a quiet field or a `--scrim`. Never straight onto detail |
| **Enclose it in a shape** | The app-icon tile is the only approved container, and it is a generated asset |
| **Pair it with another mark inside the clear space** | Partner logos sit outside the clear-space field, separated by a hairline rule |
| **Animate it deforming** | See §18. The mark never squashes, bounces, or morphs into something else |

---

## 11. Colour

Two primaries carry the identity. Everything else is a restrained natural tone. **There is no
bright brand colour** — emphasis comes from contrast, scale and space.

### 11.1 Primaries

| | Hex | Notes |
| --- | --- | --- |
| **VAYRO Black** | `#0B0C0B` | Never pure `#000`. A green-shifted near-black that photographs as a material, not a void |
| **VAYRO Ivory** | `#F4F1EA` | Warm off-white. Never `#FFF` |

### 11.2 Supporting neutrals

`Ink 80 #1A1C1A` · `Ink 60 #2A2D2B` · `Graphite #3A3E3C` · `Slate #5C6360` ·
`Titanium #8C9195` · `Stone #B9B2A5` · `Sand #D8D0C0` · `Bone #EAE5DB` · `White #FBFAF7`

### 11.3 Naturals

`Deep Forest #1E2C25` (the accent in light contexts) · `Deep Olive #3D4536` · `Moss #5A6350`

### 11.4 Functional

`Signal #C4501E` — a restrained ember reserved for genuine alerts, and used almost never ·
`Positive #2F6B4F` · `Warning #8A6A1F` · `Danger #9B2C20`

### 11.5 Rules

- The mark appears in **ink on light** or **ivory on dark**. Nothing else.
- Product colourways are Basalt, Deep Forest, Sandstone and Titanium — palette colours, so
  brand and product never disagree.
- On screen, colour is consumed as tokens only. See `VAYRO-DESIGN-TOKENS.md` §1–2.
- Print: ink and ivory should be matched as flat spot colours where the run allows;
  four-colour process on uncoated stock shifts VAYRO Black warm, so specify a duotone build
  rather than accepting rich black defaults.

---

## 12. Typography

| Role | Face | Weights | Used for | Tracking |
| --- | --- | --- | --- | --- |
| **Display** | Archivo | 400 / 500 / 600 | Headlines, campaign lines, editorial | −0.04em → −0.02em |
| **Primary sans** | Inter | 400 / 500 / 600 | Navigation, body, product information, all UI | −0.006em → 0 |
| **Technical** | IBM Plex Mono | 400 / 500 | Specifications, measurements, SKUs, order numbers, labels | 0.06em |
| **Label** | Inter 500, uppercase | — | Eyebrows, buttons, metadata | 0.22em |

Rules:

1. **The wordmark is not a typeface.** Never set VAYRO in Archivo to fake the logo.
2. **Mono is a signal, not a style.** IBM Plex Mono means "this is a measured fact": `318 g`,
   `24 × 16 × 9 cm`, `MER-BAS-M`, `VY-01041`. Using it for atmosphere devalues it.
3. **One display size per view.** Two competing headlines in a viewport is the most common way
   this system gets broken.
4. **Labels are structural** — an eyebrow above a headline or a marker inside a rule, never a
   paragraph.
5. **Sentence case for body, uppercase for labels.** Headlines are sentence case; the brand
   does not shout.

The full ramp with sizes, line heights and helper classes is in `DESIGN.md` §3 and
`VAYRO-DESIGN-TOKENS.md` §5.

---

## 13. Iconography

The domain icon set lives in `src/components/icons/index.tsx` and is drawn on the mark's own
geometry.

| Property | Value |
| --- | --- |
| Grid | 24 × 24 |
| Stroke | 1.5, scaling with size |
| Corners | **Chamfered, never rounded** — the same rule as the mark |
| Terminals | Flat / butt. No round caps anywhere |
| Joins | Mitred |
| Direction changes | Use the chevron's turned arm wherever a line changes heading |

The set covers the product domain: `movement · weather · pack · weight · material · vent ·
storage · travel · durability · care · temperature · water · carry · fit`. These names are the
contract with the catalogue — `Product.features[].icon` resolves against them.

Generic UI chrome (chevrons, close, search, cart) stays on `lucide-react`. The VAYRO set is
not a replacement for a UI icon library; drawing one would dilute the meaning of the domain
icons.

Icons inherit `currentColor`, carry a `title` when they are the only carrier of meaning, and
are hidden from assistive technology when adjacent text already says it.

---

## 14. Pattern — the contour field

Repeated chevron topography derived from the symbol's own geometry: a shallow, tiling
chevron rhythm that reads as contour lines on a map.

| Property | Value |
| --- | --- |
| Tile | 120 × 120u |
| Stroke | 1.6u, mitred |
| Maximum opacity | **0.14** — and 0.10 is the component default |
| Assets | `public/brand/vayro-pattern.svg`; `<ContourField />`; the `.contour` CSS utility |

Rules: the pattern is **ambient texture only**. It sits behind content, never over product,
never at full contrast, and never as a focal element. It is at its best on tissue paper,
packaging interiors, empty states and the quiet half of an editorial split.

---

## 15. Photography direction

VAYRO photography has three registers. Every plate in the library belongs to exactly one.

### Field / editorial

Terrain read as geology, not as postcard. Layered ridgelines, high passes, coastal light,
transit blur. **No summit-flag heroics, no faces mid-laugh, no lens flare.** Human presence is
scale, not subject — a figure occupies a small fraction of the frame and is usually moving
away from camera. Available light. Long lens compression.

### Studio / technical

Product on a graduated neutral field — ink, ivory, forest or stone. One key light with a
large soft source, one subtle rim to separate the shell from the ground. Shadow is present and
directional; nothing floats. Garments are shot both worn and packed, because both states are
the product.

### Material / macro

Weave structure at magnification: ripstop grid, twill diagonal, coated shell, brushed liner.
Raking light across the surface so the structure has relief. These are the images that carry
the engineering claim, so they must be honest — the ripstop grid in a photograph should be the
grid in the fabric.

### Treatment rules

- Colour grade sits inside the palette: cool neutrals, deep greens, warm sand. No teal-orange.
- Grain is acceptable and preferred to plastic smoothness. Over-sharpening is not.
- Type over image goes on `--scrim`, never directly on detail.
- Crops are decisive: full-bleed or hard-aligned to the grid. No vignettes, no rounded corners.

The current library is generated placeholder art — real, art-directed plates that hold the
layout until photography exists. Every file and its replacement brief is in `docs/MEDIA.md`.

---

## 16. Packaging system

Restrained, structural, and cheap to reproduce well. Reference renders live in
`public/brand/applications/` and are regenerated by `node scripts/build-mockups.mjs`.

| Item | File | Treatment |
| --- | --- | --- |
| **Product box** | `packaging-product-box.jpg` | Matte ink board. Symbol **debossed** on the lid, no ink. Structure and shadow carry the branding |
| **Hang tag** | `packaging-hang-tag.jpg` | Heavy ivory card, stacked lockup, a mono spec line (`318 g · 2.1 L PACKED · 20D`), product name, price. Punched hole, no grommet |
| **Tissue paper** | `packaging-tissue.jpg` | Bone ground, contour field at low contrast, one small graphite mark |
| **Garment bag** | `packaging-garment-bag.jpg` | Recycled dark polybag, symbol plus wordmark in bone at small scale |
| **Sticker** | `packaging-sticker.jpg` | Ink disc, ivory symbol, hairline bone keyline. Symbol only |
| **Woven neck label** | `label-woven-neck.jpg` | Bone ground, ink symbol over wordmark, mono strapline: `ENGINEERED FOR THE WAY FORWARD` |
| **Care label** | `label-care.jpg` | Ivory ground, mono type, left-aligned rows: product, shell, wash, dry, iron, warnings, origin |

Principles: **one mark per surface**. Structure, material and negative space do the work.
Spec type is mono and factual. Nothing is glossy, nothing is foiled, and nothing carries a
pattern at more than 14% contrast.

---

## 17. Apparel and hardware branding

Quiet branding. The mark must be recognisable without being oversized — a VAYRO garment is
identified by its silhouette first and its mark second.

| Application | File | Specification |
| --- | --- | --- |
| **Chest mark** | `apparel-chest-mark.jpg` | Embroidered symbol, **~34mm**, ivory on shell, left chest. The default garment mark |
| **Sleeve mark** | `apparel-sleeve-mark.jpg` | **Micro cut**, ~18mm, left sleeve above the elbow. Micro is mandatory at this size |
| **Back wordmark** | `apparel-back-wordmark.jpg` | Wordmark across the upper back, restrained. Never full-width, never above 120mm |
| **Reflective mark** | `apparel-reflective-mark.jpg` | Retroreflective transfer, high contrast, used once per garment for visibility, not as decoration |
| **Zip pull** | `hardware-zipper-pull.jpg` | Laser mark on anodised alloy, micro cut. Hardware is quiet: anodised alloy, not moulded plastic |

Placement rules:

- **One mark per view.** A garment that shows the symbol on the chest does not also show it on
  the pocket.
- Embroidery uses the micro cut at any size, with a minimum of 8mm.
- The mark never crosses a seam, a zip, or a panel change.
- On technical shells, thread and transfer colour is ivory, bone or a tonal match — never a
  contrast colour introduced for the mark's benefit.

---

## 18. Motion identity

Motion is choreography, not decoration. The identity's movement language is the same as the
product interface's — the registers and curves in `DESIGN.md` §6 are the brand's, not just the
site's.

| Property | Value |
| --- | --- |
| Registers | 90 / 160 / 340 / 520 / 900 / 1200 ms — nothing between |
| Signature curve | `cubic-bezier(0.32, 0.72, 0, 1)` — the **fold** ease |
| Default curve | `cubic-bezier(0.16, 1, 0.3, 1)` — firm arrival, no bounce |

### How the mark moves

1. **It reveals; it does not perform.** The approved entrance is a masked wipe travelling
   along the ascending arm — vertex first, terminal last — over 520ms on the fold ease. The
   form is never drawn as an animated stroke, because the mark is a filled outline.
2. **The fold is the brand gesture.** Where a longer moment is warranted, the two-plane Fold
   expression (§19) creases along its seam over 900ms. This is the same gesture as the product
   folding into its hood — the identity and the garment do the same thing.
3. **No rotation, no bounce, no elastic, no morph.** The brand does not wobble. There is no
   spring physics anywhere in the system.
4. **One motion moment per screen.** If the hero animates, the header does not.
5. **Reduced motion is a first-class state.** Under `prefers-reduced-motion: reduce`, the mark
   appears at full opacity in place. Nothing is lost, because nothing was carried by the
   motion.

---

## 19. The 3D logo extension

The mark exists in three dimensions for hero moments, packaging visualisation and the product
viewer's brand furniture. It is an extension, not a second logo.

### Construction

- **Extrude the 2D outline. Do not remodel it.** Depth = 0.16 × symbol height.
- The chamfers extrude with the form; front and back faces keep their flats. **No added
  bevel** beyond a 0.01 × height edge break for highlight capture — a beveled logo is a
  different logo.
- Materials: anodised alloy (roughness 0.28, metalness 0.92) or matte ink (roughness 0.62,
  metalness 0.04) — the same two material families as the product hardware and shell, taken
  from `three.material` in the design tokens.
- Lighting: one large soft key, one rim. ACES Filmic tone mapping at exposure 1.02, matching
  the product stage.

### The Fold expression

`FOLD` in `scripts/brand.mjs` splits the symbol into two tonal planes along a seam that runs
from the vertex chamfer's midpoint up through the counter apex. Used for creasing animations
and for two-tone dimensional treatments. It is never the primary mark and never appears in a
lockup.

### Rules

- The silhouette must stay readable. If a camera angle makes the turn ambiguous, the angle is
  wrong.
- Rotation is limited to the same slow orbit as the product stage — 0.16 speed, polar range
  0.78 → 1.92 rad.
- Never combine the 3D mark with the 2D lockup in the same view.
- The 3D mark is decorative furniture: it is `aria-hidden`, and the accessible name always
  comes from a real 2D mark or text elsewhere on the page.

---

## 20. Brand voice

**Confident, intelligent, minimal, precise, understated. Technical where it earns it.**

| Principle | In practice |
| --- | --- |
| **Say the thing** | "318 g." Not "incredibly lightweight." |
| **Earn the technical word** | Use `20D`, `taped seams`, `PFC-free DWR` when they carry information. Do not sprinkle them for flavour |
| **Never overclaim** | The Meridian is **weather resistant**, explicitly **not waterproof** — the front zip is not a waterproof zip, and a garment is only as waterproof as its least waterproof opening |
| **No manufactured urgency** | No countdown timers, no "only 2 left" unless it is literally true and useful, no fake reviews or review counts |
| **Short sentences. Real full stops** | The rhythm is declarative |
| **British English** | Colour, litre, optimised, travelled |
| **Currency** | INR, formatted `₹5,999` |

### We say

> One layer. Every destination.
> Engineered for lighter travel.
> Built for the unexpected.
> Wear it. Pack it. Carry it.
> It leaves your hands, not your kit.

### We never say

> Elevate your lifestyle.
> Take your adventure to the next level.
> Premium high-quality fabric.
> Game-changing / revolutionary / unleash.
> Waterproof. Sustainable. Weatherproof. *(unsupported claims)*

---

## 21. Messaging system

### 21.1 One-line description

> VAYRO makes premium outdoor and travel equipment engineered to pack.

### 21.2 Fifty-word description

> VAYRO builds technical outerwear and travel equipment for people who move between
> environments. Every piece is designed for both states — worn and carried. The Meridian Carry
> Shell folds into its own hood and becomes a 2.1-litre carry unit with a shoulder strap. One
> layer. Every destination.

### 21.3 Hundred-word story

> A jacket is carried more often than it is worn. On a long transit day it comes off at
> security, goes back on at the gate, and spends four hours compressed under a seat. None of
> that is the part most outerwear is designed for.
>
> VAYRO started from the carried state and worked backwards. The Meridian's hood lining is
> oversized because it has to become a cavity. Its internal webbing is bar-tacked to the yoke
> because it has to take a shoulder load. The collar inverts because a jacket that folds into
> itself never needs a stuff sack — and a stuff sack is a thing you lose.

### 21.4 Hero headline system

Two or three words per line, sentence case, one display size, always with a supporting line
beneath.

| Pattern | Structure | Example |
| --- | --- | --- |
| **Statement** | Noun. Noun. | *One layer. Every destination.* |
| **Instruction** | Verb. Verb. Verb. | *Wear it. Pack it. Carry it.* |
| **Specification** | Number + unit as the headline | *318 grams. 2.1 litres. One layer.* |
| **Inversion** | Expectation, then correction | *A jacket that carries itself.* |
| **Direction** | The brand idea, stated plainly | *Engineered for the way forward.* |

Supporting line: one sentence, ≤ 20 words, containing at least one fact.

Never: a question as a headline; a headline containing "your"; more than one full stop's worth
of idea per line.

### 21.5 Product messaging

Every product page states, in this order:

1. **Name + subtitle** — the subtitle is the promise in five words or fewer
   (*Meridian Carry Shell / One layer. Every destination.*)
2. **Description** — what it is, factually, in two sentences.
3. **Story** — why it was made this way. First person plural is allowed here and nowhere else.
4. **Features** — six at most, each a three-word title and one factual sentence.
5. **Specifications** — mono, grouped: materials, construction, dimensions, performance, care.
6. **Care** — imperative sentences. *Close all zips before washing.*

Claims discipline: if a specification cannot be tested, it is not a specification. `Wind
resistance: tested to 60 km/h` is a claim. `Incredibly windproof` is not.

### 21.6 About copy

> VAYRO designs equipment for movement between environments — the city, the airport, the
> ridgeline, in that order, in the same week.
>
> We start every piece from the question most outerwear ignores: what does this owe you when
> you are not wearing it? The answer changes the engineering. Hoods become cavities. Webbing
> becomes a strap. A collar inverts. What you carry stops being luggage and starts being
> equipment.
>
> We publish weights, volumes and materials, and we say what a product is not. The Meridian is
> weather resistant. It is not waterproof. We would rather tell you that than sell you one
> jacket.

### 21.7 Packaging copy

| Surface | Copy |
| --- | --- |
| Box lid | *(deboss only — no type)* |
| Box interior | `ENGINEERED FOR THE WAY FORWARD` |
| Hang tag, front | Stacked lockup |
| Hang tag, back | `318 g · 2.1 L PACKED · 20D` / product name / price |
| Neck label | Symbol, wordmark, `ENGINEERED FOR THE WAY FORWARD` |
| Care label | Product name, shell, wash, dry, iron, `NO SOFTENER · NO TUMBLE`, `MADE RESPONSIBLY` |
| Tissue | *(pattern only)* |

### 21.8 Social bio

> Equipment engineered to pack. One layer. Every destination. ↗ vayro.com

Handles: `@vayro`. Voice on social is the same voice — no emoji strings, no hype, no
comment-bait questions. Product posts lead with a fact.

### 21.9 Email tone

- **Subject lines** are factual and lower-drama: *Your order VY-01041* · *The Meridian, in
  Sandstone* · *Shipped — VY-01041*.
- **One idea per email.** The welcome email has one link.
- No countdowns, no "don't miss out", no exclamation marks in the subject line.
- Transactional mail states the fact first and the brand second: the customer opened it to
  learn something.
- Templates live in `src/lib/email.ts` — a hairline-ruled sheet on warm ivory, tables and
  inline styles only, which is the constraint email HTML has always had.

---

## 22. Asset inventory

### `public/brand/` — vector

| File | Artboard | Use |
| --- | --- | --- |
| `vayro-symbol.svg` / `-ivory.svg` | 100 × 100 | The Vector, regular cut |
| `vayro-symbol-micro.svg` / `-ivory.svg` | 100 × 100 | Micro cut, ≤ 22px and all physical production |
| `vayro-wordmark.svg` / `-ivory.svg` | 446 × 100 | Wordmark alone |
| `vayro-lockup-horizontal.svg` / `-ivory.svg` | 612.4 × 120.4 | Default lockup |
| `vayro-lockup-stacked.svg` / `-ivory.svg` | 446 × 385 | Stacked lockup |
| `vayro-app-icon.svg` | 512 × 512 | Ink tile, ivory mark, 22% optical padding |
| `vayro-app-icon-round.svg` | 512 × 512 | Same, 114px corner radius |
| `vayro-monogram-ivory.svg` | 512 × 512 | Inverted tile — ivory field, ink mark |
| `favicon.svg` | 100 × 100 | Ink tile, micro cut |
| `vayro-pattern.svg` | 120 × 120 | One contour tile |

### `public/brand/png/` — raster

Symbol 256/512/1024 (ink + ivory) · wordmark 1024/2048 (ink + ivory) · horizontal lockup
1024/2048 (ink + ivory) · stacked lockup 1024 (ink + ivory) · app icon 180/192/512/1024 ·
round app icon 512 · favicon 16/32/48. Rendered at density 600 so edges stay crisp.

`src/app/icon.png` (512) and `src/app/apple-icon.png` (180) are produced by the same script
and are what Next.js serves as the app icons.

### `public/brand/applications/` — reference renders

Twelve composited mockups: four apparel, one hardware, two labels, five packaging. Listed in
§16 and §17, inventoried with dimensions in `docs/MEDIA.md`.

### Regeneration

```bash
node scripts/build-brand.mjs          # SVGs + src/lib/brand-art.ts
node scripts/build-brand-png.mjs      # PNG raster set + app icons  (needs sharp)
node scripts/build-mockups.mjs        # application mockups         (needs sharp + media)
node scripts/build-identity-sheet.mjs # the review sheet
```

`build-brand.mjs` rewrites `src/lib/brand-art.ts`. That file is generated — never hand-edit
it, and commit it alongside the SVGs so the app builds without running the scripts.

---

## 23. Known divergences

Recorded so nobody "fixes" one half and breaks the other.

1. **Lockup ratio.** `scripts/brand.mjs` draws the exported SVG lockups at `SYM_RATIO = 1.204`
   (§7.1). The generated constant `LOCKUP_SYMBOL_RATIO` in `src/lib/brand-art.ts` is `1.3`, so
   the React `VayroLockup` renders the symbol marginally larger than the placed artwork. For
   anything printed, produced or embedded, **use the SVGs in `public/brand/`**. Aligning the
   two means changing the literal in `scripts/build-brand.mjs` and regenerating.
2. **Optical threshold comment.** The generated doc comment on `SYMBOL_PATH` says "use at
   ≥ 24px" and on `SYMBOL_MICRO_PATH` "≤ 20px". The implemented switch in `VayroMark` is at
   **22px**, which is the documented rule. The comment is stale, not the code.
