<div align="center">

# VAYRO — AR Architecture

**Putting the product in the reader's room: which of the three incompatible
runtimes this device actually has, why an unsupported control is never drawn,
and what happens at every point where the answer is no.**

</div>

---

## Contents

1. [The shape of the layer](#1-the-shape-of-the-layer)
2. [Capability detection](#2-capability-detection)
3. [The honesty rule](#3-the-honesty-rule)
4. [The launcher](#4-the-launcher)
5. [Real-world scale](#5-real-world-scale)
6. [WebXR — the product stays on our page](#6-webxr--the-product-stays-on-our-page)
7. [`<model-viewer>` — the native hand-offs](#7-model-viewer--the-native-hand-offs)
8. [USDZ and iOS Quick Look](#8-usdz-and-ios-quick-look)
9. [The `/ar/[slug]` route](#9-the-arslug-route)
10. [The mobile performance path](#10-the-mobile-performance-path)
11. [The fallback chain](#11-the-fallback-chain)
12. [Analytics](#12-analytics)
13. [Headers — what AR needs that the site does not send](#13-headers--what-ar-needs-that-the-site-does-not-send)
14. [Testing, per platform](#14-testing-per-platform)
15. [Current state and what is outstanding](#15-current-state-and-what-is-outstanding)

---

## 1. The shape of the layer

AR is the top rung of a ladder, and the ladder is the architecture:

```
  plate      the product photograph. Loads first, always, on every device
    ↓        (tap)
  3D         the interactive WebGL viewer, on request
    ↓        (tap, and only where the hardware allows)
  AR         the product at true size, on the reader's floor
```

Each rung is more expensive than the one below and each is entered deliberately. **Nothing
above the plate ever starts by itself.** This is not conservatism for its own sake: `/ar/[slug]`
is the page a phone camera lands on from a QR code, on whatever connection the reader happens to
be standing in, and starting WebGL plus a 4 MB AR runtime before they have asked for either is
how a shop-window scan becomes a blank screen.

### Modules

| File | Responsibility |
| --- | --- |
| `src/components/ar/ARCapabilityDetector.ts` | `detectAR()` / `useARCapability()`. The one authority on which runtime, if any, this device has |
| `src/components/ar/ar-scale.ts` | Model units → metres. Derived from the carry box and the catalogue, not declared |
| `src/components/ar/ARButton.tsx` | "View in your space". Renders only when a device has been measured and found capable |
| `src/components/ar/ARProductLauncher.tsx` | The only thing a product surface has to mount. Answers *can this device* and *is there a model*, then routes the launch |
| `src/components/ar/WebXRExperience.tsx` | The in-page `immersive-ar` session: hit test, reticle, placement, DOM overlay |
| `src/components/ar/ModelViewerFallback.tsx` | `<model-viewer>` as the runtime for the two native hand-offs |
| `src/components/ar/ARStage.tsx` | The plate → 3D → AR ladder as one component |
| `src/components/ar/index.ts` | Barrel. `import { ARProductLauncher } from '@/components/ar'` |
| `src/app/ar/[slug]/page.tsx` | The QR destination |
| `src/app/ar/[slug]/not-found.tsx` | A scanned code that no longer resolves |

---

## 2. Capability detection

There are exactly three ways to put a product into a room, and **they are not interchangeable.**

| Mode | What happens | Who has it |
| --- | --- | --- |
| `webxr` | The page keeps the model. `navigator.xr` opens an `immersive-ar` session and **we render our own scene into it** | Chrome/Chromium on Android with ARCore; some headsets |
| `scene-viewer` | Android hands the GLB to Google Scene Viewer over an `intent://` URL. **The page loses the model to a native app** | Android + Chromium |
| `quick-look` | iOS hands a USDZ to AR Quick Look through `<a rel="ar">` | iOS / iPadOS, every browser (they are all WebKit) |

### How each is decided

**Nothing is inferred from a user-agent string where an API exists to ask directly.**

```
webxr        navigator.xr.isSessionSupported('immersive-ar')   — asked
quick-look   document.createElement('a').relList.supports('ar') — feature-tested
scene-viewer platform sniff                                     — no choice
```

Scene Viewer is the only one decided from the platform, and only because it has **no web-facing
API at all** — the entire point of the mechanism is that it leaves the web. It is gated on
Android *and* a Chrome token, with Firefox for Android excluded explicitly rather than by
omission: it carries no Chrome token and has no Scene Viewer hand-off.

Two details worth knowing about the platform tests:

- **iPadOS 13+ ships the desktop Safari user agent.** `isIOS()` therefore accepts a `Macintosh`
  agent when `navigator.maxTouchPoints > 1`, which is what separates an iPad from an actual Mac.
- **`relList.supports('ar')` can throw** where the token set is undefined. It is wrapped, and a
  throw is read as "no".

### WebXR is asked three questions, not one

```ts
if (!window.isSecureContext)          → 'WebXR needs a secure (HTTPS) connection.'
if (!navigator.xr?.isSessionSupported) → 'This browser does not implement the WebXR Device API.'
if (xrPolicyAllowed() === false)      → 'This site withholds the xr-spatial-tracking permission…'
await xr.isSessionSupported('immersive-ar')
```

The third check is the one most implementations skip. A `Permissions-Policy` that withholds
`xr-spatial-tracking` stops WebXR **at the document level, before `isSessionSupported` is ever
consulted** — so the API answers "not supported" and the real reason (a header this site sends
to itself) is invisible. Reading the policy back through
`document.permissionsPolicy.allowsFeature()` turns a silent no into an accurate explanation.

> **This is not hypothetical.** `next.config.ts` sends `xr-spatial-tracking=()` today. See §13.

### The result

```ts
type ARCapability = {
  webxr: boolean;
  sceneViewer: boolean;
  quickLook: boolean;
  mode: 'webxr' | 'scene-viewer' | 'quick-look' | 'none';
  reason: string;   // plain language, safe to show a reader
};
```

`detectAR()` runs **once per session** — the promise is cached — and **every path resolves**. A
detector that rejects would take the button down with it, which is the opposite of the intended
failure. `useARCapability()` is the hook form and mirrors `useDeviceTier()`: it opens `pending`,
and **no AR affordance may be rendered until it reports otherwise.**

`reason` is written to be read by a person, not a developer. "Desktop browsers have no camera
pass-through to place a product in" is a better answer than a missing button.

---

## 3. The honesty rule

**A control that cannot do what it says is worse than no control.**

`ARButton` has no disabled state and no "coming soon". On a device with no AR route it
**returns `null`** and the caller shows its 3D entry point instead:

```tsx
if (!resolved || resolved.mode === 'none') return null;
```

The rule extends through the whole layer:

- **Capability is never assumed from a class of device.** "It's a phone, so it must do AR" is
  wrong for every iPhone before the A9, every Android without ARCore, and every in-app browser.
- **A declared model is not an existing model.** `ARProductLauncher` issues its own `HEAD`
  request for the asset before offering anything. The catalogue ships `placeholder: true`
  against all three Meridian models today; a catalogue entry naming a GLB is a *plan*, not a
  file.
- **The two failures are reported differently**, because the reader can act on one of them:

  ```
  no asset    "AR not available for this piece yet — its 3D asset has not been published."
  no device   "AR not available on this device. <capability.reason>"
  ```

- **A hand-off is attempted, not assumed.** Both native routes require the navigation to sit
  inside a user activation, and a slow model can outlive the tap that opened the view.
  `<model-viewer>` keeps its own AR control on screen throughout, so a missed activation window
  costs one more tap rather than the whole feature.
- **A supplied capability is authoritative.** `ARButton` accepts a `capability` prop so a caller
  that has already probed does not pay for a second detection — and so the button and the
  launcher can never disagree about what the device can do.

---

## 4. The launcher

`ARProductLauncher` is the only component a product surface needs to mount. It asks two
questions, both with real answers:

```
1. Can this device do AR?      useARCapability()
2. Is there a model to place?  HEAD /models/<asset>.glb  (+ the .usdz twin)
```

### The asset probe

```ts
fetch(url, { method: 'HEAD' })
  → !response.ok                                   → false
  → content-type includes 'text/html'              → false   // a 404 page with a 200
  → content-length is 0 or > 1024                  → true
```

The HTML check is not paranoia. Some dev servers and CDNs answer a missing file with `200` and
an HTML document; without that test the launcher would offer AR for a model that is a 404 page,
and the failure would land inside a native viewer where nothing can be done about it.

Probes are memoised in a module-level `Map` keyed by URL, so mounting the launcher twice on one
page costs one request. It is the same pattern `loadJacketGLB()` uses in the 3D layer
(`3D_ARCHITECTURE.md` §6) — deliberately, because the two probes ask the same question of the
same file.

`useARModelSource` reads `product.models`, preferring `mode === 'default'` and falling back to
the first entry. A product with **no** declared model is answered without a round trip at all.

### States

| Condition | Rendered |
| --- | --- |
| Capability or asset probe still pending | A `Skeleton` at the button's height — never a button that might vanish |
| `mode === 'none'` or no asset | A bordered note with the specific reason, plus the caller's `fallbackAction` |
| Both yes | `ARButton`, the true-size caption, and the view once launched |

### The launch

```ts
setView(capability.webxr ? 'webxr' : 'model-viewer');
onOpenChange?.(true);
```

`onOpenChange` exists so the surrounding page can **free its own WebGL context**. `ARStage` uses
it exactly that way: opening AR unmounts the page's 3D viewer. Two live WebGL contexts on a
phone that is also running a camera feed and a pose tracker is a budget worth not spending, and
some devices simply refuse the second context.

The `<model-viewer>` route opens inside a full-screen `role="dialog"` sheet with `aria-modal`,
body-scroll lock and `Escape` to close. The element has to be **on screen and loaded** before
either native viewer can be opened, so the sheet is not decoration — it is where the hand-off is
arranged, and the element's own AR control is right there if the automatic attempt misses.

---

## 5. Real-world scale

AR is measured in metres. The model is measured in its own units. **The conversion between them
is not a taste decision** — it is derived, in `ar-scale.ts`, and it is checkable:

```
CARRY_BOX.half = [0.3000, 0.2000, 0.1125]     (src/components/three/geometry.ts)
Published packed size = 24 × 16 × 9 cm         (src/data/catalog.ts, specs)

  0.24 m / (2 × 0.3000 u) = 0.40 m per unit
  0.16 m / (2 × 0.2000 u) = 0.40 m per unit
  0.09 m / (2 × 0.1125 u) = 0.40 m per unit
```

Three axes, one answer. **`METRES_PER_UNIT = 0.40`.** At that scale the shell stands 0.84 m from
hood crown to hem — a jacket on a hanger, which is what it should be — and the packed unit
measures exactly what the specification table says it measures. Which is the only claim AR is
really being asked to prove.

### Per-product derivation

`metresPerUnit(product)` re-derives the figure from the product's *own* published packed size
where it has one, falling back to the Meridian constant where it does not:

```ts
const ratios = packed.map((m, axis) => m / (CARRY_BOX_HALF_UNITS[axis] * 2));
const spread = Math.max(...ratios) - Math.min(...ratios);
return spread / mean > 0.08 ? METRES_PER_UNIT : mean;
```

**A packed size whose three axes disagree by more than 8% about the scale is a mis-read, not a
measurement**, and is discarded. A bad parse must never silently resize a product in somebody's
living room. The unit parser is equally defensive: centimetres unless the value says otherwise,
with `\bmm\b` tested before `\bm\b` so the `m` in "cm" cannot match.

Today only the Meridian publishes a `Packed size` spec, so every other product takes the
constant — which is the same 0.40 either way.

### Placement height

The model origin is at **mid-chest**, not at the hem. Placing it directly on a hit-test pose
would bury the bottom half of the jacket in the floor. `groundOffsetMetres()` returns
`-MODEL_HEM_Y × metresPerUnit` — the lift that puts the hem on the surface the reader tapped.

```
MODEL_HEM_Y      = -0.81
MODEL_SHOULDER_Y =  0.73
MODEL_CROWN_Y    =  1.30
```

### `CARRY_BOX` is restated, not imported

Deliberately. `CARRY_BOX` lives inside the procedural geometry builder, and **an AR button that
may never render a single WebGL frame must not drag that module into the bundle to read three
numbers out of it.** The duplication is annotated at both ends; if the carry box moves, both
move.

> **A known inconsistency, stated rather than hidden.** `public/models/README.md` declares the
> authoring convention as *1 unit ≈ 62 cm*, which does not agree with the 0.40 m/unit derived
> above. Only the derived figure is checkable — it falls out of a constant the fold shader
> already uses and a number the spec table already prints. **Treat 0.40 as authoritative for
> anything measured, and hand the model author that figure.** See `3D_ARCHITECTURE.md` §5.

---

## 6. WebXR — the product stays on our page

Where `navigator.xr` will open an `immersive-ar` session, nothing is handed to a native viewer:
**the same scene the product page runs — the same shell, the same colourway, the same materials,
the same fold shader — is drawn into the session.** What the reader sees on the floor is the
thing they were just looking at.

### No `@react-three/xr`

It is not a dependency and was not added for this. The raw WebXR Device API is enough:

- React Three Fiber already switches its own loop to `session.requestAnimationFrame` when a
  session starts, and hands the live `XRFrame` to `useFrame` as a third argument. That is the
  only integration point required.
- A hit-test source against the `viewer` reference space finds the surface.
- A `select` event on the session fixes the shell there.

One fewer dependency, and the scene stays the scene rather than becoming an XR-flavoured copy of
it.

### The session

```ts
await xr.requestSession('immersive-ar', {
  requiredFeatures: ['hit-test'],
  optionalFeatures: ['dom-overlay', 'light-estimation'],
  domOverlay: { root: overlayRef.current },
});
gl.xr.enabled = true;
gl.xr.setReferenceSpaceType('local');
await gl.xr.setSession(session);
```

`local` rather than `local-floor`: **`local` is guaranteed for an immersive session and
`local-floor` is not**, and the hit test reports an absolute pose either way, so nothing is
gained by requiring a space the device may refuse.

`dom-overlay` and `light-estimation` are *optional* features. Requiring either would fail the
session on a device that supports AR but not that extension — the controls degrade to no overlay
rather than to no AR.

### Placement runs through a ref, not state

```ts
const placementRef = useRef<Placement>({
  reticleVisible, reticleMatrix, placed, placementMatrix,
});
```

The reticle pose is rewritten on **every XR frame**. A React render per frame would be both
pointless and expensive on a device that is already running a camera and a pose tracker. React
is told about exactly two transitions a human can see: a surface was found, and the product was
placed — and even the first is guarded by a `lastSurface` ref so it fires on the edge, not per
frame.

### `beforexrselect` — the bug you only find on a phone

With `dom-overlay` granted, **a tap on the overlay's own controls also reaches the session as a
`select`**. Press "Place" and the product is placed twice; press "Exit" and it plants the jacket
on your way out. The specified fix is to cancel `beforexrselect` on the overlay root:

```ts
node.addEventListener('beforexrselect', (event) => event.preventDefault());
```

### Retry, because the activation can be lost

`requestSession` needs a transient user activation, and the tap that opened the view has to
survive mounting a canvas to still count as one. It normally does. When it does not, retrying
inside a fresh tap is the entire fix — so the failure state offers a **Try again** button rather
than a dead end, keyed on an `attempt` counter that the session effect watches.

### Errors are read from the `DOMException` name

| Name | What the reader is told |
| --- | --- |
| `NotAllowedError` | Camera access was declined, so the session could not start. The 3D view is still available. |
| `NotSupportedError` / `InvalidStateError` | This device reported AR support but could not open a session. The 3D view is still available. |
| `SecurityError` | This page is not permitted to start an AR session on this device. |
| anything else | The AR session could not be started. The 3D view is still available. |

Every one of them names the way out. Nothing says "an error occurred".

### The scene inside the session

| Element | Choice |
| --- | --- |
| Reticle | Two rings — a 8.5–9.5 cm annulus and a centre dot — in `--ivory`, `toneMapped={false}` so the camera feed does not tint them. It is the framing mark from the AR button, laid on the floor |
| Ground mark | A **contour ring**, not a `ContactShadows` plane. A per-frame shadow render on a phone in a live session is not affordable, and a ring grounds the shell honestly |
| Lighting | `StudioEnvironment scheme="light"` at `intensity={0.95}`, particles off, shadows off. The room is real and lit; the rig only has to make the material read |
| Quality | `low` on a low-tier device, `medium` on everything else. **The viewer's `high` tier is not on the table** — see §10 |
| Transforms | Both the reticle and the placement anchor are `matrixAutoUpdate={false}` and written directly from the XR pose matrices |

### Teardown

Three separate cleanups, because there are three ways out:

- The reader taps **Exit** → `session.end()`.
- The OS or the browser ends the session → the `end` listener fires.
- The component unmounts, or the reader navigates away → the unmount effect cancels the hit-test
  source and ends the session.

All three converge on `onClose`, and `ARProductLauncher` calls `onOpenChange(false)` so the page
can bring its own viewer back.

---

## 7. `<model-viewer>` — the native hand-offs

Where WebXR is unavailable but the platform still has a native AR route, the hand-off is a solved
problem and Google's custom element is the thing that solves it. It is used for exactly that:
the model, the two hand-offs, and a camera-controlled preview to look at while the hand-off is
arranged.

```tsx
<model-viewer
  src={glb}
  ios-src={usdz}            // only when the twin was found
  poster={plate}
  ar
  ar-modes="webxr scene-viewer quick-look"
  ar-scale="fixed"
  ar-placement="floor"
  camera-controls
  touch-action="pan-y"
  interaction-prompt="none"
  shadow-intensity="1"
  shadow-softness="0.8"
  exposure="1"
  scale={modelViewerScale(product)}   // "0.4 0.4 0.4"
  loading="eager"
/>
```

### The three attributes that matter

- **`ar-scale="fixed"`.** The scale is derived from the catalogue's published packed size (§5),
  so the product appears at the size it actually is. Letting a reader pinch it larger would
  **turn a measurement into a suggestion**, and the whole commercial point of the feature is
  that the measurement is true.
- **`ar-placement="floor"`.** It is a garment on a hanger, not a wall piece.
- **`touch-action="pan-y"`.** The element does not swallow vertical scroll. On a long product
  page a 3D preview that traps the scroll is a page the reader cannot leave.

### It is loaded lazily, client-side only

```ts
export const ModelViewerFallback = dynamic(
  () => import('@google/model-viewer')
        .then(() => ModelViewerStage)
        .catch(() => UnavailableStage as typeof ModelViewerStage),
  { ssr: false },
);
```

Two reasons, both hard:

1. **The element registers itself into the custom element registry on import and touches
   `window` while doing it.** It can never be evaluated during a server render.
2. **It is roughly 4 MB.** That has no business in the bundle of a page whose reader may never
   tap the button.

The `.catch()` arm matters: a failed dynamic import lands on the product plate rather than an
error boundary, so a CDN hiccup costs the AR view and nothing else.

### Status comes back as DOM events

`ar-status`, `load` and `error` are listened for on the element and mapped to the `ARStatus`
union (`not-presenting` · `session-started` · `object-placed` · `failed` · `unsupported`). An
`error` swaps the whole stage for `ViewerFallback` in gallery mode with a plain-language note.

### React 19 and the custom element type

```ts
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements { 'model-viewer': ModelViewerAttributes }
  }
}
```

React 19 keeps the JSX namespace inside the `react` module rather than in global scope, so a
custom element is declared by augmenting it there. This is the only shape TypeScript accepts; a
global `declare namespace JSX` no longer applies.

---

## 8. USDZ and iOS Quick Look

iOS does not read glTF. Quick Look takes **USDZ**, and the pairing is by convention:

```
/models/meridian-shell.glb   →   /models/meridian-shell.usdz
```

`useARModelSource` derives the twin's URL by extension swap and **probes it separately**. If it
is there, it is passed as `ios-src`. If it is not, the attribute is omitted entirely and
`<model-viewer>` falls back to converting the GLB on the fly through Google's hosted service.

**Ship the USDZ.** The on-the-fly conversion is a third-party round trip on a phone connection,
it is not covered by the site's own CSP posture, and it loses material fidelity. A published
twin is one file.

### Producing one

```bash
# Apple's own converter (macOS, Reality Composer / usdzconvert toolchain)
xcrun usdz_converter meridian-shell.gltf meridian-shell.usdz

# or, cross-platform
npx @gltf-transform/cli usdz meridian-shell.glb meridian-shell.usdz
```

### What Quick Look does differently

- **It reads the USDZ's own units.** `ar-scale="fixed"` governs the WebXR and Scene Viewer paths;
  the USDZ must be authored at true metric size in its own right. Export at **0.40 m per model
  unit** (§5) so the two agree, then verify by placing it next to a ruler.
- **It has no `light-estimation` control from the page.** Quick Look lights the scene itself.
- **It supports an AR banner** (`?callToAction=Buy&checkoutTitle=…`) which VAYRO does not use.
  If it is ever added, it is a commerce surface inside Apple's viewer and needs the same pricing
  discipline as the checkout: never a price the client supplied.

### The database is ready for it

`supabase/migrations/0002_extend.sql` adds to `public.product_3d_models`:

```sql
ar_enabled            boolean not null default false
usdz_url              text
real_world_dimensions jsonb    -- { "unit": "cm", "width": 58, "height": 72, "depth": 12 }
```

with a `jsonb_typeof(...) = 'object'` check, because an array or a bare number there would fail
silently in the viewer.

**`usdz_url` is deliberately not required by `ar_enabled`.** Quick Look needs the USDZ; Scene
Viewer and WebXR place the GLB directly. A model that is AR-ready on Android only is a real
state, and the viewer decides per platform what it can offer. There is also a partial index
`product_3d_models_ar_idx ... where ar_enabled` for the "which products can do AR" query.

> The launcher reads `product.models` from the catalogue and derives the USDZ path by convention.
> **It does not yet read `usdz_url` or `ar_enabled` from the database.** Wiring the repo layer to
> surface those columns is the change that turns the convention into a configuration. See §15.

---

## 9. The `/ar/[slug]` route

### Direct, and QR-free by design

The route is a plain URL. **There is no QR generator in this repository and no scan handler** —
`/ar/meridian-carry-shell` is a destination that any QR encoder, any printed card, any NFC tag
and any typed address reaches identically. A QR code is a way of transporting a URL; building
one into the application would only couple the product to a transport it does not need.

The consequences are the point: the link works in a message, in an email, in a search result and
in a shop window, and none of those paths require the site to know how the reader arrived.

### What the page assumes about its reader

They are standing in front of the product, or wondering whether it belongs in the room they are
in. They have not signed in to anything. Their connection is whatever the shop has.

So: **one column, in order.** What it is · what it costs · look at it · put it in your room ·
the numbers · buy it. No account, no gate, no interstitial.

The at-a-glance strip is three specs and only three — `Packed volume`, `Packed size`,
`Weight (size M)` — because those are the figures a person holding a phone in a shop actually
wants. The full spec table is further down, filtered to `dimensions` and `performance`.

### SEO: a route into the product, not a second copy of it

```ts
alternates: { canonical: `/product/${product.slug}` }
```

The product page is the canonical record. `/ar/[slug]` gets its own title, description and OG
image — it is a genuinely different page with a genuinely different job — but it points its
canonical at the product page so the two never compete, and it is **absent from
`sitemap.xml`** for the same reason.

JSON-LD emits three nodes: the `Product` (shared `@id` with the product page), a `BreadcrumbList`
ending at "In your space", and a `WebPage` whose `mainEntity` references the product's `@id`.

### Rendering

`generateStaticParams()` reads the **seed catalogue**, exactly as `/product/[slug]` does: the
repo layer is request-scoped (it reads cookies so RLS applies) and there is no request at build
time. The current build prerenders all four published slugs; anything that exists only in
Supabase renders on demand. See `DEPLOYMENT.md` §10.

### `not-found.tsx`

A scanned code that no longer resolves gets its own page, written for the situation: *"That code
points at a piece we no longer list, or the address is wrong."* A printed QR code outlives the
product it was printed for, and a generic 404 in a shop is a dead end with the brand's name on
it.

---

## 10. The mobile performance path

AR runs on a phone, at a phone's thermal budget, with **a camera feed and a pose tracker already
on the GPU**. Every budget in the 3D layer is tightened.

| Concern | In the viewer | In AR |
| --- | --- | --- |
| Geometry quality | `high` on a high-tier device | **`medium` at best**, `low` on a low-tier device |
| Weave shader | Compiled at `high` | Never — it requires `high` |
| Shadows | Contact shadows, `frames={Infinity}` | **Off.** A contour ring instead |
| Particles | 900 / 380 | **Off** |
| Lighting rig | Follows theme, or pinned | `scheme="light"` at `intensity={0.95}` — the real room is already lit |
| Environment map | 256² / 128² | Inherited from the tier; still `frames={1}` |
| Second WebGL context | — | **Prevented.** `onOpenChange` unmounts the page's viewer |
| Adaptive DPR | Mounted | Mounted — and it matters more here, because thermal throttling on a phone in a live session is the normal case, not the exception |

Two decisions worth stating plainly:

- **`quality` is capped, not chosen.** `tier === 'low' ? 'low' : 'medium'` — a flagship phone
  gets `medium`, the same as a mid-range one. The extra fidelity would be spent on a shell being
  viewed at arm's length through a camera, and paid for in frame time on a device that is
  already thermally constrained.
- **The contour ring replaces the contact shadow deliberately.** A shadow plane is a second
  render target updated every frame. A ring is two triangles fans and grounds the object well
  enough that nobody has ever asked where the shadow went.

`optimization.ts` in the 3D layer (`3D_ARCHITECTURE.md` §12) carries the LOD and culling helpers
that a real GLB in AR will want — `lodDistances('low')` returns `[0, 3.2, 5.4]` specifically
because a phone drops to the cheap level sooner. They are seams, not yet wired.

---

## 11. The fallback chain

Read top to bottom. The first row whose condition holds is what the reader gets.

| Condition | What renders |
| --- | --- |
| Capability or asset probe pending | A skeleton at the button's height |
| No declared 3D asset for this product | Note: the asset has not been published + the caller's 3D entry point |
| Asset declared but the `HEAD` probe fails | Same note. A plan is not a file |
| `mode === 'none'` | Note: not available on this device, **with `capability.reason`** + the 3D entry point |
| `mode === 'webxr'` | The in-page session |
| WebXR `requestSession` throws | The mapped `DOMException` message + **Try again** — the 3D view is still on the page behind it |
| `mode === 'scene-viewer'` or `'quick-look'` | The `<model-viewer>` sheet, auto-activating the hand-off |
| The `@google/model-viewer` import fails | `ViewerFallback` gallery + "The augmented reality view could not be loaded" |
| `<model-viewer>` fires `error` | Same |
| The hand-off misses its activation window | The element's own AR control, still on screen. One more tap |

Below all of that sits the 3D layer's own chain (`3D_ARCHITECTURE.md` §14), which ends at the
2D gallery: every angle from the catalogue, the same annotated hotspots, keyboard navigation,
`.jpg` twins for every `.webp`.

**The bottom of the ladder is a complete product view, not an apology.** There is no state in
which a reader who cannot run AR is left with less information than one who can — they are left
with the same information, presented differently.

---

## 12. Analytics

Two events, and the pairing is the metric.

```ts
| { name: 'ar_clicked'; props: { productId; mode: 'webxr'|'scene-viewer'|'quick-look'|'none' } }
| { name: 'ar_session'; props: { productId; mode: 'webxr'|'scene-viewer'|'quick-look';
                                 action: 'start'|'place'|'end' } }
```

- **`ar_clicked`** is the intent — the reader asked. It carries the mode that *would* be taken,
  so the drop-off can be read per runtime.
- **`ar_session`** is what actually happened. `start` when a session opens, `place` when the
  product is fixed to a surface, `end` when it closes.

`ar_clicked` without a matching `ar_session { action: 'start' }` is a hand-off that failed —
which is exactly the number worth watching, because it is invisible in the UI. A Scene Viewer
intent that never resolves looks, from the page, like a reader who changed their mind.

`ARButton` also fires the coarse `3d_interaction { action: 'fullscreen' }`, because leaving the
page for a full-bleed view of the product is what `fullscreen` means everywhere else on the site.
The funnel reads one event, the AR work reads the other, and neither has to be reconstructed
from the other's shape.

**The taxonomy in `@/lib/analytics` is a closed union.** Adding an AR event means adding it to
the type; there is no free-form `track(string, object)` to reach for.

---

## 13. Headers — what AR needs that the site does not send

This is the one place where the AR layer is currently blocked by the site's own configuration,
and it is a deliberate posture rather than an oversight.

`next.config.ts` sends:

```
Permissions-Policy: … camera=(), … xr-spatial-tracking=()
```

| Directive | Effect on AR |
| --- | --- |
| `xr-spatial-tracking=()` | **WebXR is denied at the document level.** `navigator.xr.isSessionSupported('immersive-ar')` cannot succeed, and `<model-viewer>`'s own `webxr` ar-mode is equally blocked |
| `camera=()` | Denies `getUserMedia`. WebXR's camera pass-through is governed by `xr-spatial-tracking`, not this, but any future in-page camera feature needs it |

**What still works today, unchanged:** Scene Viewer and Quick Look. Both are hand-offs to a
native application — the page navigates away and the OS takes over — so no page permission is
involved. On Android the detector reports `scene-viewer`; on iOS, `quick-look`; and the
`<model-viewer>` path serves both.

**What does not:** `WebXRExperience.tsx` is complete and correct, and is unreachable in
production as configured. The detector says so honestly — *"This site withholds the
xr-spatial-tracking permission, so WebXR cannot start here"* — which is the behaviour §2
describes, working as intended.

### Enabling in-page WebXR

One token:

```diff
- 'xr-spatial-tracking=()',
+ 'xr-spatial-tracking=(self)',
```

Treat it as a decision, not a fix. It widens the permission surface of **every page on the
site**, not just `/ar/[slug]`, because the policy is set on `/:path*`. If that is not wanted, set
it per-path: a second `headers()` entry scoped to `/ar/:path*` grants the permission only where
the feature lives, and leaves the rest of the storefront denying it.

Nothing else in the CSP needs to change for AR. `worker-src blob:` and `child-src blob:` are
already present for the 3D layer's decoders (`3D_ARCHITECTURE.md` §15), `media-src 'self' blob:
data:` covers the model fetch, and `connect-src 'self'` covers the `HEAD` probes. Scene Viewer's
`intent://` navigation is not a fetch and is not governed by CSP.

> **If a GLB is ever served from Supabase storage rather than `/public`**, add the bucket origin
> to `connect-src` — `remotePatterns` in `next.config.ts` covers `next/image`, not `fetch`.

---

## 14. Testing, per platform

There is no substitute for real hardware. AR is the one part of this codebase where a desktop
browser cannot tell you whether it works.

### Android — Scene Viewer (the default path today)

**Requirements:** Chrome, Google Play Services for AR (ARCore) installed and up to date, an
ARCore-supported device, HTTPS.

1. Deploy to a preview URL, or expose `localhost` over HTTPS (`ngrok http 3000`). **A plain-HTTP
   origin fails the secure-context check before anything else runs.**
2. Open `/ar/meridian-carry-shell`.
3. Confirm the button reads *View in your space* and, with `showMode`, reports **Scene Viewer**.
4. Tap. Scene Viewer should open in a native surface.
5. Place on a floor. **Measure it.** The shell should stand 0.84 m crown to hem — a tape measure
   against the placed model is the actual test of §5, and it is the only one that matters.
6. Return to the browser. Confirm the sheet is still there and closes cleanly.

### Android — WebXR

Only after §13 has been changed. With `xr-spatial-tracking=(self)`:

1. `chrome://flags` needs nothing on a current Chrome; ARCore does the work.
2. The detector should now report **WebXR**, and the launch should stay on the page.
3. Move the phone until the reticle appears — *"Move your phone to find a surface"* should become
   *"Tap to place"*.
4. Tap the floor, or press **Place**. Confirm **the overlay buttons do not also plant the
   product** — that is the `beforexrselect` guard (§6), and its absence is the classic symptom.
5. Press **Reset**, then **Exit**. Confirm the page's own 3D viewer returns.
6. Background the app mid-session and return. The session should end cleanly rather than leak.

### iOS — Quick Look

**Requirements:** iOS 12+, an A9 device or later. Every iOS browser is WebKit, so Chrome and
Firefox on iOS behave identically to Safari.

1. Open `/ar/meridian-carry-shell` in Safari.
2. Confirm the button appears and reports **Quick Look**.
3. Tap. AR Quick Look opens.
4. **Verify the size against a real object.** Quick Look reads the USDZ's own units, not
   `ar-scale`; a mis-authored USDZ is the single most likely scale failure and it looks
   completely convincing until you stand next to it.
5. Test **without** a published `.usdz` too, to exercise the on-the-fly conversion path, then
   with one, and compare fidelity.
6. On an **iPad**: confirm the desktop-agent detection (§2) still reports iOS and not desktop.

### Desktop

1. Chrome, Firefox and Safari on macOS and Windows should all show **no AR button** and the
   note: *"Desktop browsers have no camera pass-through to place a product in."*
2. The 3D entry point must still be present. AR being unavailable never removes the viewer.

### Deliberately hostile cases

| Case | Expected |
| --- | --- |
| `/ar/bearing-cap` (no declared model) | The "3D asset has not been published" note, not a broken button |
| Any product, no GLB in `public/models/` | Same. **This is the state of the repository today** |
| Camera permission declined | *"Camera access was declined…"* and the 3D view still reachable |
| Airplane mode after page load | The probes fail closed; the note appears rather than a hanging button |
| Firefox for Android | No AR. It has no Scene Viewer hand-off and is excluded explicitly |
| An in-app browser (Instagram, LinkedIn) | Usually no AR. Confirm the note is what appears, not a button that does nothing |
| `/ar/nonexistent-slug` | The AR-specific `not-found` page |

### What to instrument during a test round

Watch `ar_clicked` and `ar_session` (§12). The number that matters is `ar_clicked` with no
`ar_session { start }` following it — a hand-off that failed silently, which no amount of
manual testing on your own device will surface.

---

## 15. Current state and what is outstanding

### Built and working

- Capability detection for all three runtimes, with the honesty rule enforced at the component
  level (`ARButton` returns `null`).
- Real-world scale derived from the carry box and the catalogue, with a bad-parse guard.
- A complete WebXR implementation: hit test, reticle, placement, DOM overlay, `beforexrselect`
  guard, retry, three teardown paths, mapped error messages.
- `<model-viewer>` integration for Scene Viewer and Quick Look, lazily loaded, with a failure
  arm that lands on the product plate.
- `/ar/[slug]` with prerendering, metadata, canonical to the product page, JSON-LD and its own
  `not-found`.
- The plate → 3D → AR ladder in `ARStage`, including freeing the page's WebGL context when AR
  opens.

### Outstanding, in the order it will bite

1. **There is no GLB.** `public/models/` is empty by design (`3D_ARCHITECTURE.md` §6). The
   procedural shell is a WebGL scene, not a file — it cannot be handed to Scene Viewer or Quick
   Look, both of which take a *URL*. So **the two native hand-offs cannot work at all until an
   asset ships**, and the launcher correctly says so. The in-page WebXR path is the only one that
   could render the procedural shell, and it is the one the headers currently deny.
2. **`xr-spatial-tracking=()`** (§13). One token, and a decision about scope.
3. **No USDZ twin.** Until one exists, iOS goes through Google's on-the-fly conversion (§8).
4. **`ar_enabled`, `usdz_url` and `real_world_dimensions` are in the schema but not in the read
   model.** The launcher derives the USDZ path by convention and probes for it. Surfacing those
   columns through `src/lib/repo/products.ts` and `ProductModel3D` turns a convention into
   configuration and lets a product be marked AR-ready per platform.
5. **No AR entry point on `/product/[slug]`.** `ARProductLauncher` is mounted only on
   `/ar/[slug]` today. Adding it to the product page is a one-line import — the component
   handles its own capability, asset probe, note and fallback — but it is a deliberate placement
   decision about where in that page it belongs, not a wiring oversight to fix blindly.
6. **The LOD and culling seams in `optimization.ts` are unused.** They exist for the first real
   GLB, and AR is where they will pay (§10).

### The rule that survives all of it

**Never offer what the device cannot honour.** Every gap above is currently expressed to the
reader as a specific sentence rather than a broken control, and that is the property to preserve
when they are closed.

---

<div align="center">

**Detect, then offer. Never the other way round.**

`3D_ARCHITECTURE.md` · `DEPLOYMENT.md` · `ARCHITECTURE.md` · `public/models/README.md`

</div>
