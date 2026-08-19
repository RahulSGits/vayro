# 3D assets — the Meridian Carry Shell

This directory is empty on purpose. Until a real asset lands here, the viewer
renders a **procedural shell** built from revolved and swept geometry in
`src/components/three/geometry.ts`. It is a finished shape, not a placeholder
box, and the site ships with it.

The moment `meridian-shell.glb` exists at this path, it is used instead — no
code change, no flag, no deploy coupling.

---

## The swap

`loadJacketGLB()` in `src/components/three/JacketModel.tsx` issues a `HEAD`
request for `/models/meridian-shell.glb` on first mount.

| Result | What renders |
| --- | --- |
| 200, non-HTML, > 1 KB | The GLB, loaded with `useGLTF` + `DRACOLoader` |
| 404 / HTML / empty | The procedural shell |
| Load or parse failure | The procedural shell (error boundary catch) |

The probe result is cached for the session, and a hit immediately warms the
GLTF cache so the swap costs one request, not two.

To force the procedural shell for a comparison, pass `modelUrl={null}` to
`<JacketModel />`.

---

## What the file must contain

### Scale and orientation

| Property | Value |
| --- | --- |
| Units | 1 unit ≈ 62 cm. The shell is **2.1 units** tall, hood crown to hem. |
| Up axis | +Y |
| Facing | The shell faces **+Z** (front placket toward the camera at rest) |
| Origin | World origin at the mid-chest, on the vertical centreline |
| Shoulders | y ≈ 0.73 |
| Hood crown | y ≈ 1.30 |
| Hem | y ≈ −0.81 |
| Half width | x ≈ ±0.45 at the chest, ±0.56 at the cuffs |
| Half depth | z ≈ ±0.27 at the chest |

Apply all transforms before export. Every node must have an identity transform
with its geometry baked, except where the motion table below animates it — the
viewer writes `position`, `quaternion` and `scale` on those nodes every frame,
so any authored transform on them is treated as the rest pose and preserved.

### Node names

The viewer's motion table (`jacketPartMotion()` in `geometry.ts`) is keyed by
node name. Any node named below inherits the exploded-view offset, the fold
choreography and the carry-state fade, for free. Nodes with other names still
render — they simply do not animate.

```
shell_body             torso, shoulders, closed at the crown
shell_yoke_seam        hairline ring at the shoulder panel seam
shell_collar           collar stand
shell_sleeve_r         right sleeve      shell_sleeve_l   left sleeve
shell_armhole_r        right armhole     shell_armhole_l  left armhole
shell_cuff_r           right cuff        shell_cuff_l     left cuff
shell_hood             hood outer
hood_lining            hood interior (the carry cavity)
hood_rim               bound edge of the hood opening
shell_placket          front placket
shell_pocket_r         right hand pocket shell_pocket_l   left hand pocket
detail_welt_r          right welt        detail_welt_l    left welt
shell_hem              hem band
hardware_zip           main zip run
hardware_zip_pull      anodised pull
hardware_cord_r        right cord tip    hardware_cord_l  left cord tip
detail_chest_label     woven chest label
carry_strap            shoulder webbing  ) carry state only —
carry_buckle           ladder lock       ) these fade in as the
carry_zip              perimeter zip     ) fold completes
carry_tag              carry tag         )
```

### Materials

Name materials so the colourway system can find the shell:

- Any material or mesh whose name matches `/shell|body|sleeve|hood|placket|pocket/i`
  is treated as **shell** — its base colour is replaced by the selected
  colourway and its roughness/metalness by the selected finish.
- Everything else keeps its authored material and is left alone.

Use `MeshStandardMaterial`-compatible PBR (glTF metallic-roughness). The fold
shader is injected into whatever arrives, so unlit or custom materials will not
carry the transformation.

Keep textures ≤ 2048², KTX2/Basis preferred. The procedural shell ships no
textures at all — if the GLB is heavier than ~2.5 MB it is worth asking whether
the extra fidelity is visible at the framing the viewer actually uses.

### The fold

Two options, in order of preference:

1. **Author it.** Add a morph target named exactly `pack` to any mesh that
   should fold, taking the worn shape to the packed shape. The viewer drives
   that influence from 0 to 1 and disables its own fold for that mesh. This is
   the better result — a modelled fold beats a mathematical one.
