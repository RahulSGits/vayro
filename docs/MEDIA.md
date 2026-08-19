# VAYRO — Media Inventory

Every image the site ships, what it is for, and what should replace it.

**None of the plates in `public/media/` are photographs.** They are generated, art-directed
placeholder art — layered ridge silhouettes, woven material macros and studio gradient fields,
built from the brand palette by `scripts/build-media.mjs`. They exist so the site reads as
designed before a shoot happens, and so every layout is tested against real tonal ranges rather
than grey boxes.

They are *not* a substitute for photography. This document is the shot list.

```bash
node scripts/build-media.mjs      # regenerate every plate (needs sharp)
npm run brand                     # brand SVG + PNG + media + application mockups
```

---

## 1. How imagery is used

| Rule | Detail |
| --- | --- |
| Format | `.webp` first, `.jpg` alongside as fallback and for social cards. Both are written for every plate |
| Component | Always `next/image` with an explicit `sizes`; `fill` plus a positioned parent for art-directed crops |
| Priority | `priority` on the LCP plate only — the hero, and the first product row |
| Placeholder | Surface is `--bg-sunken`, so nothing flashes white in dark mode |
| Type over image | Sits on `--scrim`, never directly on detail |
| Alt text | Every plate carries a real `alt` in the catalogue; decorative art is `aria-hidden` |
| Generation | Deterministic — a seeded PRNG per plate, so a rebuild produces identical bytes |

Aspect families in the library: **16:9** landscape editorial, **3:4** portrait editorial,
**1:1** material macro, **18:25** studio product field.

---

## 2. Field plates — landscape (16:9, 2000 × 1125)

Editorial and campaign bands. Layered ridge silhouettes with a graded sky and a soft light
bloom — terrain read as geology, never a postcard mountain.

### `field-ridgeline`

| | |
| --- | --- |
| Size | 2000 × 1125 · webp 182 KB · jpg 139 KB |
| Palette | Slate → ink, sky ink-80 / graphite / stone |
| Used by | `new-arrivals` collection hero · journal `the-second-life-of-a-jacket` · editorial bands |
| **Replace with** | Cool high-altitude ridgeline at blue hour, long lens, compressed layers. A single figure walking away from camera occupying under 8% of the frame. Available light, no fill |

### `field-dusk`

| | |
| --- | --- |
| Size | 2000 × 1125 · webp 80 KB · jpg 88 KB |
| Palette | Olive → ink, sky ink / forest / moss |
| Used by | `limited-drops` collection hero · journal `shoulder-seasons` |
| **Replace with** | Last light on a treeline, deep green tonality, warm horizon and cold foreground. Shot 20 minutes after sunset for the colour separation |

### `field-highpass`

| | |
| --- | --- |
| Size | 2000 × 1125 · webp 225 KB · jpg 174 KB |
| Palette | Titanium → ink-80, sky bone / sand / stone |
| Used by | `field-tested` collection hero · journal `one-bag-eleven-days` |
| **Replace with** | A high pass in flat overcast light — the brand's most "technical" plate. Bright, low-saturation, near-monochrome. Snow or scree, no sun |

### `field-coastal`

| | |
| --- | --- |
| Size | 2000 × 1125 · webp 216 KB · jpg 161 KB |
| Palette | Stone → graphite, sky ivory / bone / titanium |
| Used by | Journal `the-case-against-waterproof` |
| **Replace with** | Coast in weather: wind-driven rain, spray, wet rock. This is the plate that carries the *weather resistant, not waterproof* argument, so the conditions must look genuinely wet |

### `field-transit`

| | |
| --- | --- |
| Size | 2000 × 1125 · webp 154 KB · jpg 126 KB · rendered with a 6px blur |
| Palette | Graphite → ink, sky ink-80 / slate / stone |
| Used by | Transit Fold Pack editorial · Meridian gallery position 5 · transit-themed bands |
| **Replace with** | Movement in a transit environment — train window, terminal corridor, escalator — at a shutter speed that keeps the subject sharp and the surroundings streaked. Motion must come from the camera, not from post |

---

## 3. Field plates — portrait (3:4, 1500 × 2000)

Split layouts and half-page editorial.

### `field-ascent`

| | |
| --- | --- |
| Size | 1500 × 2000 · webp 114 KB · jpg 116 KB |
| Palette | Forest → ink, sky ink-80 / olive / moss |
| Used by | `the-carry-system` collection hero · Meridian gallery position 3 (worn, ridgeline) |
| **Replace with** | Vertical ascent frame with the shell worn and in use. The garment must be legible — this is the closest thing in the library to a hero product-in-context shot |

### `field-treeline`

| | |
| --- | --- |
| Size | 1500 × 2000 · webp 327 KB · jpg 222 KB |
| Palette | Moss → ink-80, sky stone / sand / bone |
| Used by | Ridgeline Grid Mid editorial |
| **Replace with** | Treeline in flat light, mid layer worn without a shell. Vertical composition with headroom for a display headline in the top third |

---

## 4. Material macros (1:1, 1600 × 1600)

