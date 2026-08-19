import { writeFileSync } from 'node:fs';
import { offsetOutline, fitPath } from './outline.mjs';
const INK='#0B0C0B', IVORY='#F4F1EA';

// centreline: A(top-left) -> B(vertex) -> C(kink) -> D(top-right)
const mk = ({ ax=20, ay=20, bx=50, by=84, kinkY=null, leg1=0.55, leg2=0.15, dy=14, w=17, ch=6, chKink=0 }) => {
  const pts = [[ax,ay],[bx,by]];
  const chamfer = { 1: ch };
  if (kinkY !== null) {
    const cx = bx + leg1*(by-kinkY);
    pts.push([cx, kinkY]);
    pts.push([cx + leg2*(kinkY-dy), dy]);
    if (chKink) chamfer[2] = chKink;
  } else {
    pts.push([bx + leg1*(by-dy), dy]);
  }
  return fitPath(offsetOutline(pts, w, { chamfer }), { box:100, pad:7 });
};

const V = [
 {n:'V1', t:'Control — no turn',        o: mk({ kinkY:null, leg1:0.5, w:17, ch:6 })},
 {n:'V2', t:'Turn @46 — steepen',       o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:17, ch:6 })},
 {n:'V3', t:'Turn @46 — flare',         o: mk({ kinkY:46, leg1:0.35, leg2:0.9,  w:17, ch:6 })},
 {n:'V4', t:'Turn @58 — steepen',       o: mk({ kinkY:58, leg1:0.6,  leg2:0.18, w:17, ch:6 })},
 {n:'V5', t:'Turn @34 — steepen',       o: mk({ kinkY:34, leg1:0.5,  leg2:0.12, w:17, ch:6 })},
 {n:'V6', t:'Turn @46 — seam at turn',  o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:17, ch:6, chKink:5 })},
 {n:'V7', t:'Turn @46 — heavy w19',     o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:19, ch:7 })},
 {n:'V8', t:'Turn @46 — light w14',     o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:14, ch:5 })},
 {n:'V9', t:'Turn @46 — wide stance',   o: mk({ ax:14, kinkY:46, leg1:0.7, leg2:0.2, w:17, ch:6 })},
 {n:'V10',t:'Turn @46 — no chamfer',    o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:17, ch:0 })},
 {n:'V11',t:'Turn @50 — long ascent',   o: mk({ ay:26, kinkY:50, leg1:0.55, leg2:0.13, dy:8, w:17, ch:6 })},
 {n:'V12',t:'Turn @46 — deep chamfer',  o: mk({ kinkY:46, leg1:0.55, leg2:0.15, w:17, ch:9 })},
];

const row=(d,bg,fg)=>`<div class="sc" style="background:${bg}">${[16,20,32,64].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${d}" fill="${fg}"/></svg><figcaption style="color:${fg}">${s}</figcaption></figure>`).join('')}</div>`;

writeFileSync(new URL('../.brand-lab/round4.html',import.meta.url),
`<!doctype html><meta charset="utf-8"><title>VAYRO — refinement</title>
<style>body{margin:0;padding:40px;background:${IVORY};color:${INK};font:400 12px/1.5 ui-sans-serif,-apple-system,Inter,sans-serif}
h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 30px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.card{background:#fff;border:1px solid rgba(11,12,11,.1);margin:0}
.stage{aspect-ratio:1.08;display:grid;place-items:center;padding:15%}.stage svg{width:100%;height:100%}
.cap{border-top:1px solid rgba(11,12,11,.1);padding:9px 11px;font-size:10.5px}
.cap b{letter-spacing:.16em;margin-right:6px;opacity:.4}
.sc{display:flex;align-items:flex-end;justify-content:center;gap:15px;padding:12px 0;border-top:1px solid rgba(11,12,11,.08)}
.sc figure{margin:0;text-align:center}.sc svg{display:block}.sc figcaption{padding-top:4px;opacity:.45;font-size:9px}</style>
<h1>VAYRO — finalist refinement</h1><div class="grid">
${V.map(v=>`<figure class="card"><div class="stage"><svg viewBox="0 0 100 100"><path d="${v.o.d}" fill="${INK}"/></svg></div>
${row(v.o.d,'#fff',INK)}${row(v.o.d,INK,IVORY)}
<figcaption class="cap"><b>${v.n}</b>${v.t}</figcaption></figure>`).join('')}</div>`);
console.log('ok');