2. **Let the shader do it.** Ship no morph target and the vertex shader
   collapses the mesh into the carry box (see `materials.ts`). It is
   convincing, and it is what the procedural shell uses today.

The carry box is fixed by the catalogue spec — 24 × 16 × 9 cm, i.e. half
extents `[0.30, 0.20, 0.1125]` in model units, centred on the origin, corner
radius `0.05`. Author the packed shape inside that volume.

### Hotspot anchors

Add an empty per catalogue hotspot, named `anchor_<hotspot id>`:

```
anchor_h1   carry cavity        [ 0.00,  1.15,  0.18 ]
anchor_h2   load webbing        [-0.42,  0.40,  0.22 ]
anchor_h3   gusseted underarm   [ 0.50,  0.55,  0.10 ]
anchor_h4   hand pockets        [-0.34, -0.10,  0.28 ]
anchor_h5   hem drawcord        [ 0.00, -0.62,  0.24 ]
```

These coordinates come from `hotspots[].anchor3d` in `src/data/catalog.ts` (and
from the `hotspots` table in Supabase once it is populated). If the model moves,
move the catalogue values with it — the catalogue is the source of truth and
the annotation markers read from it, not from the file.

---

## Export

### Blender

1. Apply all modifiers, transforms and scale (`Ctrl+A → All Transforms`).
2. Rename objects to the table above. Blender's `.001` suffixes will break the
   match — check for them.
3. Triangulate. Limit to ~120 k triangles for the whole shell.
4. `File → Export → glTF 2.0 (.glb)`:
   - Format: **glTF Binary (.glb)**
   - Include: Selected Objects, Custom Properties
   - Transform: **+Y Up**
   - Geometry: Apply Modifiers, UVs, Normals, Tangents (if normal-mapped)
   - Compression: leave **off** — Draco is applied in the next step, with
     better control
   - Shape Keys: **on**, if you authored the `pack` morph target
5. Save as `meridian-shell.glb`.

### Draco compression

```bash
npx @gltf-transform/cli optimize \
  meridian-shell.raw.glb \
  meridian-shell.glb \
  --compress draco \
  --texture-compress ktx2 \
  --simplify false
```

Or with `gltfpack`:

```bash
npx gltfpack -i meridian-shell.raw.glb -o meridian-shell.glb -cc -tc
```

Verify the result loads before committing:

```bash
npx @gltf-transform/cli inspect meridian-shell.glb
```

### Draco decoders

`useGLTF` is configured with a decoder path of `/draco/`. Draco-compressed
files need those decoders self-hosted — the site loads no third-party scripts.

```bash
mkdir -p public/draco
cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/
```

That copies `draco_decoder.js`, `draco_decoder.wasm`, `draco_wasm_wrapper.js`
(and the encoder, which can be deleted). If the model is **not** Draco
compressed the decoder is never fetched, and this step can be skipped.

---

## Where files go

```
public/models/
  meridian-shell.glb            default viewer + hero + transformation
  meridian-transformation.glb   optional, only if the fold needs its own rig
  meridian-exploded.glb         optional, only if the exploded view needs one
public/draco/
  draco_decoder.js
  draco_decoder.wasm
  draco_wasm_wrapper.js
```

The catalogue already declares all three paths in `products[].models` with
`placeholder: true`. Flip that flag when a real asset replaces one, so the
admin surfaces stop reporting the model as outstanding.

Only `meridian-shell.glb` is wired up today; the other two are read by the
catalogue but not yet loaded by the viewer, because the single shell drives all
three modes through the motion table.

---

## Checklist before committing an asset

- [ ] Loads in <https://gltf-viewer.donmccurdy.com> without warnings
- [ ] Under 2.5 MB, Draco compressed
- [ ] Faces +Z, +Y up, 2.1 units tall, centred on the origin
- [ ] Node names match the table exactly, no `.001` suffixes
- [ ] Shell materials named so the colourway regex matches
- [ ] `anchor_h1`…`anchor_h5` present and positioned on the catalogue values
- [ ] `pack` morph target present, or the shape is happy folding by shader
- [ ] Decoders copied to `public/draco/` if compressed
- [ ] Hero, product viewer and the transformation section all checked after the
      swap — all three read the same file