Woven structure at high magnification, generated warp-and-weft with a ripstop grid where the
fabric has one. These carry the engineering claim, so their replacements must be honest — the
grid in the photograph has to be the grid in the fabric.

| Plate | Palette | Structure | Used by | Replace with |
| --- | --- | --- | --- | --- |
| `material-ripstop` | Default ink family | Ripstop grid | Meridian gallery position 4 · journal `twenty-denier` · chest-mark mockup | 20D recycled ripstop at ~4× magnification, raking light so the reinforcing grid casts a shadow. The hero material shot |
| `material-twill` | Olive warp, forest weft | Twill diagonal, no grid | Ridgeline Grid Mid detail · back-wordmark mockup | Grid fleece face at magnification — the channels and the pile both readable |
| `material-shell` | Slate warp, graphite weft on ink-80 | Ripstop grid | Transit Fold Pack detail · journal `quiet-hardware` · sleeve-mark mockup | 40D PU-backed pack shell, with a bar-tack or a seam entering the frame for scale |
| `material-liner` | Sand warp, stone weft on bone | Plain weave | Bearing Cap detail | Brushed 15D taffeta liner — the hood cavity fabric. Soft, warm-toned, low contrast |

Sizes: webp 344–482 KB, jpg 258–375 KB. These are the heaviest files in the library because
weave structure is high-frequency detail; the real photography should be delivered at 2048²
and compressed to the same order.

---

## 5. Studio fields (~18:25, 1800 × 2500)

Graduated product grounds — a vertical gradient with a soft floor pool and a vignette. Product
imagery sits on these; today they stand in for the product shot itself.

| Plate | Ground | Used by | Replace with |
| --- | --- | --- | --- |
| `studio-dark` | Ink, cool | Meridian in Basalt (gallery 1) · Transit Fold Pack (gallery 1) · reflective-mark mockup | Meridian, Basalt, three-quarter front on a dark seamless. One large soft key, one rim. Directional shadow — nothing floats |
| `studio-light` | Ivory → bone, warm | Light-theme product surfaces | The same setup inverted on an ivory seamless, for light-theme cards and PDP galleries |
| `studio-forest` | Forest → ink | Meridian in Deep Forest (gallery 2) · Ridgeline Grid Mid (gallery 1) | Deep Forest colourway on a tonal ground — the colourway must separate from the background without a rim light doing all the work |
| `studio-stone` | Sand → stone, warm | Meridian in Sandstone (gallery 6) · Bearing Cap (gallery 1) | Sandstone colourway, warm ground. The lightest garment in the range on the lightest ground: the shot that proves the lighting |

Sizes: webp 27–346 KB, jpg 54–270 KB.

### What is still missing

The studio plates are grounds, not products. A complete PDP needs, per colourway:

1. Front, worn, three-quarter — the hero
2. Back, worn
3. **Packed state** — the jacket as a 2.1 L carry unit, the single most important shot in the
   range, and the one no placeholder can stand in for
4. Mid-fold, showing the hood inverting
5. Two details — hardware and a hem or cuff
6. One on-body in context, from the field set

---

## 6. Brand vector — `public/brand/`

Generated by `node scripts/build-brand.mjs`. These are **build outputs**: change the geometry in
`scripts/{outline,wordmark,brand}.mjs` and regenerate. Never hand-edit an SVG.

| File | Artboard | Use |
| --- | --- | --- |
| `vayro-symbol.svg` | 100 × 100 | The Vector, regular cut, ink |
| `vayro-symbol-ivory.svg` | 100 × 100 | Regular cut, reversed |
| `vayro-symbol-micro.svg` | 100 × 100 | Micro cut, ink — ≤ 22px and all physical production |
| `vayro-symbol-micro-ivory.svg` | 100 × 100 | Micro cut, reversed |
| `vayro-wordmark.svg` | 446 × 100 | Wordmark, ink |
| `vayro-wordmark-ivory.svg` | 446 × 100 | Wordmark, reversed |
| `vayro-lockup-horizontal.svg` | 612.4 × 120.4 | Default lockup, ink |
| `vayro-lockup-horizontal-ivory.svg` | 612.4 × 120.4 | Default lockup, reversed |
| `vayro-lockup-stacked.svg` | 446 × 385 | Stacked lockup, ink |
| `vayro-lockup-stacked-ivory.svg` | 446 × 385 | Stacked lockup, reversed |
| `vayro-app-icon.svg` | 512 × 512 | Ink tile, ivory mark, square |
| `vayro-app-icon-round.svg` | 512 × 512 | Same, 114px corner radius |
| `vayro-monogram-ivory.svg` | 512 × 512 | Inverted tile — ivory field, ink mark |
| `favicon.svg` | 100 × 100 | Ink tile, micro cut |
| `vayro-pattern.svg` | 120 × 120 | One contour-field tile |

## 7. Brand raster — `public/brand/png/`

Generated by `node scripts/build-brand-png.mjs` at density 600.

