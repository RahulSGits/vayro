<div align="center">

# VAYRO — 3D Architecture

**The WebGL layer: what draws the Meridian, what decides whether it draws at all,
and what stands in its place when it does not.**

</div>

---

## Contents

1. [The shape of the layer](#1-the-shape-of-the-layer)
2. [Module map](#2-module-map)
3. [Device tiering](#3-device-tiering)
4. [The canvas contract](#4-the-canvas-contract)
5. [Geometry — the procedural shell](#5-geometry--the-procedural-shell)
6. [The dual source: procedural and GLB](#6-the-dual-source-procedural-and-glb)
7. [Materials and the pack shader](#7-materials-and-the-pack-shader)
8. [The lighting rig, camera and controls](#8-the-lighting-rig-camera-and-controls)
9. [The near-black problem and the Titanium hero](#9-the-near-black-problem-and-the-titanium-hero)
10. [The three scenes](#10-the-three-scenes)
11. [The transformation timeline](#11-the-transformation-timeline)
12. [Performance budgets](#12-performance-budgets)
13. [Disposal and leak discipline](#13-disposal-and-leak-discipline)
14. [The fallback chain](#14-the-fallback-chain)
15. [Content Security Policy](#15-content-security-policy)
16. [Authoring and exporting the production GLB](#16-authoring-and-exporting-the-production-glb)
17. [Debugging](#17-debugging)

---

## 1. The shape of the layer

Three concentric rings. Nothing in an outer ring knows anything about the ring inside it,
and nothing in an inner ring is ever loaded until the outer ring says so.

```
┌─ CAPABILITY ────────────────────────────────────────────────┐
│  useDeviceTier()                                            │
│  Answers: is there WebGL, how much of it can this device     │
│  afford, and has the reader asked for stillness?             │
│                                                              │
│  ┌─ BOUNDARY ──────────────────────────────────────────────┐ │
│  │  ProductStage · ProductViewer · TransformationScene      │ │
│  │  Server-safe. Imports NO three.js. Resolves the product, │ │
│  │  renders the 2D plate, and only then reaches for the     │ │
│  │  scene through next/dynamic({ ssr: false }).             │ │
│  │                                                          │ │
│  │  ┌─ SCENE ─────────────────────────────────────────────┐ │ │
│  │  │  SceneCanvas → StudioEnvironment → JacketModel       │ │ │
│  │  │  geometry.ts · materials.ts                          │ │ │
│  │  │  The only place three.js exists.                     │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

The consequence that matters commercially: **a page that shows a product does not pay for
three.js until a device that can use it asks.** `ProductStage.tsx` and `ProductViewer.tsx`
import types from `@/components/three/materials` and nothing else; the actual scene modules
arrive in a separate client chunk, requested after `useDeviceTier()` has reported.

---

## 2. Module map

| File | Lines of responsibility |
| --- | --- |
| `src/hooks/useDeviceTier.ts` | WebGL probe, tier classification, reduced-motion and pointer queries. The one authority on whether WebGL runs |
| `src/components/three/Canvas.tsx` | `SceneCanvas` — the single `<Canvas>` in the codebase. Owns DPR, AA, shadows, frameloop, tone mapping, context-loss recovery. Also exports `InvalidateOnChange` |
| `src/components/three/SceneErrorBoundary.tsx` | Class boundary. Used twice: around the whole canvas, and around the GLB loader |
| `src/components/three/Environment.tsx` | `StudioEnvironment` — the three-light rig plus counter-rim, lightformer box, contact shadows and the drifting-mote shader |
| `src/components/three/lightingPresets.ts` | `studio` / `outdoor` / `night` rigs as data, each with a `light` and a `dark` variant. `getLightingRig(preset, scheme)` |
| `src/components/three/ProductLights.tsx` | The rig addressed by name — `<ProductLights preset="night" />` — plus `useLightingRig()`, which hands the surrounding DOM the same numbers |
| `src/components/three/ProductCamera.tsx` | The orbit rig lifted out of the viewer: named views, `goTo` / `focus` / `zoom` / `reset` through a subscription rather than React state |
| `src/components/three/ProductControls.tsx` | `OrbitControls` with rotate and zoom separated at the source, standing down while a camera transition is in flight |
| `src/components/three/ProductHotspots.tsx` | `HotspotMarker`, the anchor placement, and `useHotspotRenderer()` — the `renderAnchor` bridge into `JacketModel`, so nothing is positioned twice |
| `src/components/three/ProductMaterials.tsx` | Colourway and finish written into the **live** material — a swatch is a uniform upload, never a rebuild. Handles procedural (`userData.materialKey`) and GLB (name regex) alike |
| `src/components/three/optimization.ts` | Compressed delivery (DRACO + KTX2 decoder paths, `registerRenderer`, `configureModelLoader`), `useAdaptiveDpr` / `AdaptiveResolution`, `applyFrustumCulling`, `createLOD` / `lodDistances`, `disposeObject3D` / `useDisposeOnUnmount` |
| `src/components/three/geometry.ts` | Pure geometry builders. Six stages, a motion table, the carry box. No React |
| `src/components/three/materials.ts` | Finishes, colourway resolution, the fold shader, the weave shader, the material factory |
| `src/components/three/JacketModel.tsx` | The model itself. Procedural/GLB selection, the per-frame motion loop, hotspot anchors |
| `src/components/three/index.ts` | Barrel |
| `src/components/product-3d/ProductStage.tsx` | Hero entry point. Server-safe |
| `src/components/product-3d/ProductStageScene.tsx` | The hero scene: auto-orbit, pointer lean, no controls |
| `src/components/product-3d/ProductViewer.tsx` | Interactive-viewer entry point. Server-safe |
| `src/components/product-3d/ProductViewerScene.tsx` | The full viewer: orbit controls, colourway and finish switching, hotspots, explode, fold, fullscreen |
| `src/components/product-3d/ViewerFallback.tsx` | The 2D product view. Not a spinner — the product view for every device that should not run WebGL |
| `src/components/product-3d/product-source.ts` | Client-side product resolution against the seed catalogue (`@/lib/repo/products` is server-only) |
| `src/components/product-transformation/TransformationScene.tsx` | Scroll binding, still-sequence fallback, the standalone track |
| `src/components/product-transformation/TransformationCanvas.tsx` | The scroll-driven camera dolly and turntable |
| `src/components/product-transformation/stages.ts` | `PACK_WINDOW`, the scroll↔pack maps, the six mechanical states, and `createTransformationTimeline()` — the one value both scroll and the control bar write to. No React |
| `src/components/product-transformation/TransformationControls.tsx` | The fold by hand: WEAR / TRANSFORM / PACK / RESET, keyboard stepping, a polite live region |
| `src/components/ar/*` | The AR layer. Reuses `SceneCanvas`, `StudioEnvironment` and `JacketModel` unchanged — see `AR_ARCHITECTURE.md` |
| `src/lib/design-tokens.ts` → `three` | Every budget number in the layer |
| `public/models/README.md` | The asset authoring specification (the normative source; §16 here is the architectural summary) |

---

## 3. Device tiering

`useDeviceTier()` returns `{ tier, webgl, reducedMotion, coarsePointer, settings, pending }`.

### Classification

Inputs, in the order they are consulted:

1. `Save-Data`, or `connection.effectiveType` of `2g` / `slow-2g` → **`low`**, immediately.
2. `navigator.hardwareConcurrency ≤ 4` **or** `deviceMemory ≤ 4` → `low` on a coarse pointer or
   a viewport under 768 px, otherwise `medium`.
3. A coarse pointer or a narrow viewport → **`medium`**.
4. `hardwareConcurrency ≥ 8` **and** `deviceMemory ≥ 8` → **`high`**, otherwise `medium`.

Two overrides sit above all of it: **no WebGL** and **`prefers-reduced-motion: reduce`** each
force `low` outright, before the hardware is consulted at all.

`hardwareConcurrency` defaults to 4 and `deviceMemory` to 4 when absent — Safari reports
neither, so Safari lands on `medium` unless the pointer or the viewport pulls it to `low`.
That is the intended answer: `medium` is the honest default for a device that will not
describe itself.

### What each tier buys

From `three.tiers` in `src/lib/design-tokens.ts`:

| Tier | `dpr` (ceiling) | `shadows` | `env` | `particles` | `aa` | Frameloop | Shadow map | Contact shadow | Env map |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `high` | 2 | ✅ | `studio` | 900 | ✅ | `always` | 2048² | 1024² | 256² |
| `medium` | 1.5 | ✅ | `studio` | 380 | ✅ | `always` | 1024² | 512² | 128² |
| `low` | 1 | ❌ | `none` | 0 | ❌ | `demand` | — | — | — |

The tier's `dpr` is a **ceiling, not a setting**. `AdaptiveResolution` (§12) is mounted on every
tier and only ever spends less than the ceiling — the tier is the guess, the measured frame is
the answer.

Two further things move with the tier, decided outside the token block:

- **Geometry segment budget.** `JacketQuality` (`high` / `medium` / `low`) selects a row of
  `SEG` in `geometry.ts` — lathe segments 96 / 64 / 40, tube 64 / 44 / 28, sphere 40 / 28 / 20,
  bevel 3 / 2 / 1.
- **The weave shader.** Only compiled at `quality === 'high'`. On medium and low the shell
  ships a flat roughness and no extra fragment work.

The hero and the transformation canvas clamp quality to `medium` even on a low-tier device,
because on `low` they do not mount at all — the 2D plate stands. The interactive viewer is the
only surface that will run a `low` quality build, because it is the only surface a reader has
explicitly asked for.

### The `pending` window

`useDeviceTier()` starts as `{ tier: 'low', webgl: false, pending: true }` and re-evaluates in
an effect. Every boundary component checks `pending` first and renders the 2D plate during that
window. **Nothing in the 3D layer may mount before `pending` is false** — that rule exists so
the first paint is never a blank canvas waiting on a capability probe.

The hook also re-evaluates when `prefers-reduced-motion` or `pointer: coarse` changes, so a
reader who turns motion reduction on mid-session drops to the 2D view without a reload.

---

## 4. The canvas contract

`SceneCanvas` is the only `<Canvas>` in the codebase. Every scene goes through it, and it
enforces the rules so that no calling surface has to.

```tsx
<SceneCanvas
  label="Meridian Carry Shell in three dimensions"   // → role="img" + aria-label
  camera={{ position: [1.62, 0.52, 4.6] }}           // fov/near/far come from tokens
  interactive={false}                                // pointer-events: none; the page scrolls
  demand={false}                                     // force the demand frameloop
  fallback={<ViewerFallback … />}                    // no WebGL, or a caught throw
  loading={<BrandedLoader />}                        // sits over the canvas
/>
```

What it fixes, in order:

| Concern | Setting | Why |
| --- | --- | --- |
| Gate | `if (pending \|\| !webgl) return fallback` | Capability decides, not the caller |
| Resolution | `dpr={[three.dpr.min, settings.dpr]}` | A range, so R3F can drop under load |
| Adaptive DPR | `<AdaptiveResolution min={three.dpr.min} max={settings.dpr} />` | Sheds resolution before it sheds frames. Mounted on every tier; the tier only sets the ceiling |
| Compressed textures | `registerRenderer(state.gl)` in `onCreated` | KTX2 must ask *this* renderer which compressed formats the GPU takes |
| Frameloop | `demand` when `demand \|\| tier === 'low'` | A low-tier device draws only on change |
| Camera | `fov 32`, `near 0.1`, `far 120`, `position [0, 0.15, 5.2]` | A long lens. Product photography, not a game camera |
| Colour | `ACESFilmicToneMapping`, exposure `1.02` | Holds the highlight on the anodised hardware |
| Transparency | `setClearAlpha(0)`, `gl.alpha: true` | The page's own surface is the backdrop |
| Buffers | `stencil: false`, `preserveDrawingBuffer: false` | Nothing needs them; both cost memory |
| Power | `powerPreference: 'high-performance'` | Asks for the discrete GPU where there is one |
| Resize | `{ scroll: false, debounce: { scroll: 50, resize: 120 } }` | A scroll must never trigger a resize pass |

### Context loss

A lost WebGL context is a black rectangle unless someone handles it. `SceneCanvas` attaches
`webglcontextlost` / `webglcontextrestored` on `onCreated`, **prevents the default on loss**
(without which the browser will not attempt a restore), and paints a `Restore view` control
over the frame. The control bumps a `generation` key, which remounts the `<Canvas>` outright —
a clean rebuild is more reliable than salvaging a half-restored context.

### Error containment

`SceneErrorBoundary` wraps the canvas. Anything that throws below it — a driver fault, a
malformed GLB, a decoder that never arrived — is replaced by the caller's `fallback`, which
in practice is always the designed 2D view. A WebGL failure has never been allowed to take a
page down.

### `InvalidateOnChange`

On the demand frameloop React state alone does not draw a frame. Any scene driven by React
state mounts `<InvalidateOnChange values={[…]} />` inside the canvas; the viewer passes
`[colorway, finish, pack, exploded, transforming, details, autoRotate]`.

---

## 5. Geometry — the procedural shell

`geometry.ts` is pure: no React, no side effects, no `Math.random()`. It exports builders that
return `JacketPart[]`, and the builders are grouped into six `JACKET_STAGES`.

### Model space

| Property | Value |
| --- | --- |
| Units | See the note below — there are two conventions in the repository and only one of them is derivable |
| Up | +Y |
| Facing | +Z — the front placket faces the camera at rest |
| Origin | Mid-chest, on the vertical centreline |
| Shoulders | y ≈ 0.73 |
| Hood crown | y ≈ 1.30 |
| Hem | y ≈ −0.81 |
| Half width | x ≈ ±0.45 at the chest, ±0.56 at the cuffs |
| Depth squash | `DEPTH = 0.6` — every revolved body part is scaled on Z into an ellipse |

> **The two scale conventions, and which one is authoritative.**
>
> `public/models/README.md` states the authoring convention as **1 unit ≈ 62 cm**, which puts
> the shell's 2.11-unit span (crown `+1.30` to hem `−0.81`) at about 1.3 m.
>
> `src/components/ar/ar-scale.ts` derives a different number, and derives it rather than
> declaring it: `CARRY_BOX.half` is `[0.30, 0.20, 0.1125]`, and the catalogue publishes the
> packed size as 24 × 16 × 9 cm. That is `0.24 / 0.60`, `0.16 / 0.40` and `0.09 / 0.225` — three
> axes agreeing on **0.40 m per unit**, at which the shell stands 0.84 m crown to hem. A jacket
> on a hanger.
>
> The two cannot both be true, and only the second one is checkable: it falls out of a constant
> the fold shader already uses and a figure the specification table already prints. **Treat
> 0.40 m/unit as authoritative for anything measured** — AR placement above all — and read the
> README's 62 cm as a loose authoring note rather than a contract. The discrepancy has no effect
> on the storefront today, because nothing but the AR layer converts model units to metres; it
> matters the moment a real GLB is authored, and the model author should be handed the 0.40
> figure. See `AR_ARCHITECTURE.md` §5.
>
> Either way, the same rule holds: anything that needs a real-world measurement — size guidance,
> shipping dimensions, the spec table — reads the catalogue's `specs`, never the model.

### The torso profile

A twenty-station `[radius, y]` table, revolved with `LatheGeometry` and squashed on Z.
`radiusAtY()` interpolates it, which is what lets everything else — the placket, the pockets,
the welts, the hem band, the chest label — be built *as a slice of the same silhouette*
rather than as a separate shape floating near it. `profileSlice(yTop, yBottom, steps, inflate)`
returns that slice inflated by a hairline, so a placket sits 12 mm proud of the body it was
cut from and can never intersect it.

`surfaceAngle(phi, r)` returns the outward normal angle of the squashed body at a given lathe
angle, which is how the zip pull and the woven chest label land flat on a curved, non-circular
surface.

### Sleeves

`TubeGeometry` is a constant radius; a sleeve is not. `taperedTube()` sweeps a circular section
along a `CatmullRomCurve3` and then pushes each ring's vertices out from its station centre by
`sleeveRadius(t)` — 0.204 at the shoulder falling to 0.096 at the cuff, with a 4.5% sinusoidal
swell through the middle so the bicep is not a cone. Armholes and cuffs are built from
`subCurve()` slices of the *same* centreline, so they cannot drift out of alignment.

### The six stages

| # | Stage | Parts |
| --- | --- | --- |
| 1 | Shell body | `shell_body` `shell_yoke_seam` `shell_collar` |
| 2 | Sleeves | `shell_sleeve_r/l` `shell_armhole_r/l` `shell_cuff_r/l` |
| 3 | Hood | `shell_hood` `hood_lining` `hood_rim` |
| 4 | Closure | `shell_placket` `hardware_zip` `hardware_zip_pull` `detail_chest_label` |
| 5 | Pockets and hem | `shell_pocket_r/l` `detail_welt_r/l` `shell_hem` `hardware_cord_r/l` |
| 6 | Carry system | `carry_strap` `carry_buckle` `carry_zip` `carry_tag` |

`useStagedParts()` builds **one stage per animation frame**. Two things fall out of that: the
loader reports real progress (`stage / 6`, not a timer), and no single frame stalls long enough
to drop the page's own animation while the shell is being constructed.

### The motion table

Every part carries its own choreography as data:

| Field | Meaning |
| --- | --- |
| `explode` | Offset applied at `explode = 1` |
| `packPosition` / `packRotation` / `packScale` | Transform blended in as `packProgress → 1` |
| `appear: [from, to]` | Fades in across this pack window — the carry hardware |
| `vanish: [from, to]` | Fades out across this pack window — the worn-state hardware |
| `noClamp` | Excluded from the rounded-box collapse |

`jacketPartMotion()` builds the whole table at `low` quality, strips the geometry (disposing it
immediately) and returns the motion keyed by node name. **This is the bridge to the GLB.** A
real export named against the same nodes inherits the entire choreography without a second
animation system existing anywhere.

---

## 6. The dual source: procedural and GLB

`public/models/` ships empty. It is not a missing asset — it is a designed state.

### The probe

`loadJacketGLB(url = '/models/meridian-shell.glb')` issues a single `HEAD` request on first
mount and caches the promise for the session.

| Response | Verdict |
| --- | --- |
| `200`, `content-type` not `text/html`, `content-length` `0` or `> 1024` | Real model → `useGLTF.preload(url, '/draco/')` fires immediately |
| `404`, or HTML with a `200` (some dev servers do this), or under 1 KB | Not a model |
| Network failure | Not a model |

A hit warms the GLTF **and** Draco caches at probe time, so the swap from procedural to scanned
geometry costs one round trip, not two.

### The swap

```tsx
{glbAvailable ? (
  <SceneErrorBoundary fallback={<ProceduralShell {...shellProps} />}>
    <Suspense fallback={<ProceduralShell {...shellProps} />}>
      <GLBShell {...shellProps} url={url} />
    </Suspense>
  </SceneErrorBoundary>
) : (
  <ProceduralShell {...shellProps} />
)}
```

Three ways to end up on the procedural shell: the probe missed, the load suspended (procedural
renders while it streams), or the load threw. There is no flag, no environment variable and no
deploy coupling — **dropping the file into `public/models/` is the entire adoption step.**

To force the procedural shell for a side-by-side comparison, pass `modelUrl={null}` to
`<JacketModel />`; the probe is skipped entirely.

### Which source actually won — `onLoad`

```ts
onLoad?: (info: { source: 'glb' | 'procedural'; ms: number }) => void;
```

Fires once per source, when that source is genuinely on screen, with the time from mount. **The
model is the only place that honestly knows which of the two won** — a caller sees one component
either way, and `glbAvailable` flipping true is not the same event as the GLB having rendered.

Where the GLB takes over from the procedural fallback, **both are reported, in that order**,
because both were genuinely built and shown. Consumers should treat the events as a sequence,
not as one answer: a `procedural` followed by a `glb` is a successful swap, and a `procedural`
alone is either a miss or a failure.

This is what the `model_load { productId, source, ms }` analytics event is made of. It is the
number that tells you whether the asset investment paid for itself — a GLB that is slower to
first paint than the procedural shell it replaced is a regression however good it looks.

### What `GLBShell` does on arrival

1. `SkeletonUtils.clone(gltf.scene)` — so two viewers can hold two colourways of one cached asset.
2. Clones every material (the GLTF cache owns the originals; the clones are ours to dispose).
3. Any material or mesh whose name matches `/shell|body|sleeve|hood|placket|pocket/i` is
   treated as **shell**: its base colour is replaced with the resolved colourway and its
   roughness/metalness with the selected finish. Everything else keeps what it was authored with.
4. `attachPackShader()` is injected into each material, with the weave enabled only for shell
   materials at `high`.
5. If a mesh carries a morph target named `pack`, the shader fold is switched **off** for that
   material (`setPackWeight(material, 0)`) and the authored morph drives instead.
6. Every node whose name appears in `jacketPartMotion()` — or which carries a `pack` morph — is
   registered as a `PartNode` with its authored transform captured as the rest pose.

---

## 7. Materials and the pack shader

The shell is `MeshPhysicalMaterial` (it needs sheen and clearcoat); hardware, lining and
webbing sit on the same class through the factory. Two pieces of shader work are injected on
top, via `onBeforeCompile`.

### Finishes

Roughness and metalness always resolve from `three.material` in the design tokens
(`shellRoughness 0.62`, `shellMetalness 0.04`, `hardwareRoughness 0.28`, `hardwareMetalness 0.92`).
A finish is an **offset from those numbers**, never a fresh invention:

| Key | Spec shown to the reader | Roughness | Clearcoat | Sheen | Weave |
| --- | --- | --- | --- | --- | --- |
| `ripstop` | 20D recycled nylon, 42 gsm | `0.62` | 0 | 0.34 | 1.0 @ 46 |
| `twill` | Tight weave, matte hand | `+0.16` | 0 | 0.50 | 0.55 @ 88 |
| `coated` | PU face film, wind sealed | `−0.30` | 0.55 | 0.18 | 0.30 @ 46 |
| `softshell` | Brushed back, air permeable | `+0.26` | 0 | 0.66 | 0.24 @ 130 |

`resolveColorway()` accepts either a hex string or a catalogue colourway name and always
returns a hex, resolving names through `COLORWAY_HEX` (Basalt, Deep Forest, Sandstone,
Titanium, Olive, Bone) against the brand palette.

The factory also branches on shell lightness: below `HSL.l < 0.34` the piece is treated as a
dark shell, and the sheen colour, lining, hardware tint and webbing tone all shift accordingly.
A Sandstone jacket does not get the hardware a Basalt jacket gets.

### 1. The collapse (`uPack`)

The 2.1 L carry unit is a rounded box. `vayroFold()` is a signed-distance clamp:

```glsl
vec3 vayroFold( vec3 rootPos ) {
  vec3 lim = max( uPackHalf - vec3( uPackRadius ), vec3( 0.0 ) );
  vec3 q   = clamp( rootPos, uPackCenter - lim, uPackCenter + lim );
  vec3 d   = rootPos - q;
  float dl = length( d );
  return dl > 1e-5 ? q + d * ( min( dl, uPackRadius ) / dl ) : rootPos;
}
```

Three details make it convincing rather than a squash:

- **It runs in the model root's space.** `uToRoot` / `uFromRoot` are pushed per material every
  frame by `syncPackMatrices()`, so a sleeve that is *simultaneously rotating inward* while it
  packs still lands inside the same box as the torso. Without that, each part would fold into
  a box in its own local space and the result would be four small boxes, not one.
- **Normals are re-derived.** `PACK_NORMAL` blends the object normal toward the box-face normal
  by `pack * 0.85`, so the packed unit shades like a slab and not like a crumpled jacket.
- **Parts can opt out.** `uPackWeight = 0` excludes hardware that rides *on top* of the fold
  (the zip pull, the cord tips, the carry strap and buckle) — those are animated by the motion
  table's `appear` / `vanish` windows instead.

`syncPackMatrices()` is only called when `eased > 0.0002 || burst > 0.0002`, so a static hero
at `packProgress = 0` pays nothing for the fold machinery.

The carry box: `center [0,0,0]`, `half [0.30, 0.20, 0.1125]`, `radius 0.05`. That preserves the
catalogue's published 24 × 16 × 9 cm ratio exactly (1.5 : 1 and 2.667 : 1 both hold); the
absolute size is drawn for the camera, as with the shell.

### 2. The weave

Ripstop is a grid, and a grid is a roughness pattern. `WEAVE_BODY` modulates
`roughnessFactor` from the UVs with a coarse grid plus a fine 25-cycle beat — no texture is
shipped at all. It is injected after `#include <roughnessmap_fragment>`, requires `USE_UV`
(set as a define), and is compiled only when `quality === 'high'` **and** the material key is
`shell` or `shellDeep`.

### Program cache

`material.customProgramCacheKey = () => 'vayro-shell-weave' | 'vayro-shell-plain'`. Without it
three.js would treat every injected material as a distinct program and recompile per part.
With it there are two programs for the whole scene.

### Injection points

| Shader | Chunk | Insert |
| --- | --- | --- |
| Vertex | `#include <common>` | `PACK_DECL` — uniforms + `vayroFold()` |
| Vertex | `#include <morphnormal_vertex>` | `PACK_NORMAL` — after morphs, so an authored `pack` morph composes correctly |
| Vertex | `#include <project_vertex>` | `PACK_POSITION` — *before* projection |
| Fragment | `#include <common>` | `WEAVE_DECL` |
| Fragment | `#include <roughnessmap_fragment>` | `WEAVE_BODY` |

These are the chunk names for the three.js version pinned in `package.json` (`^0.185.1`).
A three.js major upgrade must re-verify all five: a renamed chunk fails silently — the
`.replace()` simply does nothing and the shell stops folding with no error anywhere.

### Colourway and finish changes are in-place

`factory.update({ colorway, finish })` repaints every created material and rewrites the weave
uniforms. **No rebuild, no reload, no recompile** — switching a swatch in the viewer costs one
frame. That is deliberate: `createJacketMaterialFactory` is memoised on `[quality, packUniforms]`
only, with an explicit lint suppression, because putting colour in the dependency list would
throw the materials away on every click.

---

## 8. The lighting rig, camera and controls

`StudioEnvironment` builds the room in engine. **No HDRI is ever fetched** — the environment is
rendered once from brand-coloured emitters, so the scene is self-contained, matches ink / ivory
/ forest exactly, and adds no network request to the critical path.

### The rig

| Light | Position | Job |
| --- | --- | --- |
| Hemisphere | — | Ambient floor. `sky` over `ground`, intensity 0.66 (dark) / 0.78 (light) |
| **Key** | `[3.4, 4.6, 3.2]` | High and camera-right. Draws the silhouette. The only caster |
| **Fill** | `[-4.2, 1.3, 2.4]` | Low and opposite. Lifts the shadow side without flattening |
| **Rim** | `[-1.4, 2.6, -4.6]` | Behind and above. Separates the shell from the ground |
| **Counter-rim** | `[3.6, 2.1, -4.2]` | Behind and camera-right. Catches the opposite shoulder |

The counter-rim is not decoration. **Two lit edges read as a garment; one reads as a flat
cut-out.** It is the cheapest possible fix for the silhouette problem described in §9.

Above that sits a `<Environment>` block of four `Lightformer`s (a ceiling rect, two side rects
and a front ring) inside a 14-unit `BackSide` sphere tinted to the ground colour. It renders at
`frames={1}` — computed once, never again — at 256² on `high` and 128² elsewhere. Its whole job
is to give the anodised hardware something specific to reflect; `envMapIntensity` is boosted
1.35× on the `hardware` material key.

`ContactShadows` grounds the piece: scale 6, blur 2.6, `frames={Infinity}` so it tracks the
fold in real time.

### Two rigs, not one brightness slider

| | Dark | Light |
| --- | --- | --- |
| Key | Ivory @ **4.70** | White @ **2.35** |
| Fill | Stone @ 1.20 | Bone @ 0.90 |
| Rim | Bone @ **3.40** | Sand @ **0.85** |
| Counter-rim | Titanium @ **1.90** | Stone @ **0.35** |
| Ambient | 0.66 | 0.78 |
| Contact shadow | Black @ 0.62 | Ink @ 0.40 |
| Motes | Bone @ 0.34, additive | Slate @ 0.20, normal |

The rim runs **four times hotter** in dark than in light, and the counter-rim more than five
times. That asymmetry is the whole point: in light mode there is plenty of tonal gap between
product and page, so the key can do the work and a hot rim would just look like a lens flare.
In dark mode there is almost no tonal gap, and the edges are all the separation there is.

### `scheme` — pinning the rig

`StudioEnvironment` follows the site theme by default. `scheme?: 'light' | 'dark'` overrides it.

**The homepage hero passes `scheme="dark"`.** The hero section pins its own tokens
(`--bg: var(--ink)`, `--fg: var(--ivory)`, `colorScheme: dark`) in *both* site themes, because
the `Header` renders ivory chrome over it in both. If the lighting rig followed the site theme
instead of the plate, a reader in light mode would get the light rig — key at 2.35, rim at
0.85 — lighting a product that is standing on ink. The shell would go flat and dark against a
near-black backdrop, which is precisely the failure §9 exists to prevent.

The rule generalises: **any section that pins its own colour scheme must pin the rig to match
the plate the product actually stands on, not the surrounding page.**

### Drifting motes

Dust in a light beam, not a particle demo. A `shaderMaterial` on a `points` cloud, sized in
clip space by `1 / max(-mv.z, 0.4)` so distance reads correctly, faded out at the extremes of
the field, and additively blended in dark only. The field is seeded by a **deterministic LCG**
(`s = (s * 1664525 + 1013904223) >>> 0`) rather than `Math.random()`, so it is identical across
mounts and across server and client. Count comes from `settings.particles`, so `low` skips it
entirely and never allocates the buffers.

### Presets — the rig addressed by name

`lightingPresets.ts` and `ProductLights.tsx` express the rig as a vocabulary rather than a set
of intensities. **`studio` is the values above, unchanged** — the file was added without moving
anything already on screen — and it is the default everywhere.

| Preset | Label | Character |
| --- | --- | --- |
| `studio` | Studio | Clean product photography. A large soft key overhead, a broad bounce opposite, enough edge to hold the shell off the backdrop |
| `outdoor` | Daylight | One dominant warm source, a wide sky bounce instead of a second lamp, warmth returned into the underside of the hem. Shorter, lighter shadows — daylight is bright everywhere, not just where the key points |
| `night` | Night | Cinematic low-key. Ambient drops away (0.34 vs 0.66), the key narrows, and almost all of the read comes from the two back edges. Rim at 4.30, contact shadow at 0.80, ink-tinted environment so reflections stay cold |

Every preset carries a full `light` and `dark` variant, for the reason in §8: the rig answers to
the plate the product stands on, not to a brightness slider. `getLightingRig(preset, scheme)`
resolves the pair and falls back to `studio` on an unknown name.

`useLightingRig(preset, scheme?)` returns the same rig **outside** the canvas — it touches no
three.js state, only the theme — so a scrim, a caption or a swatch row in the surrounding DOM
can be tinted to match the room the product is standing in.

```tsx
<ProductLights preset="night" fog />
```

### Camera and controls, addressed by name

`ProductCamera.tsx` lifts the viewer's orbit maths out of `ProductViewerScene` so any scene can
use it, with the feel unchanged — same exponential damping, same polar clamp from `three.orbit`.

```ts
const camera = useProductCamera();
camera.goTo('back');               // named view, smooth dolly
camera.focus([0, 1.15, 0.18]);     // swing round to a hotspot anchor
camera.zoom(0.82);
camera.reset();
```

Named views (`front` `back` `left` `right` `detail`) follow the existing convention: front is
θ = 0, the shell's right shoulder is +π/2, back is π. `CAMERA_RANGE` (2.6 – 7.4) and
`CAMERA_TARGET` (`[0, 0.04, 0]`) are exported so `ProductControls` can be clamped to exactly
the same limits.

Two properties are worth stating because they are the reason the module exists:

- **Commands travel through a subscription, not React state.** A control bar can drive the
  camera without re-rendering the scene.
- **It cooperates with `OrbitControls` rather than fighting it.** The orbit centre is read from
  `makeDefault` controls when present, and the position is written at default frame priority —
  after drei has run `controls.update()` at priority −1 — so a dolly in flight wins and the
  controls resynchronise from the camera on the next tick.

`ProductControls.tsx` is the same `OrbitControls` configuration the viewer already ships, plus
two things it did not have: it reports **what kind** of interaction happened (wheel and
two-finger touch are zoom, anything else that starts a drag is rotate — `OrbitControls` fires
one undifferentiated change event, and the analytics mapping in §10 was previously inferring
the difference from the DOM), and it pauses auto-rotate while a `ProductCameraController`
transition is in flight instead of dragging against it.

---

## 9. The near-black problem and the Titanium hero

This is the single most consequential visual decision in the 3D layer, and it is worth stating
plainly because it looks like a mistake until you know why.

### The problem

| Surface | Hex |
| --- | --- |
| Hero plate / dark theme background | `--ink` `#0B0C0B` |
| Basalt, the hero colourway of the Meridian | `#1A1C1A` |

Those two colours are separated by fifteen points out of 255 on each channel. Rendered, lit,
tone-mapped and scrimmed, **the jacket disappears.** Not "reads as moody" — disappears. And no
lighting rig recovers it: pushing the key hard enough to separate the faces blows out the ivory
type sitting over the same plate, and the scrim that keeps that type legible is precisely what
crushes the shell back into the ground.

Two independent fixes were needed, in two different files.

### Fix 1 — the rig separates by edges (`Environment.tsx`)

Faces cannot carry the separation, so edges do. In the dark rig the rim is a **bright warm bone**
running at 3.40 rather than a dark moss at 0.85, and a fourth light — the counter-rim — picks up
the opposite shoulder at 1.90. Two hot edges give the eye a closed silhouette even when the
faces are within a few percent of the backdrop. The source comment on `LIGHTING_PRESETS.studio.dark`
is blunt about
it: without this the jacket is genuinely invisible on the hero.

### Fix 2 — the hero renders Titanium (`Hero.tsx`)

Even with the edge rig, Basalt on ink is asking the reader to find a product in the dark in the
first ten seconds of the site. So the hero pins `heroColorway = 'Titanium'` (`#8C9195`) — the
one colourway in the palette that holds its silhouette on ink without leaving the palette.

This is **art direction, not a default.** The swatch row in `HeroOverlay` still offers the full
range, the product page defaults to the catalogue's own first colourway, and nothing downstream
is changed. Only the hero plate is pinned.

### The related trap: `color-mix` in `oklab`

The hero's scrims use `color-mix(in srgb, var(--ink) X%, transparent)`, and there is a comment
in `Hero.tsx` explaining why in capital letters. `transparent` resolves to `rgb(0 0 0 / 0)`, so
an **oklab** mix interpolates the *colour* channels toward black as well as the alpha —
intermediate stops come out far darker than the percentage implies and the gradient reads as
near-opaque. That erased the hero product completely, once. In sRGB the mix yields the plain
`rgba(ink, X)` the numbers imply.

**Never write `color-mix(in oklab, X, transparent)` anywhere in this codebase.** It is a
project-wide rule (`AGENTS.md`), and the hero is where it was learned.

### The rule for any new dark-plate scene

1. Pin the rig with `scheme` to match the plate, not the page.
2. Keep the rim and counter-rim hot; they are the silhouette.
3. Do not put a near-black colourway on a near-black plate. Check the luminance gap before the
   art direction, not after.
4. Scrims mix `in srgb`. Always.

---

## 10. The three scenes

### Hero — `ProductStageScene`

Auto-orbit at `three.orbit.speed = 0.16` rad/s: **one revolution every 39 seconds**, deliberately
slower than anything that reads as a product demo. Pointer movement leans the shell (`±0.24` rad
on Y, `±0.07` on X, critically damped at `1 - e^(-dt·3.2)`), and a 0.32 Hz sine gives 2 cm of
vertical breath.

`interactive={false}` — the canvas takes no pointer events at all, so the page scrolls normally
over it. No `OrbitControls`, no scroll capture, no zoom.

The shell stands right of centre (`offsetX` 0.62 at ≥1280 px, 0.34 at ≥900 px, 0 below) because
the editorial copy owns the left column. Camera `[0, 0.12, 5.4]`, environment with `fog` and
particles, and `scheme="dark"` (§9).

`ProductStage` crossfades: the `ViewerFallback` plate renders first and **stays mounted
underneath**, the canvas fades in over it once `onReady` fires. The frame is never empty, and
a failure at any point leaves a finished-looking page rather than a hole.

### Interactive viewer — `ProductViewerScene`

The full surface. `OrbitControls` with `makeDefault`, panning disabled, damping `0.07`, distance
clamped `2.6 – 7.4`, polar clamped `0.78 – 1.92` rad (≈ 45° – 110°, so the reader cannot get
under the hem or look straight down the hood), and a slower `rotateSpeed` on a coarse pointer
(0.62 vs 0.85).

The control bar drives the camera through an **imperative command bridge** rather than a ref
maze: `send({ kind: 'view' | 'nudge' | 'zoom' | 'reset', … })` sets a `{ …payload, id }` object;
`ViewerRig` reads it, converts the current camera to spherical coordinates, sets a goal, and
critically-damps toward it at `1 - e^(-dt·6.5)` — with `shortestAngle()` so a jump from `Back`
to `Front` turns the short way round. Auto-rotate is suspended while a goal is active, and a
user drag (`onStart`) cancels the goal immediately.

Controls: rotate ± · zoom ± · Auto · Details · Fullscreen · Front / Side / Back / Reset ·
colourway swatches · four fabric finishes · Exploded · Transform (with a 0–100 fold slider).

Keyboard, on the `role="application"` stage: `←` `→` nudge 0.26 rad, `+` `−` zoom by 0.82 / 1.22,
`R` resets, `Escape` closes a detail card or leaves the CSS fullscreen. The bindings are
described to screen readers in a visually hidden `#viewer-help` paragraph.

Fullscreen tries `element.requestFullscreen({ navigationUI: 'hide' })` and falls back to a
fixed-position CSS expansion when it throws — iOS Safari refuses the API on non-video elements.
Body scroll is locked while expanded. `Permissions-Policy: fullscreen=(self)` in
`next.config.ts` is what permits the native path.

Hotspots ride the model. `JacketModel` renders a named `Object3D` per catalogue hotspot at
`hotspots[].anchor3d`, and the viewer's `renderAnchor` puts a drei `<Html>` marker inside it —
so the annotation tracks the seam as the shell turns, instead of floating over a screenshot.
The anchor group hides itself below `packProgress 0.08`; annotations on a folding jacket are
noise.

The loader is a real number. `progress = assets.active ? assets.progress / 100 : buildProgress`
— drei's `useProgress` while a GLB streams, the staged-build fraction otherwise. Never a timer.

### Analytics — two layers, deliberately

The taxonomy in `@/lib/analytics` is a **closed union**; adding an event means adding it to the
type. The 3D layer emits at two grains and keeps both:

| Grain | Events | Why |
| --- | --- | --- |
| Coarse funnel | `3d_view_started` · `3d_interaction { rotate \| zoom \| hotspot \| variant \| reset \| fullscreen }` | One name, six actions, easy to count across the whole site |
| Granular | `model_load { source, ms }` · `3d_rotate` · `3d_zoom` · `3d_hotspot` · `transformation_started` · `transformation_completed` | Emitted **at the source, where the distinction is known rather than inferred** — a rotate is a drag or an arrow key, a zoom is a wheel or a second finger |

Keep both. The funnel reads one, the 3D work reads the other, and neither has to be
reconstructed from the other's shape. `OrbitControls` fires one undifferentiated change event,
which is precisely why the granular pair exists: `ProductControls` separates rotate from zoom at
the source rather than guessing from the DOM afterwards.

The mapping from viewer controls onto the six coarse actions is: `rotate` for drag, arrow keys,
the fixed views and AUTO · `zoom` for wheel, pinch and the zoom buttons · `hotspot` for a marker
or DETAILS · `variant` for colourway, finish, EXPLODE and TRANSFORM (what is being shown) ·
`reset` for RESET · `fullscreen` for FULLSCREEN. Throttled to one event per action per 900 ms,
so a drag does not emit a hundred events.

`transformation_started` and `transformation_completed` are a deliberate pair: **the drop-off
between them is the metric.** How many readers begin the fold, and how many reach the carry
unit.

### Transformation — `TransformationCanvas`

See §11.

---

## 11. The transformation timeline

WEAR → PACK → CARRY, driven by scroll, drawn on one number.

### Two clocks, one value

The canvas is driven by **scroll** progress. The fold is driven by **pack** progress, which is
scroll remapped through a window. `stages.ts` owns that window and is its single definition:

```ts
export const PACK_WINDOW = { start: 0.16, end: 0.82 } as const;

export function packFromScrollProgress(scroll: number) {
  return clamp(mapRange(scroll, PACK_WINDOW.start, PACK_WINDOW.end, 0, 1), 0, 1);
}
export function scrollFromPackProgress(pack: number) { … }   // and back again
```

The first 16% of the track holds on WEAR and the last 18% holds on CARRY. The fold happens in
the two-thirds between. Holds at both ends are what make the sequence read as three states
rather than one continuous squeeze.

`TransformationCanvas` re-exports the forward map as `packFromScroll` so existing callers are
unchanged; **the definition lives in `stages.ts` and nowhere else.**

The inverse is not simply the forward map run backwards. `scrollFromPackProgress` is exact
inside the window, but pack 0 opens out to scroll 0 and pack 1 to scroll 1 — a fully packed
shell should be framed by the *last* camera station, not by the station the window happens to
stop at.

### Six mechanical states, and four editorial ones

Two different lists exist on purpose, and conflating them is the mistake to avoid.

| List | Where | What it is for |
| --- | --- | --- |
| `TRANSFORMATION_STAGES` — WEAR · FOLD · PACK · CARRY | `TransformationScene.tsx` | **Editorial.** The caption track and the still-sequence fallback. Four moments with images and specs |
| `TRANSFORMATION_STATES` — `worn` · `hood-open` · `folding` · `compressing` · `carry-form` · `packed` | `stages.ts` | **Mechanical.** The six states the shell actually passes through, each owning a slice of pack progress |

```
pack 0 ─────────────────────────────────────────────────────── 1
       │ worn │ hood-open │ folding │ compressing │ carry │ packed
```

Each mechanical state carries its `range` and settle `pack` in pack space — what the brief and
the shader speak — **and** a `scroll` value, which is what you hand the canvas to put the camera
where that state reads best. It also carries a `description`: a full sentence, read aloud when
the state is reached, and the only place those strings are used.

### `createTransformationTimeline()` — one value, two inputs

Scroll is the primary way through the fold. `TransformationControls` is the other way — for a
reader who wants to go straight to the carry unit, for a keyboard, and for anyone who cannot
produce a controlled scroll at all. **It is not a second implementation of the fold.** Both
write to the same timeline object:

```ts
timeline.progress()                  // read every frame; never causes a render
timeline.pack()  ·  timeline.stage()  ·  timeline.snapshot()
timeline.setFromScroll(value)        // the ScrollTrigger reports here
timeline.goTo('packed')  ·  play()  ·  stop()  ·  reset()  ·  release()
timeline.subscribe(listener)         // fires on state change, not per frame
```

Three properties make the two inputs coexist rather than fight:

- **It drives itself.** `goTo` and `play` start their own rAF loop and run until the value
  arrives, so neither caller owns a frame loop. The canvas keeps reading `progress()` and never
  learns which input moved it.
- **Scroll takes control back by meaning it.** While the control bar holds the value,
  `setFromScroll` is ignored — until the page has moved more than `SCROLL_RECLAIM` (0.02) from
  where scroll stood when the bar engaged. The buttons never lock the page out of its own
  section, and a stray pixel of scroll never yanks the value away mid-transition.
- **Listeners hear about states, not frames.** The value changes sixty times a second;
  `commit()` emits only when the named state index, `manual` or `playing` actually changes. This
  is the same discipline the scroll path was written around, extended to the buttons.

`RESET` is deliberately not "show me the worn shell" — that is `WEAR`. It walks the shell to
wherever the page has actually scrolled to and then `release()`s, so the next flick of the wheel
continues rather than snaps.

The controls are four real buttons (tab and enter work with nothing added), left/right arrows
step one state at a time, home and end jump to the ends, and the current state is announced
through a polite live region as a sentence. `prefers-reduced-motion` sets `immediate: true` on
every drive, so a named state is reached without the transit.

### The binding

`TransformationScene` registers a GSAP `ScrollTrigger` with `scrub: 0.55` and
`invalidateOnRefresh: true`. It **finds whoever owns the pin** rather than assuming: it walks
up from its own element looking for an ancestor with `position: sticky`, and binds to that
element's parent as the trigger (`top top` → `bottom bottom`). Failing that it binds to itself
(`top bottom` → `bottom top`). The homepage pins it; `TransformationTrack` is the standalone
version that builds its own ~300 svh track with a sticky stage and the WEAR / PACK / CARRY
captions.

**Nothing scroll-jacks.** The page scrolls at its own speed and the fold is *read off* the
position. Everything is torn down through `gsap.context().revert()`.

### Zero renders while scrolling

The progress value reaches the canvas as a **getter**, not a prop:

```tsx
<Canvas getProgress={getProgress} … />
//   → <JacketModel getPackProgress={() => packFromScroll(getProgress())} />
```

GSAP writes `progressRef.current` on its own ticker; `useFrame` reads it. A scroll tick never
causes a React render anywhere in the tree. Stage captions *do* use React state, but only the
integer stage index (0–3), so at most four renders across the whole sequence.

### Camera and turntable

Four stations on a `CatmullRomCurve3` — standing, circling, descending, close on the carry unit:

```
[1.05, 0.50, 5.15] → [2.35, 0.95, 4.00] → [1.75, 0.34, 2.95] → [0.42, 0.02, 2.45]
```

The camera lerps toward `curve.getPointAt(progress)` at `1 - e^(-dt·7)` rather than snapping,
so a fast scroll produces a smooth chase rather than a jump cut. The look target walks from
`[0, 0.14, 0]` to the origin across the same progress. In parallel a `Turntable` group takes a
slow 0.92 rad quarter-turn, so the fold is read from two sides rather than one.

### Mounting discipline

An `IntersectionObserver` with `rootMargin: '60% 0px 60% 0px'` gates the canvas: it mounts
just before the section arrives and stays mounted afterwards (`current || entry.isIntersecting`)
so scrolling back up does not rebuild the shell. The first still frame covers the gap until
`onReady`.

### Analytics

Four milestones (25 / 50 / 75 / 100%), fired once each per mount via a `Set`, as
`product_transformation_view { productId, progress }`.

### The reduced-motion and low-tier path

`StillSequence` — the same four moments as a 2×2 grid of stills with the same captions, no
canvas, no scroll binding, no GSAP. The milestone events still fire, through an
`IntersectionObserver` at 0.6 threshold, so the funnel is comparable across both paths.

Every stage is also emitted into the document as an `sr-only` ordered list, so a reader who
never scrolls the section still has the content.

---

## 12. Performance budgets

| Budget | Value | Enforced by |
| --- | --- | --- |
| Frame | 22 ms is the ceiling, 13 ms the headroom mark | `useAdaptiveDpr` on every tier; demand frameloop on `low` |
| DPR | `[1, tier.dpr]` — never above 2 | `SceneCanvas` + `AdaptiveResolution` |
| Triangles | ~120 k for the whole shell | `SEG` budgets; the GLB spec caps at the same figure |
| GLB | ≤ 2.5 MB, Draco-compressed | `public/models/README.md` checklist |
| Textures | ≤ 2048², KTX2/Basis preferred | Same. The procedural shell ships **zero** textures |
| Shader programs | 2 (`weave`, `plain`) | `customProgramCacheKey` |
| Draw calls | One per part; ~24 parts at full build | Geometry stage list |
| Env map | 256² / 128², computed once | `<Environment frames={1} />` |
| Particles | 900 / 380 / 0 | `three.tiers[tier].particles` |
| Initial JS | three.js never enters the initial bundle | `next/dynamic({ ssr: false })` at every boundary |

Everything in this section other than the geometry budgets lives in
`src/components/three/optimization.ts`, which exists to hold the four things that keep WebGL
honest on a real device — compressed delivery, adaptive resolution, culling, and disposal —
plus a small LOD helper.

> **What is wired up today, and what is a seam.** `SceneCanvas` calls `registerRenderer()` and
> mounts `<AdaptiveResolution />`, so those two are live on every scene in the site. The rest of
> the module — `configureModelLoader`, `applyFrustumCulling`, `createLOD` / `lodDistances`,
> `disposeObject3D` / `useDisposeOnUnmount` — is **available and unused**, because the procedural
> shell needs none of it: it ships no textures, its ~24 parts are all on screen at once, and each
> owner already disposes what it allocated (§13). They are the seams the first real GLB is
> expected to need, and they are documented here so that adoption is a call, not a rewrite.
>
> Everything in the module is re-exported from the `@/components/three` barrel. Note what that
> implies: the barrel pulls `three-stdlib`'s KTX2 loader in with it, so **the barrel is for scene
> code only.** A boundary component (`ProductStage`, `ProductViewer`, `ARProductLauncher`) must
> keep importing individual modules for types, exactly as it does today — importing the barrel
> from a server-safe file would drag three.js back into a bundle the whole layer is arranged to
> keep it out of.

### Adaptive DPR — measure the frame, not the hardware

`<AdaptiveResolution min={three.dpr.min} max={settings.dpr} />` is mounted inside every
`SceneCanvas`, on every tier. The tier is a *guess about* the device; the frame time is the
device answering. It only ever spends less than the tier ceiling, so a `high` device that is
actually throttled, on battery, or sharing a GPU with a video call degrades gracefully instead
of stuttering at DPR 2.

| Knob | Default | Meaning |
| --- | --- | --- |
| `budgetMs` | 22 | Above this average, drop resolution (≈ 45 fps) |
| `headroomMs` | 13 | Below this average, give it back (≈ 77 fps) |
| `window` | 45 frames | Averaged before any decision — short windows chase noise |
| `step` | 0.25 | How far the pixel ratio moves per decision |

Three details make it stable rather than pulsing:

- **Two hysteresis bands.** There is a dead zone between 13 ms and 22 ms where nothing happens.
  A single threshold would oscillate around it, and a visible resolution pulse is worse than a
  permanently slightly-soft frame.
- **A settle delay.** A resolution change forces a full resize; 20 frames are skipped afterwards
  before the next judgement, and 12 after a visibility change.
- **Absurd samples are discarded, not acted on.** Any frame longer than 100 ms resets the
  window. A backgrounded tab, a GC pause and the gap between two frames on the *demand*
  frameloop are all long, and none of them mean the GPU is struggling. Without this rule the
  demand frameloop — which is exactly what `low` runs — would talk itself down to DPR 1
  immediately and stay there.

The `visibilitychange` reset exists for the same reason: a tab returning from the background
reports one enormous frame followed by a few unnaturally fast ones, and neither is evidence.

### Culling, bounds and LOD

`applyFrustumCulling(root, { padding: 1.6 })` turns frustum culling on across a subtree and
then makes the bounds trustworthy. The default padding is the interesting part: **the fold
shader moves vertices a long way from where the CPU thinks they are.** A mesh culled because
its *authored* bounding sphere left the frustum pops out of existence halfway through the
transformation, which is the most visible bug the layer can produce. 1.6× covers the full
collapse into the carry box. Bounds are padded once and flagged with
`geometry.userData.paddedBounds`, so a re-run cannot compound the padding.

Anything marked `userData.noCull` is exempted with `frustumCulled = false` — the drifting motes
place themselves in the vertex shader and have no meaningful CPU-side bounds at all.

`createLOD(levels)` builds a plain `THREE.LOD` from `{ object, distance }` pairs, sorted
ascending and set to auto-update. `lodDistances(tier)` returns the bands the shell uses, scaled
to the budget — `[0, 5.4, 9]` on high, `[0, 4.2, 7]` on medium, `[0, 3.2, 5.4]` on low. A phone
drops to the cheap level sooner because it is also drawing fewer pixels, so the swap is less
visible there, not more.

### DRACO and KTX2

Both decoder sets are **self-hosted**. The site loads no third-party scripts, so the standard
`gstatic.com` decoder path is not an option and the CSP would refuse it anyway.

```ts
export const DECODER_PATHS = { draco: '/draco/', ktx2: '/basis/' } as const;
```

```bash
# geometry compression
mkdir -p public/draco
cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/
# draco_decoder.js · draco_decoder.wasm · draco_wasm_wrapper.js
# (the encoder in that folder can be deleted)

# texture transcoding
mkdir -p public/basis
cp node_modules/three/examples/jsm/libs/basis/* public/basis/
# basis_transcoder.js · basis_transcoder.wasm
```

Neither is fetched unless a model actually uses it. The procedural shell ships no textures at
all, and `meridian-shell.glb` is only Draco-compressed if the export pipeline in §16 was
followed — so on a default checkout both directories can be absent and nothing 404s.

Two wiring details, because they are easy to get subtly wrong:

- **`registerRenderer(gl)`.** KTX2 has to ask the renderer which compressed formats the GPU can
  take. `SceneCanvas` hands its renderer over in `onCreated`, and `configureModelLoader` calls
  `detectSupport` again if the transcoder was built first. Without this a KTX2 texture either
  fails to transcode or silently picks an uncompressed path.
- **`configureModelLoader` is a stable module-level reference on purpose.** It is the
  `extendLoader` argument for drei's `useGLTF` — `useGLTF(url, DECODER_PATHS.draco, true,
  configureModelLoader)` — and it adds the KTX2 transcoder on top of the Draco loader drei
  configures from the path argument. `JacketModel` currently calls the two-argument form
  (`useGLTF(url, DRACO_DECODER_PATH)`), which is correct while no asset carries KTX2 textures;
  **the day the GLB ships KTX2, both the `useGLTF` call and the `useGLTF.preload()` in
  `loadJacketGLB()` must be given the same four-argument form.** Warming the cache with one
  configuration and rendering with another leaves a cache entry and a render disagreeing about
  what the file contains, and the failure looks like an untextured model rather than an error.

`disposeModelLoader()` frees the transcoder's worker pool. It is for a full teardown only —
calling it between viewer mounts throws away the pool that the next mount needs.

> **Pre-flight item for the first Draco asset.** The production CSP in `next.config.ts` sets
> `script-src 'self' 'unsafe-inline' …` with `'unsafe-eval'` in development only. Chromium
> requires `'wasm-unsafe-eval'` (or `'unsafe-eval'`) in `script-src` to compile WebAssembly;
> Firefox and Safari do not currently enforce it. Nothing is broken today — with no GLB in the
> repository the decoder is never fetched — but **the first Draco-compressed asset must be
> tested in Chrome against the production headers**, and `'wasm-unsafe-eval'` added to
> `script-src` if the decoder is blocked. The JS fallback decoder does not rescue this case:
> a CSP refusal throws rather than making `WebAssembly` undefined. Same applies to a KTX2
> transcoder, which is also WASM.

### Why `worker-src blob:` exists

`DRACOLoader` and the KTX2 transcoder compile their worker bundles from object URLs. Without
both `worker-src 'self' blob:` and `child-src 'self' blob:` the viewer fails to initialise on
first interaction with a console error and no visible cause. See §15.

---

## 13. Disposal and leak discipline

Three.js does not garbage-collect GPU resources. Every allocation in this layer has a matching
release.

| Resource | Released by |
| --- | --- |
| Procedural geometry | `disposeParts(built)` in the `useStagedParts` cleanup — including a build cancelled mid-stage |
| Motion-table geometry | Disposed inside `jacketPartMotion()` immediately after the motion is read off it |
| Shell materials | `factory.dispose()` on unmount, walking the `created[]` list |
| GLB materials | The cloned materials are tracked in `owned.current` and disposed on unmount |
| GLB geometry | **Not** disposed — it belongs to the `useGLTF` cache and is shared between viewers |
| Mote buffers | `useEffect(() => () => geometry.dispose(), [geometry])` |
| Context listeners | `cleanupRef` in `SceneCanvas`, removed on unmount |
| ScrollTrigger | `gsap.context().revert()` |
| IntersectionObserver | `observer.disconnect()` |
| Node registrations | `onNodes([])` in every layout-effect cleanup, so the frame loop never holds a stale `Object3D` |

The subtle one is the cancelled build. `useStagedParts` pushes into a local `built[]` across
frames; if the component unmounts on stage 4 of 6, the cleanup cancels the pending frame **and**
disposes the four stages that did complete. Without that, a reader scrolling quickly past a
product would leak a partial shell per pass.

### The generic sweeper

`optimization.ts` also exports a subtree sweeper for anything that does *not* own its
allocations part-by-part — an imported GLB variant, a decorative rig, a scene assembled at
runtime:

```ts
disposeObject3D(root, { keep: [gltfCache.geometry], detach: true });
// → { geometries, materials, textures }
useDisposeOnUnmount(ref, { keep });     // the hook form
```

It walks the tree, disposes geometry, materials and every `THREE.Texture` hanging off a
material, and counts what it freed. Two properties matter:

- **Shared resources are disposed once.** A `Set` seeded from `keep` tracks everything already
  seen, so a material used by six meshes is not disposed six times — which in three.js means six
  `dispose` events and a listener list that has already been torn down.
- **`keep` is how you protect what you do not own.** GLTF-cached geometry is reused by the next
  mount; disposing it makes the *second* viewer on a page render nothing. This is the same rule
  `GLBShell` follows by hand today — it disposes its cloned materials and leaves the cached
  geometry alone.

---

## 14. The fallback chain

Read top to bottom. The first row whose condition holds is what renders.

| Condition | Hero | Product viewer | Transformation |
| --- | --- | --- | --- |
| `pending` (capability unknown) | 2D plate | 2D gallery | Still sequence |
| No WebGL | 2D plate | 2D gallery **+ a plain-language note** | Still sequence |
| `prefers-reduced-motion: reduce` | 2D plate | 3D, started **still** — no auto-rotation, no drift | Still sequence |
| `tier === 'low'` | 2D plate | 3D at `low` quality | Still sequence |
| WebGL throws | 2D plate (error boundary) | 2D gallery (error boundary) | First still frame |
| Context lost | `Restore view` control over the frame | Same | Same |
| GLB missing / failed | Procedural shell | Procedural shell | Procedural shell |
| Image fails to load | `.jpg` twin, then a contour field | `.jpg` twin, then an `ErrorState` | `.jpg` twin |

Two things distinguish this from a spinner-and-hope arrangement:

**The 2D view is a product view, not a placeholder.** `ViewerFallback` in `gallery` mode carries
every angle from the catalogue (technical images sorted first), the same annotated hotspots
positioned by the catalogue's normalised 0–1 coordinates, keyboard navigation (`←` `→` `Esc`),
a thumbnail rail as a proper `role="tablist"`, and — when WebGL is genuinely absent — a sentence
saying so in plain language rather than a broken control.

**Reduced motion is honoured differently per surface.** The hero and the transformation drop to
2D entirely, because their whole content *is* motion. The interactive viewer keeps 3D but starts
it still: `autoRotate` initialises to `!reducedMotion`, so movement only happens when the reader
asks for it. Taking the viewer away from someone who asked for less motion would be removing
information, not motion.

Every plate ships as `.webp` with a `.jpg` twin. `jpgTwin()` swaps on an `onError`, so a browser
that cannot decode WebP still gets the product.

---

## 15. Content Security Policy

`next.config.ts` sets a real CSP, and the WebGL layer is what makes it non-trivial. The
directives that exist *because of* this layer:

| Directive | Why the 3D layer needs it |
| --- | --- |
| `worker-src 'self' blob:` | `DRACOLoader` and the KTX2 transcoder compile their worker bundles from object URLs. Without it the viewer fails to initialise on first interaction |
| `child-src 'self' blob:` | The legacy fallback directive for the same workers; some engines still consult it |
| `img-src 'self' data: blob:` | Canvas readbacks and generated textures; `data:` covers `next/image`'s inlined placeholders |
| `media-src 'self' blob: data:` | GLB/GLTF assets and generated media fetched as blobs |
| `connect-src 'self' blob: data:` | The model fetch and the `HEAD` probe |
| `style-src-attr 'self' 'unsafe-inline'` | `motion/react` and the 3D overlays write style attributes every frame |
| `fullscreen=(self)` (Permissions-Policy) | The viewer's native fullscreen path |

Two absences are also deliberate and worth knowing:

- **`xr-spatial-tracking=()`** — WebXR is denied outright at the header level, so the in-page
  `immersive-ar` path in `src/components/ar/WebXRExperience.tsx` cannot start. The native
  hand-offs (Scene Viewer, Quick Look) are unaffected — they leave the page entirely. See
  `AR_ARCHITECTURE.md` §13 for the one-token change and why it is a decision rather than a fix.
- **No `'wasm-unsafe-eval'`** in production `script-src`. See the pre-flight note in §12.

---

## 16. Authoring and exporting the production GLB

`public/models/README.md` is the **normative specification** and ships next to the directory the
file goes into, so it stays with the asset. This section is the architectural summary; where
the two differ, the README wins.

### Scale and orientation

| Property | Value |
| --- | --- |
| Format | `.glb` (binary), glTF 2.0, metallic-roughness PBR |
| Units | The shell is **2.1 units** tall, hood crown to hem. Author to **0.40 m per unit** (see the note in §5) so the packed shape and the published 24 × 16 × 9 cm agree |
| Up axis | **+Y** |
| Facing | **+Z** — the front placket toward the camera at rest |
| Origin | World origin at mid-chest, on the vertical centreline |
| Landmarks | Shoulders y ≈ 0.73 · crown y ≈ 1.30 · hem y ≈ −0.81 |
| Extents | x ≈ ±0.45 at the chest, ±0.56 at the cuffs; z ≈ ±0.27 at the chest |
| Triangles | ≤ ~120 k for the whole shell |
| Size | ≤ 2.5 MB after Draco |

Apply every transform before export. Each node must carry an identity transform with its
geometry baked — **except** the nodes the motion table animates, where an authored transform is
read as the rest pose and preserved (`base.position` / `base.quaternion` / `base.scale` are
captured in a layout effect and every frame's motion is applied relative to them).

### Node naming — the contract

The motion table is keyed by `Object3D.name`. A node named below inherits the exploded offset,
the fold choreography and the carry-state fade for free. A node named anything else still
renders; it simply does not animate.

```
shell_body          shell_yoke_seam     shell_collar
shell_sleeve_r      shell_sleeve_l
shell_armhole_r     shell_armhole_l
shell_cuff_r        shell_cuff_l
shell_hood          hood_lining         hood_rim
shell_placket       shell_pocket_r      shell_pocket_l
detail_welt_r       detail_welt_l       shell_hem
hardware_zip        hardware_zip_pull
hardware_cord_r     hardware_cord_l     detail_chest_label
carry_strap         carry_buckle        carry_zip        carry_tag
```

Blender's `.001` disambiguation suffixes break the match silently. Check for them before export.

### UVs and material regions

- Every shell mesh needs a **UV0**. The weave shader reads `vUv` and sets `USE_UV`; a mesh
  without UVs compiles but modulates roughness against zeroes and reads flat.
- UV scale should be roughly consistent across shell panels — `weaveScale` is a single scalar
  per finish (46 for ripstop, 130 for softshell), so a panel unwrapped at half the density of
  its neighbour will show a visibly coarser grid.
- **Material regions.** Any *material or mesh* name matching `/shell|body|sleeve|hood|placket|pocket/i`
  is claimed by the colourway system: its base colour is overwritten with the selected colourway
  and its roughness/metalness with the selected finish. Everything else keeps what you authored.
  Name lining, hardware and webbing so they fall **outside** that pattern, or they will turn the
  colour of the jacket.
- The fold shader is injected into whatever arrives, so it needs a standard-lit material.
  Unlit, custom or extension-only materials will not carry the transformation.
- Textures ≤ 2048², KTX2/Basis preferred. The procedural shell ships none at all — if the GLB is
  heavier than ~2.5 MB, ask whether the extra fidelity is visible at the framing the viewer uses.

### The fold — two options

1. **Author it.** Add a morph target named exactly `pack` to each mesh that should fold, taking
   the worn shape to the packed shape. The viewer drives that influence 0 → 1 and switches its
   own shader fold off for that material. This is the better result — a modelled fold beats a
   mathematical one.
2. **Let the shader do it.** Ship no morph target and the vertex shader collapses the mesh into
   the carry box. This is what the procedural shell does today, and it is convincing.

The carry box is fixed: half extents `[0.30, 0.20, 0.1125]`, centred on the origin, corner
radius `0.05` — the catalogue's published 24 × 16 × 9 cm ratio. Author the packed shape inside
that volume.

### Hotspot anchors

An empty per catalogue hotspot, named `anchor_<id>`:

| Node | Hotspot | Position |
| --- | --- | --- |
| `anchor_h1` | Carry cavity | `[ 0.00,  1.15,  0.18]` |
| `anchor_h2` | Load webbing | `[-0.42,  0.40,  0.22]` |
| `anchor_h3` | Gusseted underarm | `[ 0.50,  0.55,  0.10]` |
| `anchor_h4` | Hand pockets | `[-0.34, −0.10,  0.28]` |
| `anchor_h5` | Hem drawcord | `[ 0.00, −0.62,  0.24]` |

These come from `hotspots[].anchor3d` in `src/data/catalog.ts` (and from the `hotspots` JSONB
column in Supabase once populated). **The catalogue is the source of truth** — the markers read
from it, not from the file. If the model moves, move the catalogue values with it.

### Export — Blender

1. Apply all modifiers, transforms and scale (`Ctrl+A → All Transforms`).
2. Rename objects to the table above. Check for `.001` suffixes.
3. Triangulate. Stay under ~120 k triangles.
4. `File → Export → glTF 2.0 (.glb)`:
   - Format **glTF Binary (.glb)**
   - Include: Selected Objects, Custom Properties
   - Transform: **+Y Up**
   - Geometry: Apply Modifiers, UVs, Normals, Tangents (if normal-mapped)
   - Compression: **off** — Draco is applied in the next step with better control
   - Shape Keys: **on**, if the `pack` morph was authored
5. Save as `meridian-shell.raw.glb`.

### Compression

```bash
npx @gltf-transform/cli optimize \
  meridian-shell.raw.glb meridian-shell.glb \
  --compress draco --texture-compress ktx2 --simplify false

# or
npx gltfpack -i meridian-shell.raw.glb -o meridian-shell.glb -cc -tc

# verify before committing
npx @gltf-transform/cli inspect meridian-shell.glb
```

Then copy the decoders (§12) if the result is Draco-compressed.

### Where files go

```
public/models/
  meridian-shell.glb            ← the only one wired up; drives all three modes
  meridian-transformation.glb   ← optional, only if the fold needs its own rig
  meridian-exploded.glb         ← optional, only if the exploded view needs one
public/draco/
  draco_decoder.js  draco_decoder.wasm  draco_wasm_wrapper.js
```

The catalogue already declares all three paths in `products[].models` with `placeholder: true`.
Flip that flag when a real asset replaces one, so the admin surfaces stop reporting the model as
outstanding. Only `meridian-shell.glb` is loaded today — the single shell drives the hero, the
viewer and the transformation through the motion table.

### Pre-commit checklist

- [ ] Loads in `gltf-viewer.donmccurdy.com` without warnings
- [ ] Under 2.5 MB, Draco-compressed, `inspect` clean
- [ ] Faces +Z, +Y up, ~2.1 units tall, centred on the origin
- [ ] Node names match exactly — no `.001` suffixes
- [ ] Shell materials named so the colourway regex matches; lining/hardware/webbing named so it does not
- [ ] UV0 present on every shell mesh, consistent density
- [ ] `anchor_h1`…`anchor_h5` present, on the catalogue coordinates
- [ ] `pack` morph target present, or the shape folds acceptably by shader
- [ ] Decoders in `public/draco/` if compressed
- [ ] **Tested in Chrome against the production CSP** (see the WASM note in §12)
- [ ] Hero, product viewer and transformation section all re-checked after the swap — all three
      read the same file
- [ ] `products[].models[].placeholder` flipped to `false`

---

## 17. Debugging

**The R3F root state is on `window` in development.** `SceneCanvas` assigns
`window.__vayroScene` in `onCreated` when `NODE_ENV === 'development'`:

```js
__vayroScene.gl.info.render        // draw calls, triangles, frame count
__vayroScene.gl.info.programs      // should be 2 for a shell scene
__vayroScene.scene.getObjectByName('meridian-shell')
__vayroScene.invalidate()          // force a frame on the demand loop
```

| Symptom | First thing to check |
| --- | --- |
| Nothing renders, no error | `useDeviceTier()` — is `webgl` false, or `tier` `low`? Both are silent by design |
| The shell will not fold | Chunk names in `materials.ts` against the installed three.js version — a renamed chunk fails silently |
| A part folds into the wrong place | `syncPackMatrices()` is only called mid-fold; check `uToRoot` is being written for that material |
| A GLB node does not animate | Its name is not in `jacketPartMotion()`. Check for `.001` |
| The jacket is invisible on a dark plate | §9. Check the colourway, then the `scheme` prop, then the scrim's `color-mix` colour space |
| Programs recompiling per part | `customProgramCacheKey` lost, or `weave` differs per material where it should not |
| The viewer never leaves the loader | `onReady` is fired from a layout effect after `onNodes` — a build that produced zero parts never fires it |
| Everything stutters on scroll | Something re-rendering per tick. The transformation deliberately passes progress as a getter |
| The Draco decoder 404s or is CSP-blocked | `public/draco/` empty, or the WASM note in §12 |

---

<div align="center">

**One layer. Every destination.**

`ARCHITECTURE.md` §7 · `DESIGN.md` · `public/models/README.md` · `AR_ARCHITECTURE.md`

</div>
