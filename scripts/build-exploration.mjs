import { writeFileSync, mkdirSync } from 'node:fs';
import { centred, foldPlanes } from './mark-geometry.mjs';

const M = centred();
const F = foldPlanes();

const INK = '#0B0C0B';
const IVORY = '#F4F1EA';

const concepts = [
  { id: 'A', name: 'Forward V — Vector',
    note: 'Two directional paths. Right arm ascends further: the way forward.',
    svg: `<path d="M14 24L50 82L94 12" fill="none" stroke="${INK}" stroke-width="14" stroke-linejoin="miter" stroke-linecap="butt"/>` },
  { id: 'B', name: 'Fold V — Two Planes',
    note: 'One ribbon folded on itself. Tonal split reads as a crease.',
    svg: `<path d="${F.left}" fill="${INK}"/><path d="${F.right}" fill="${INK}" opacity="0.55"/>` },
  { id: 'C', name: 'Trail V — Switchback',
    note: 'A route ascending terrain. Rich, but breaks down below 32px.',
    svg: `<path d="M14 18L40 52L28 60L52 86L90 16" fill="none" stroke="${INK}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"/>` },
  { id: 'D', name: 'Horizon V — Terrain',
    note: 'Chevron cut by a horizon. Legible, but the rule reads as a strikethrough.',
    svg: `<mask id="hm"><rect width="100" height="100" fill="#fff"/><rect x="0" y="40" width="100" height="7" fill="#000"/></mask>
          <path d="${M.d}" fill="${INK}" mask="url(#hm)"/><rect x="2" y="42.2" width="96" height="2.6" fill="${INK}"/>` },
  { id: 'E', name: 'Motion V — Velocity',
    note: 'Repetition implies speed. Reads as three marks, not one.',
    svg: `<g fill="none" stroke="${INK}" stroke-linecap="butt">
            <path d="M20 30L50 78L86 18" stroke-width="12"/>
            <path d="M8 34L38 82L74 22" stroke-width="6" opacity="0.42"/>
            <path d="M0 38L26 84" stroke-width="3" opacity="0.2"/>
          </g>` },
];

const scales = [16, 24, 32, 48, 96, 180];

const card = (c) => `
  <figure class="card">
    <div class="stage"><svg viewBox="0 0 100 100">${c.svg}</svg></div>
    <figcaption><b>${c.id}</b> ${c.name}<span>${c.note}</span></figcaption>
  </figure>`;

const html = `<!doctype html><meta charset="utf-8"><title>VAYRO — mark exploration</title>
<style>
  :root{--ink:${INK};--ivory:${IVORY}}
  *{box-sizing:border-box}
  body{margin:0;padding:48px;background:var(--ivory);color:var(--ink);
       font:400 13px/1.5 ui-sans-serif,-apple-system,Inter,Helvetica,sans-serif}
  h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 4px;font-weight:600}
  p.sub{margin:0 0 40px;opacity:.55;font-size:12px;letter-spacing:.06em}
  h2{font-size:11px;letter-spacing:.28em;text-transform:uppercase;margin:56px 0 20px;opacity:.5;font-weight:600}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
  .card{margin:0;background:#fff;border:1px solid rgba(11,12,11,.1)}
  .stage{aspect-ratio:1;display:grid;place-items:center;padding:22%}
  .stage svg{width:100%;height:100%;display:block}
  figcaption{border-top:1px solid rgba(11,12,11,.1);padding:12px 14px;font-size:11px;letter-spacing:.04em}
  figcaption b{letter-spacing:.2em;margin-right:8px}
  figcaption span{display:block;opacity:.5;margin-top:5px;font-size:10.5px;line-height:1.45}
  .scales{display:flex;align-items:flex-end;gap:34px;background:#fff;border:1px solid rgba(11,12,11,.1);padding:34px 30px}
  .scales figure{margin:0;text-align:center}
  .scales svg{display:block}
  .scales figcaption{border:0;padding:8px 0 0;opacity:.45;font-size:10px;letter-spacing:.16em}
  .invert{background:var(--ink)}
  .invert .scales{background:${INK};border-color:rgba(244,241,234,.15)}
  .invert figcaption{color:${IVORY}}
</style>
<h1>VAYRO — Symbol Exploration</h1>
<p class="sub">Five directions, one grid. 100×100 units.</p>
<div class="grid">${concepts.map(card).join('')}</div>

<h2>Selected direction — The Vector</h2>
<div class="grid">
  <figure class="card"><div class="stage"><svg viewBox="0 0 100 100"><path d="${M.d}" fill="${INK}"/></svg></div>
    <figcaption><b>F</b> The Vector<span>Asymmetric chevron. Chamfered vertex (fold seam). Flat-bottomed counter.</span></figcaption></figure>
  <figure class="card"><div class="stage" style="background:${INK}"><svg viewBox="0 0 100 100"><path d="${M.d}" fill="${IVORY}"/></svg></div>
    <figcaption><b>F</b> Reversed<span>Ivory on near-black.</span></figcaption></figure>
  <figure class="card"><div class="stage"><svg viewBox="0 0 100 100"><path d="${F.left}" fill="${INK}"/><path d="${F.right}" fill="${INK}" opacity="0.5"/></svg></div>
    <figcaption><b>F</b> Fold expression<span>Extension only. Never the primary mark.</span></figcaption></figure>
</div>

<h2>Scale test — light</h2>
<div class="scales">
  ${scales.map((s) => `<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${M.d}" fill="${INK}"/></svg><figcaption>${s}px</figcaption></figure>`).join('')}
</div>
<div class="invert"><h2 style="color:${IVORY}">Scale test — dark</h2>
<div class="scales">
  ${scales.map((s) => `<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${M.d}" fill="${IVORY}"/></svg><figcaption>${s}px</figcaption></figure>`).join('')}
</div></div>
`;

mkdirSync(new URL('../.brand-lab/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.brand-lab/exploration.html', import.meta.url), html);
console.log('wrote .brand-lab/exploration.html');