| Base | Widths |
| --- | --- |
| `vayro-symbol` / `vayro-symbol-ivory` | 256 · 512 · 1024 |
| `vayro-wordmark` / `vayro-wordmark-ivory` | 1024 · 2048 |
| `vayro-lockup-horizontal` / `-ivory` | 1024 · 2048 |
| `vayro-lockup-stacked` / `-ivory` | 1024 |
| `vayro-app-icon` | 180 · 192 · 512 · 1024 |
| `vayro-app-icon-round` | 512 |
| `favicon` | 16 · 32 · 48 |

The same script writes `src/app/icon.png` (512) and `src/app/apple-icon.png` (180), which are
the icons Next.js serves. `vayro-lockup-horizontal-ivory-2048.png` (2048 × 428) is the Open
Graph and Twitter card image declared in `src/lib/seo.ts`.

## 8. Application mockups — `public/brand/applications/`

Composited by `node scripts/build-mockups.mjs`, which places the generated mark over the
material plates in `public/media/` and simulates embroidery, deboss, laser-etch and woven-label
finishes. **These are reference renders, not photographs** — they show intent and specification.
Replace them with production samples shot on the studio setup described in §5.

| File | Size | Shows | Replace with |
| --- | --- | --- | --- |
| `apparel-chest-mark.jpg` | 1600 × 1200 | Embroidered symbol ~34mm, ivory on ripstop, left chest | Macro of the produced embroidery on the finished garment, raking light |
| `apparel-sleeve-mark.jpg` | 1600 × 1200 | Micro cut on shell fabric, sleeve position | Production sleeve mark at true size, showing the micro cut holding its counter |
| `apparel-back-wordmark.jpg` | 1600 × 1200 | Wordmark across the upper back on twill | Worn back view, wordmark at production scale |
| `apparel-reflective-mark.jpg` | 1600 × 1600 | Retroreflective transfer on a dark ground | Flash-lit shot proving retroreflectivity, plus an ambient-light frame |
| `hardware-zipper-pull.jpg` | 1200 × 1200 | Laser mark on anodised alloy | Macro of the produced pull, showing the etch depth and the anodised finish |
| `label-woven-neck.jpg` | 1400 × 900 | Woven neck label: symbol, wordmark, strapline | Photograph of the woven label in the garment |
| `label-care.jpg` | 1000 × 1300 | Care label, mono type, full care sequence | Printed label sample. Copy must match the catalogue's `care` array exactly |
| `packaging-hang-tag.jpg` | 1100 × 1600 | Ivory card, stacked lockup, `318 g · 2.1 L PACKED · 20D`, ₹5,999 | Produced tag on stock, with the punch and the cord |
| `packaging-product-box.jpg` | 1800 × 1200 | Matte ink box, debossed symbol on the lid | Produced box in raking light — the deboss reads by shadow, so the lighting is the shot |
| `packaging-garment-bag.jpg` | 1400 × 1000 | Recycled polybag, bone symbol + wordmark | Production bag with a garment inside |
| `packaging-tissue.jpg` | 1600 × 1100 | Bone tissue, contour field at low contrast | Tissue in an opened box, showing the pattern at real scale |
| `packaging-sticker.jpg` | 900 × 900 | Ink disc, ivory symbol, bone keyline | Printed sticker sheet |

---

## 9. 3D assets — `public/models/`

Empty by design. Until `meridian-shell.glb` exists at that path, the viewer renders a
**procedural shell** built from revolved and swept geometry in
`src/components/three/geometry.ts` — a finished shape, not a placeholder box, and what the site
ships with today.

`public/models/README.md` is the complete authoring specification: scale (1 unit ≈ 62 cm, the
shell 2.1 units tall), orientation (+Y up, facing +Z), the node-name table that drives the
motion system, material naming for the colourway system, the `pack` morph target, the five
hotspot anchors, export and Draco settings, and the pre-commit checklist.

Budget: ≤ 2.5 MB Draco-compressed, textures ≤ 2048² and KTX2/Basis preferred. The procedural
shell ships no textures at all.

---

## 10. Commissioning brief — summary

If you are booking a shoot, this is the short version.

**Direction.** Terrain as geology, not postcard. Available light. Long lens. Human presence is
scale, not subject. No summit heroics, no lens flare, no teal-orange grade. Grain is acceptable
and preferred to plastic smoothness.

**Deliverables, in priority order:**

1. Meridian in the **packed state** — the product's whole argument, currently unshot
2. Meridian worn, all four colourways, front and back, on the studio setup
3. The fold sequence — worn → mid-fold → packed, same framing, for the transformation section
4. Four material macros to replace the generated weaves
5. Field set: ridgeline, high pass, coastal weather, transit, treeline
6. Production samples of every item in §8

**Technical.** Deliver 16-bit master files. Web exports at 2000px on the long edge (landscape),
2000px tall (portrait), 1600² (macro), 2500px tall (studio). WebP quality 82 and mozjpeg quality
84 match the current library. Colour-manage to sRGB; the grade must sit inside the palette in
`VAYRO-BRAND-GUIDELINES.md` §11.

**Replacement is a drop-in.** Keep the filenames. Every reference lives in
`src/data/catalog.ts` and the components read from there, so replacing the bytes replaces the
image everywhere — no code change.
