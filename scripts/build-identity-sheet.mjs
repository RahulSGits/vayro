/** Renders the complete VAYRO identity as a single self-contained page.
 *  `node scripts/build-identity-sheet.mjs --inline` embeds every raster as a
 *  data URI so the page can be published standalone. */
import { writeFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as B from './brand.mjs';

const INLINE = process.argv.includes('--inline');

/* The brand book must render in the brand's own typefaces. next/font has
   already fetched and subset them; embed those exact files as data URIs so the
   page is self-contained and cannot silently fall back. */
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const FONT_FILES = {
  display: 'a2947afc6a06879b-s.1gyfqm5yhhzs7.woff2',   // Archivo variable
  sans:    '2c55a0e60120577a-s.0-dom-5bn10r2.woff2',   // Inter variable
  mono:    'e390973e931a41c5-s.0rgnxg2b64rzs.woff2',   // IBM Plex Mono 400
};
function findFont(name) {
  const roots = [fileURLToPath(new URL('../.next/', import.meta.url))];
  const walk = (dir) => {
    let hit = null;
    for (const e of readdirSync(dir)) {
      const full = join(dir, e);
      if (hit) break;
      if (statSync(full).isDirectory()) hit = walk(full);
      else if (e === name) hit = full;
    }
    return hit;
  };
  for (const r of roots) { try { const f = walk(r); if (f) return f; } catch {} }
  return null;
}
const fontFace = (family, key, weightRange, style = 'normal') => {
  const path = findFont(FONT_FILES[key]);
  if (!path) return '';
  const b64 = readFileSync(path).toString('base64');
  return `@font-face{font-family:'${family}';font-style:${style};font-weight:${weightRange};`
       + `font-display:swap;src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
};
const FONTS = [
  fontFace('Archivo', 'display', '100 900'),
  fontFace('InterVar', 'sans', '100 900'),
  fontFace('PlexMono', 'mono', '400'),
].join('');
const APP = fileURLToPath(new URL('../public/brand/applications/', import.meta.url));
const MEDIA = fileURLToPath(new URL('../public/media/', import.meta.url));

const img = (dir, name, ext = 'jpg') => {
  if (!INLINE) return `/${dir === APP ? 'brand/applications' : 'media'}/${name}.${ext}`;
  const b = readFileSync(`${dir}${name}.${ext}`);
  return `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${b.toString('base64')}`;
};

const C = B.COLOR;
const sym = (px, fill = 'currentColor') =>
  `<svg viewBox="0 0 100 100" width="${px}" height="${px}" fill="${fill}"><path d="${B.SYMBOL.d}"/></svg>`;
const symMicro = (px, fill = 'currentColor') =>
  `<svg viewBox="0 0 100 100" width="${px}" height="${px}" fill="${fill}"><path d="${B.SYMBOL_MICRO.d}"/></svg>`;
const word = (cap, fill = 'currentColor') =>
  `<svg viewBox="0 0 ${B.WORDMARK.width} ${B.CAP}" height="${cap}" width="${(cap * B.WORDMARK.width) / B.CAP}" fill="${fill}">${B.WORDMARK.svg}</svg>`;
const lockH = (h) => { const l = B.lockupHorizontal();
  return `<svg viewBox="0 0 ${l.width} ${l.height}" height="${h}" fill="currentColor">${l.inner}</svg>`; };
const lockS = (h) => { const l = B.lockupStacked();
  return `<svg viewBox="0 0 ${l.width} ${l.height}" height="${h}" fill="currentColor">${l.inner}</svg>`; };

const CONCEPTS = [
  ['A', 'Forward V', 'Two directional paths.', `<path d="M14 24L50 82L94 12" fill="none" stroke="currentColor" stroke-width="14"/>`],
  ['B', 'Fold V', 'One ribbon, folded.', `<path d="M8 22L44 86L52 76L24 22Z" fill="currentColor"/><path d="M52 76L92 14L74 14L44 86Z" fill="currentColor" opacity=".5"/>`],
  ['C', 'Trail V', 'A route ascending terrain.', `<path d="M14 18L40 52L28 60L52 86L90 16" fill="none" stroke="currentColor" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>`],
  ['D', 'Horizon V', 'Chevron cut by a horizon.', `<mask id="hz"><rect width="100" height="100" fill="#fff"/><rect x="0" y="40" width="100" height="7" fill="#000"/></mask><path d="M8 20L42 86L56 86L92 20L78 20L49 72L22 20Z" fill="currentColor" mask="url(#hz)"/><rect x="2" y="42" width="96" height="2.6" fill="currentColor"/>`],
  ['E', 'Motion V', 'Repetition implies speed.', `<g fill="none" stroke="currentColor"><path d="M20 30L50 78L86 18" stroke-width="12"/><path d="M8 34L38 82L74 22" stroke-width="6" opacity=".42"/></g>`],
];

const SCALES = [16, 24, 32, 48, 96, 180];
const PALETTE = [
  ['VAYRO Black', C.ink, 'Primary. Never pure #000.'],
  ['Ink 80', C.ink80, 'Elevated dark surface.'],
  ['Graphite', C.graphite, 'Secondary structure.'],
  ['Slate', C.slate, 'Muted foreground, light mode.'],
  ['Titanium', C.titanium, 'Subtle foreground.'],
  ['Stone', C.stone, 'Muted foreground, dark mode.'],
  ['Sand', C.sand, 'Warm neutral.'],
  ['Bone', C.bone, 'Sunken light surface.'],
  ['VAYRO Ivory', C.ivory, 'Primary. Warm off-white.'],
  ['Deep Forest', C.forest, 'Accent, light mode.'],
  ['Deep Olive', C.olive, 'Supporting natural tone.'],
  ['Moss', C.moss, 'Supporting natural tone.'],
];

const APPS = [
  ['apparel-chest-mark', 'Chest mark', 'Embroidered, 34 mm. Quiet branding.'],
  ['apparel-sleeve-mark', 'Sleeve mark', 'Micro optical cut.'],
  ['apparel-back-wordmark', 'Back wordmark', 'Restrained, never oversized.'],
  ['apparel-reflective-mark', 'Reflective mark', 'Retroreflective transfer.'],
  ['hardware-zipper-pull', 'Zipper pull', 'Laser mark on anodised alloy.'],
  ['label-woven-neck', 'Neck label', 'Woven, ivory on ink.'],
  ['label-care', 'Care label', 'Technical aesthetic, mono type.'],
  ['packaging-hang-tag', 'Hang tag', 'Stacked lockup, spec line.'],
  ['packaging-product-box', 'Product box', 'Matte ink, debossed mark.'],
  ['packaging-garment-bag', 'Garment bag', 'Minimal lockup.'],
  ['packaging-tissue', 'Tissue paper', 'Contour field, low contrast.'],
  ['packaging-sticker', 'Sticker', 'Compact symbol.'],
];

const html = `<meta charset="utf-8">
<title>VAYRO Identity System</title>
<style>
${FONTS}
:root{--ink:${C.ink};--ivory:${C.ivory};--stone:${C.stone};--graphite:${C.graphite};
      --bg:var(--ivory);--fg:var(--ink);--line:rgba(11,12,11,.13);--muted:rgba(11,12,11,.5)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:var(--ink);--fg:var(--ivory);--line:rgba(244,241,234,.15);--muted:rgba(244,241,234,.55)}}
:root[data-theme="dark"]{--bg:var(--ink);--fg:var(--ivory);--line:rgba(244,241,234,.15);--muted:rgba(244,241,234,.55)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
 font:400 15px/1.7 'InterVar',ui-sans-serif,-apple-system,Helvetica,sans-serif;
 -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:clamp(28px,5vw,72px)}
.lab{font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);font-weight:600}
h1{font-family:'Archivo',ui-sans-serif,sans-serif;font-size:clamp(2.6rem,8vw,5.4rem);
   line-height:.9;letter-spacing:-.045em;font-weight:600;margin:.5rem 0 0;text-wrap:balance}
