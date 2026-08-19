import { writeFileSync } from 'node:fs';
import { offsetOutline, fitPath } from './outline.mjs';
const INK='#0B0C0B', IVORY='#F4F1EA';
const mk = ({ ax=20, ay=20, bx=50, by=84, kinkY=46, leg1=0.55, leg2=0.15, dy=14, w=17, ch=6, chKink=0 }) => {
  const cx = bx + leg1*(by-kinkY);
  const pts = [[ax,ay],[bx,by],[cx,kinkY],[cx + leg2*(kinkY-dy), dy]];
  const chamfer = { 1: ch }; if (chKink) chamfer[2] = chKink;
  return fitPath(offsetOutline(pts, w, { chamfer }), { box:100, pad:6 });
};
const V=[
 {n:'A', t:'turn 46 · leg2 .15 · ch6 · kink0', o:mk({})},
 {n:'B', t:'turn 46 · leg2 .15 · ch6 · kink5', o:mk({chKink:5})},
 {n:'C', t:'turn 42 · leg2 .12 · ch6 · kink5', o:mk({kinkY:42,leg2:0.12,chKink:5})},
 {n:'D', t:'turn 50 · leg2 .18 · ch6 · kink5', o:mk({kinkY:50,leg2:0.18,chKink:5})},
 {n:'E', t:'turn 46 · leg1 .62 · ch7 · kink5', o:mk({leg1:0.62,ch:7,chKink:5})},
 {n:'F', t:'turn 46 · w18 · ch7 · kink6',      o:mk({w:18,ch:7,chKink:6})},
];
writeFileSync(new URL('../.brand-lab/round5.html',import.meta.url),
`<!doctype html><meta charset="utf-8"><title>VAYRO — lock</title>
<style>body{margin:0;padding:40px;background:${IVORY};color:${INK};font:400 12px/1.5 ui-sans-serif,-apple-system,Inter,sans-serif}
h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 26px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.card{background:#fff;border:1px solid rgba(11,12,11,.1);margin:0}
.stage{aspect-ratio:1;display:grid;place-items:center;padding:11%}.stage svg{width:100%;height:100%}
.sc{display:flex;align-items:flex-end;justify-content:center;gap:18px;padding:14px 0;border-top:1px solid rgba(11,12,11,.08)}
.sc figure{margin:0;text-align:center}.sc svg{display:block}.sc figcaption{padding-top:4px;opacity:.45;font-size:9px}
.cap{border-top:1px solid rgba(11,12,11,.1);padding:9px 11px;font-size:10.5px}.cap b{letter-spacing:.16em;margin-right:6px;opacity:.4}</style>
<h1>VAYRO — lock candidates</h1><div class="grid">
${V.map(v=>`<figure class="card"><div class="stage"><svg viewBox="0 0 100 100"><path d="${v.o.d}" fill="${INK}"/></svg></div>
<div class="sc">${[16,20,28,40].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${v.o.d}" fill="${INK}"/></svg><figcaption>${s}</figcaption></figure>`).join('')}</div>
<div class="sc" style="background:${INK}">${[16,20,28,40].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${v.o.d}" fill="${IVORY}"/></svg><figcaption style="color:${IVORY}">${s}</figcaption></figure>`).join('')}</div>
<figcaption class="cap"><b>${v.n}</b>${v.t}</figcaption></figure>`).join('')}</div>`);
console.log('ok');
