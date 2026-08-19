import { writeFileSync } from 'node:fs';
import { wordmark, GLYPHS } from './wordmark.mjs';
const INK='#0B0C0B', IVORY='#F4F1EA';
const wm = wordmark('VAYRO');
const tight = wordmark('VAYRO', { track: 8 });
const wide  = wordmark('VAYRO', { track: 26 });

const show = (w, label) => `<figure class="row"><svg viewBox="0 -6 ${w.width} 112" width="100%"><g fill="${INK}">${w.svg}</g></svg><figcaption>${label}</figcaption></figure>`;
const px = (w,h) => `<figure><svg height="${h}" viewBox="0 0 ${wm.width} 100"><g fill="${INK}">${wm.svg}</g></svg><figcaption>${h}px cap</figcaption></figure>`;

writeFileSync(new URL('../.brand-lab/wordmark.html',import.meta.url),
`<!doctype html><meta charset="utf-8"><title>VAYRO — wordmark</title>
<style>body{margin:0;padding:48px;background:${IVORY};color:${INK};font:400 12px/1.5 ui-sans-serif,-apple-system,Inter,sans-serif}
h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 30px;font-weight:600}
h2{font-size:10px;letter-spacing:.28em;text-transform:uppercase;margin:44px 0 14px;opacity:.45;font-weight:600}
.row{margin:0 0 8px;background:#fff;border:1px solid rgba(11,12,11,.1);padding:34px 40px}
.row figcaption{margin-top:20px;font-size:10px;letter-spacing:.18em;opacity:.4;text-transform:uppercase}
.glyphs{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.glyphs figure{margin:0;background:#fff;border:1px solid rgba(11,12,11,.1);padding:24px;text-align:center}
.glyphs svg{width:100%;height:110px}
.glyphs figcaption{margin-top:14px;font-size:10px;letter-spacing:.2em;opacity:.4}
.small{display:flex;align-items:flex-end;gap:34px;background:#fff;border:1px solid rgba(11,12,11,.1);padding:30px 34px;flex-wrap:wrap}
.small figure{margin:0}.small svg{display:block}.small figcaption{padding-top:8px;font-size:9px;opacity:.4;letter-spacing:.12em}
.dark{background:${INK}}.dark .row,.dark .small{background:${INK};border-color:rgba(244,241,234,.16)}
.dark figcaption{color:${IVORY}}</style>
<h1>VAYRO — custom wordmark</h1>
<h2>Glyph construction</h2>
<div class="glyphs">${Object.entries(GLYPHS).map(([k,g])=>`<figure><svg viewBox="-6 -6 ${g.w+12} 112"><path d="${g.d}" fill="${INK}" /></svg><figcaption>${k} · ${g.w}u</figcaption></figure>`).join('')}</div>
<h2>Tracking</h2>
${show(tight,'tight — 8u')}${show(wm,'default — 17u')}${show(wide,'wide — 26u')}
<h2>Small sizes</h2>
<div class="small">${[10,12,14,18,24,36].map(h=>px(wm,h)).join('')}</div>
<div class="dark"><h2 style="color:${IVORY}">Reversed</h2>
<figure class="row"><svg viewBox="0 -6 ${wm.width} 112" width="100%"><g fill="${IVORY}">${wm.svg}</g></svg><figcaption style="color:${IVORY}">ivory on ink</figcaption></figure></div>`);
console.log('width', wm.width.toFixed(1));
