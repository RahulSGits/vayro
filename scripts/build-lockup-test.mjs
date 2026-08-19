import { writeFileSync } from 'node:fs';
import { offsetOutline, fitPath } from './outline.mjs';
import { wordmark, CAP, STEM } from './wordmark.mjs';
const INK='#0B0C0B', IVORY='#F4F1EA';
const WM = wordmark('VAYRO');

const sym = ({ax=20, leg1=0.55, leg2=0.15, kinkY=46, w=11.8}) => {
  const bx=50, by=84, dy=14, cx = bx + leg1*(by-kinkY);
  return fitPath(offsetOutline([[ax,20],[bx,by],[cx,kinkY],[cx+leg2*(kinkY-dy),dy]], w,
    { chamfer:{1:4.5,2:3.5} }), { box:100, pad:6 });
};
const V=[
 {n:'L1 current',        o:sym({})},
 {n:'L2 sharper turn',   o:sym({leg2:0.06})},
 {n:'L3 narrow + sharp', o:sym({ax:26, leg1:0.62, leg2:0.06})},
 {n:'L4 narrow + low turn', o:sym({ax:27, leg1:0.66, leg2:0.04, kinkY:52})},
];
const SC=1.204, GAP=46;
const lock=(o)=>{const symH=CAP*SC; const w=symH+GAP+WM.width;
  return `<svg viewBox="0 0 ${w} ${symH}" width="100%"><g fill="${INK}">
   <g transform="scale(${symH/100})"><path d="${o.d}"/></g>
   <g transform="translate(${symH+GAP} ${(symH-CAP)/2})">${WM.svg}</g></g></svg>`;};

writeFileSync(new URL('../.brand-lab/lockup.html',import.meta.url),
`<!doctype html><meta charset="utf-8"><title>lockup</title>
<style>body{margin:0;padding:40px;background:${IVORY};color:${INK};font:400 11px/1.5 ui-sans-serif,-apple-system,sans-serif}
h1{font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin:0 0 26px;font-weight:600}
.b{background:#fff;border:1px solid rgba(11,12,11,.1);padding:30px 40px;margin-bottom:12px}
.b .lbl{font-size:10px;letter-spacing:.2em;opacity:.4;margin-top:18px;text-transform:uppercase}
.sym{display:flex;gap:26px;align-items:flex-end;margin-top:22px;padding-top:18px;border-top:1px solid rgba(11,12,11,.08)}
.sym figure{margin:0;text-align:center}.sym svg{display:block}.sym figcaption{font-size:9px;opacity:.4;padding-top:5px}</style>
<h1>VAYRO — lockup lock</h1>
${V.map(v=>`<div class="b">${lock(v.o)}
<div class="sym">${[16,24,32,48,80].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="${v.o.d}" fill="${INK}"/></svg><figcaption>${s}</figcaption></figure>`).join('')}</div>
<div class="lbl">${v.n}</div></div>`).join('')}`);
console.log('ok');