h2{font-size:11px;letter-spacing:.28em;text-transform:uppercase;font-weight:600;
   margin:0 0 22px;padding-top:22px;border-top:1px solid var(--line)}
h3{font-family:'Archivo',ui-sans-serif,sans-serif;font-size:1.05rem;letter-spacing:-.015em;font-weight:600;margin:0 0 8px}
section{margin-top:clamp(48px,7vw,96px)}
p{margin:0 0 14px;max-width:64ch;color:var(--muted);text-wrap:pretty}
b{font-weight:600;color:var(--fg)}
p.lead{color:var(--fg);font-size:clamp(1.05rem,1.9vw,1.3rem);line-height:1.5;max-width:52ch;letter-spacing:-.012em;text-wrap:pretty}
.grid{display:grid;gap:14px}
.g2{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(3,1fr)}
.g4{grid-template-columns:repeat(4,1fr)}.g5{grid-template-columns:repeat(5,1fr)}
.g6{grid-template-columns:repeat(6,1fr)}
@media(max-width:860px){.g5,.g6,.g4{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.grid{grid-template-columns:1fr!important}}
.card{border:1px solid var(--line);padding:22px}
.stage{aspect-ratio:1;display:grid;place-items:center;padding:20%}
.stage svg{width:100%;height:100%}
.cap{font-size:11px;letter-spacing:.04em;color:var(--muted);margin-top:12px}
.cap b{color:var(--fg);letter-spacing:.14em;margin-right:8px;font-weight:600}
.rowscale{display:flex;align-items:flex-end;gap:clamp(16px,3vw,40px);flex-wrap:wrap;
  border:1px solid var(--line);padding:30px}
.rowscale figure{margin:0;text-align:center}
.rowscale figcaption{font-size:9px;letter-spacing:.14em;color:var(--muted);padding-top:8px}
.swatch{border:1px solid var(--line)}
.swatch .chip{height:88px}
.swatch .meta{padding:12px 14px;font-size:11px;letter-spacing:.03em}
.swatch .meta b{display:block;letter-spacing:.12em;text-transform:uppercase;font-size:10px;margin-bottom:4px}
.swatch .meta code{color:var(--muted);font:400 11px/1 'PlexMono',ui-monospace,monospace;letter-spacing:.04em;text-transform:uppercase}
.swatch .meta span{display:block;color:var(--muted);margin-top:6px;font-size:10.5px}
.dark{background:var(--ink);color:var(--ivory);padding:clamp(24px,4vw,44px);border:1px solid var(--line)}
.light{background:var(--ivory);color:var(--ink);padding:clamp(24px,4vw,44px);border:1px solid var(--line)}
img{width:100%;height:auto;display:block}
figure{margin:0}
.app figcaption{font-size:11px;color:var(--muted);padding:12px 2px 0}
.app figcaption b{display:block;color:var(--fg);letter-spacing:.1em;text-transform:uppercase;font-size:10px;margin-bottom:4px}
.dont{position:relative}
.dont::after{content:"";position:absolute;inset:0;
  background:linear-gradient(to top left,transparent calc(50% - 1px),#C4501E 50%,transparent calc(50% + 1px))}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th,td{text-align:left;padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);font-weight:600}
td code{font:400 11.5px/1.5 'PlexMono',ui-monospace,monospace;color:var(--muted);letter-spacing:.02em}
.spec{font:400 11px/1.5 'PlexMono',ui-monospace,monospace;letter-spacing:.14em;color:var(--muted)}
.tag{display:inline-block;border:1px solid var(--line);padding:5px 9px;font-size:9.5px;
  letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin:0 6px 6px 0}
.clearspace{position:relative;display:inline-block;padding:calc(var(--cs));outline:1px dashed var(--line)}
</style>

<div class="wrap">
<header>
  <div class="lab">Brand identity system</div>
  <h1>VAYRO</h1>
  <p class="lead" style="margin-top:20px">Engineered for the way forward. A premium outdoor and travel
  fashion identity built on one idea: a chevron whose ascending arm turns.</p>
  <div style="margin-top:24px">
    <span class="tag">Movement</span><span class="tag">Precision</span><span class="tag">Freedom</span>
    <span class="tag">Exploration</span><span class="tag">Intelligence</span>
  </div>
</header>

<section>
  <h2>01 — Symbol exploration</h2>
  <p>Five directions were drawn on one 100-unit grid before selection. Each was tested at 16 px and
  reversed on ink. Concepts C, D and E failed the small-size and legibility tests; A and B survived and
  were synthesised.</p>
  <div class="grid g5" style="margin-top:22px">
    ${CONCEPTS.map(([id, name, note, svg]) => `<figure class="card">
      <div class="stage"><svg viewBox="0 0 100 100">${svg}</svg></div>
      <figcaption class="cap"><b>${id}</b>${name}<span style="display:block;margin-top:5px">${note}</span></figcaption>
    </figure>`).join('')}
  </div>
</section>

<section>
  <h2>02 — The Vector — selected direction</h2>
  <p>A single closed chevron. The descending arm splays; the ascending arm rises, <b>turns</b> at the
  golden section, and finishes vertical. That turn is the mark's one event — it reads as a route, a
  change of direction, the way forward — and it is what stops the symbol reading as the letter V.</p>
  <p>Every corner in the system is chamfered: the vertex, the counter apex, the shoulder. Nothing in
  VAYRO comes to a point. This is a fold seam, it is embroidery-safe, and it makes the form read as
  engineered hardware rather than drawn type.</p>
  <div class="grid g3" style="margin-top:22px">
    <figure class="card light"><div class="stage">${sym(200, C.ink)}</div><div class="cap"><b>Primary</b>Ink on ivory</div></figure>
    <figure class="card dark"><div class="stage">${sym(200, C.ivory)}</div><div class="cap" style="color:rgba(244,241,234,.55)"><b style="color:${C.ivory}">Reversed</b>Ivory on ink</div></figure>
    <figure class="card"><div class="stage">${sym(200)}</div><div class="cap"><b>Mono</b>Inherits currentColor</div></figure>
  </div>
</section>

<section>
  <h2>03 — Optical size system</h2>
  <p>Two cuts, one form. The <b>regular</b> cut carries the same stem weight as the wordmark so the two
  read as one family. The <b>micro</b> cut is drawn heavier with a more open counter and is used at
  22 px and below, and for embroidery, hardware and woven labels.</p>
  <div class="grid g2" style="margin-top:22px">
    <div class="rowscale">${SCALES.map((s) => `<figure>${sym(s)}<figcaption>${s}px</figcaption></figure>`).join('')}<div class="cap" style="width:100%"><b>Regular</b>≥ 24 px</div></div>
    <div class="rowscale">${SCALES.map((s) => `<figure>${symMicro(s)}<figcaption>${s}px</figcaption></figure>`).join('')}<div class="cap" style="width:100%"><b>Micro</b>≤ 22 px</div></div>
  </div>
</section>

<section>
  <h2>04 — Wordmark</h2>
  <p>Drawn, not typeset. Geometric caps on a 100-unit cap height with a ${B.STEM}-unit stem. The A and V
  apexes are chamfered to match the symbol, and the O carries a horizontal flat at its base — the same
  seam, applied to a curve. Default tracking is ${B.TRACK} units.</p>
  <div class="card" style="padding:clamp(28px,5vw,56px);margin-top:22px">${word(72)}</div>
  <div class="grid g5" style="margin-top:14px">
    ${Object.entries(B.GLYPHS).map(([k, g]) => `<figure class="card" style="padding:18px">
      <div style="display:grid;place-items:center;height:110px">
        <svg viewBox="-6 -6 ${g.w + 12} 112" height="100"><path d="${g.d}" fill="currentColor"/></svg></div>
      <div class="cap"><b>${k}</b><span class="spec">${g.w}u</span></div></figure>`).join('')}
  </div>
</section>

<section>
  <h2>05 — Lockups</h2>
  <p>The symbol sits at 1.204× the wordmark cap height. At that ratio its stroke weight resolves to
  exactly the wordmark stem and the mark stands 6% above the cap line. Never rescale one element
  independently of the other.</p>
  <div class="grid g2" style="margin-top:22px">
    <div class="card light" style="display:grid;place-items:center;padding:52px 32px">${lockH(58)}</div>
    <div class="card dark" style="display:grid;place-items:center;padding:52px 32px">${lockH(58)}</div>
    <div class="card light" style="display:grid;place-items:center;padding:52px 32px">${lockS(150)}</div>
    <div class="card dark" style="display:grid;place-items:center;padding:52px 32px">${lockS(150)}</div>
  </div>
  <p style="margin-top:18px"><b>Clear space</b> — minimum on all sides equals 0.28× the symbol height.
  <b>Minimum sizes</b> — symbol 16 px (micro cut) / 8 mm embroidered; horizontal lockup 96 px wide;
  stacked lockup 64 px wide.</p>
</section>

<section>
  <h2>06 — Incorrect usage</h2>
  <div class="grid g4" style="margin-top:22px">
    ${[
      ['Do not rotate', `<g transform="rotate(20 50 50)">${sym(120)}</g>`],
      ['Do not stretch', `<g transform="translate(0 12) scale(1 0.72)">${sym(120)}</g>`],
      ['Do not outline', `<svg viewBox="0 0 100 100" width="120" height="120"><path d="${B.SYMBOL.d}" fill="none" stroke="currentColor" stroke-width="3"/></svg>`],
      ['Do not add effects', `<g opacity=".45">${sym(120)}</g>`],
    ].map(([label, art]) => `<figure class="card"><div class="stage dont"><svg viewBox="0 0 130 130" width="100%">${typeof art === 'string' && art.startsWith('<svg') ? art : `<g transform="translate(5 5)">${art}</g>`}</svg></div><div class="cap"><b>×</b>${label}</div></figure>`).join('')}
  </div>
</section>

<section>
  <h2>07 — Colour</h2>
  <p>Two primaries carry the identity. Everything else is a restrained natural tone. There is no bright
  accent — the brand is never a neon sportswear company.</p>
  <div class="grid g4" style="margin-top:22px">
    ${PALETTE.map(([name, hex, note]) => `<div class="swatch">
      <div class="chip" style="background:${hex}"></div>
      <div class="meta"><b>${name}</b><code>${hex}</code><span>${note}</span></div></div>`).join('')}
  </div>
</section>

<section>
  <h2>08 — Typography</h2>
  <table>
    <tr><th>Role</th><th>Face</th><th>Use</th><th>Tracking</th></tr>
    <tr><td><b>Display</b></td><td>Archivo 500/600</td><td>Hero headlines, campaign, editorial</td><td><code>-0.04em → -0.02em</code></td></tr>
    <tr><td><b>Primary sans</b></td><td>Inter 400/500/600</td><td>Navigation, body, product info, UI</td><td><code>-0.006em → 0</code></td></tr>
    <tr><td><b>Technical</b></td><td>IBM Plex Mono 400/500</td><td>Specs, measurements, SKUs, labels</td><td><code>0.06em</code></td></tr>
    <tr><td><b>Label</b></td><td>Inter 500, uppercase</td><td>Eyebrows, buttons, metadata</td><td><code>0.22em</code></td></tr>
  </table>
</section>

<section>
  <h2>09 — Pattern</h2>
  <p>The contour field: repeated chevron topography derived from the symbol's geometry. It never exceeds
  14% opacity and never competes with product.</p>
  <div class="grid g2" style="margin-top:22px">
    <figure><img src="${img(APP, 'packaging-tissue')}" alt="Contour pattern on tissue paper"></figure>
    <figure><img src="${img(MEDIA, 'material-ripstop')}" alt="Ripstop material macro"></figure>
  </div>
</section>

<section>
  <h2>10 — Applications</h2>
  <p>Quiet branding over large logos. The mark must be recognisable without being oversized.</p>
  <div class="grid g3 app" style="margin-top:22px">
    ${APPS.map(([file, title, note]) => `<figure>
      <img src="${img(APP, file)}" alt="${title}" loading="lazy">
      <figcaption><b>${title}</b>${note}</figcaption></figure>`).join('')}
  </div>
</section>

<section>
  <h2>11 — Voice</h2>
  <div class="grid g2" style="margin-top:22px">
    <div class="card"><h3>We say</h3>
      <p style="color:var(--fg)">"One layer. Every destination."<br>"Engineered for lighter travel."<br>
      "Built for the unexpected."<br>"Wear it. Pack it. Carry it."</p></div>
    <div class="card"><h3>We never say</h3>
      <p>"Elevate your lifestyle."<br>"Take your adventure to the next level."<br>
      "Premium high-quality fabric."<br>Unsupported claims — waterproof, sustainable, weatherproof.</p></div>
  </div>
</section>

<footer style="margin-top:clamp(56px,8vw,110px);padding-top:26px;border-top:1px solid var(--line)">
  <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap">
    ${lockH(26)}
    <div class="spec">ENGINEERED FOR THE WAY FORWARD</div>
  </div>
</footer>
</div>`;

/* Encode every non-ASCII glyph as a numeric entity so the page renders
   correctly regardless of the charset the host declares. */
const encoded = html.replace(/[\u0080-\uFFFF]/g, (c) => `&#${c.codePointAt(0)};`);

const out = INLINE ? '../.brand-lab/identity-inline.html' : '../.brand-lab/identity.html';
writeFileSync(new URL(out, import.meta.url), encoded);
console.log('wrote', out.replace('../', ''), INLINE ? '(assets inlined)' : '');
