import { writeFileSync } from 'node:fs';
const INK='#0B0C0B', IVORY='#F4F1EA';
const p=(a)=>`M${a.map(([x,y])=>`${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L')}Z`;
const S=(d,w,j='miter')=>`<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="${j}" stroke-linecap="butt"/>`;

const concepts=[
 {n:'3A',t:'Ascent — outward kink',d:'The ascending path steepens near the summit.',
  s:S('M14 18L50 84L74 40L90 12',13)},

 {n:'3B',t:'Ascent — inward kink',d:'Path turns back on itself. Reads as a hook.',
  s:S('M14 18L50 84L82 34L68 10',13)},

 {n:'3C',t:'Interlock — detached apex',d:'Valley carries a peak that is lifting away.',
  s:`<path d="${p([[6,22],[42,86],[56,86],[92,22],[78,22],[49,74],[20,22]])}" fill="${INK}"/>
     <path d="${p([[34,15],[49,42],[64,15]])}" fill="${INK}"/>`},

 {n:'3D',t:'Interlock — joined',d:'Peak and valley as one continuous form.',
  s:`<path d="${p([[6,22],[42,86],[56,86],[92,22],[66,22],[49,52],[32,22]])}" fill="${INK}"/>`},

 {n:'3E',t:'Fold Gap',d:'Two arms, a precise gap at the fold. No offset.',
  s:`<path d="${p([[10,16],[44,82],[56,82],[22,16]])}" fill="${INK}"/>
     <path d="${p([[62,82],[96,16],[84,16],[50,82]])}" fill="${INK}"/>`},

 {n:'3F',t:'Step',d:'One orthogonal step in the ascent. Engineered.',
  s:S('M14 18L50 84L74 40L74 22L92 22',13)},

 {n:'3G',t:'Material Duality',d:'One solid plane, one outlined plane.',
  s:`<path d="${p([[8,18],[43,86],[57,86],[23,18]])}" fill="${INK}"/>
     <path d="${p([[57,86],[92,18],[78,18],[49,76],[43,86]])}" fill="none" stroke="${INK}" stroke-width="6"/>`},

 {n:'3H',t:'Pack',d:'The ascending arm folds into a horizontal bar.',
  s:S('M14 16L50 82L72 40L94 40',13)},

 {n:'3I',t:'Apex',d:'Chevron with a keyed apex notch on the silhouette.',
  s:`<path d="${p([[8,20],[42,86],[56,86],[92,20],[78,20],[70,36],[60,26],[49,50],[22,20]])}" fill="${INK}"/>`},

 {n:'3J',t:'Twin Ascent',d:'Valley plus a second, higher ridge line.',
  s:`<path d="${p([[8,26],[42,86],[56,86],[92,26],[78,26],[49,74],[22,26]])}" fill="${INK}"/>
     <path d="${p([[30,20],[49,54],[68,20],[57,20],[49,34],[41,20]])}" fill="${INK}"/>`},

 {n:'3K',t:'Chamfered Vessel',d:'Wide chevron, flat base, cut shoulders.',
  s:`<path d="${p([[10,16],[10,30],[38,84],[62,84],[90,30],[90,16],[76,16],[76,28],[54,70],[46,70],[24,28],[24,16]])}" fill="${INK}"/>`},

 {n:'3L',t:'Offset Planes',d:'Two parallelograms sharing a mitre, one raised.',
  s:`<path d="${p([[8,22],[44,86],[56,86],[24,22]])}" fill="${INK}"/>
     <path d="${p([[56,86],[92,14],[78,14],[46,80]])}" fill="${INK}"/>`},
];

const row=(svg,bg,fg)=>`<div class="sc" style="background:${bg}">${[16,24,32,64].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="-4 -4 108 108">${svg.replaceAll(INK,fg)}</svg><figcaption style="color:${fg}">${s}</figcaption></figure>`).join('')}</div>`;

writeFileSync(new URL('../.brand-lab/round3.html',import.meta.url),
`<!doctype html><meta charset="utf-8"><title>VAYRO — round three</title>
<style>body{margin:0;padding:44px;background:${IVORY};color:${INK};font:400 12px/1.5 ui-sans-serif,-apple-system,Inter,sans-serif}
h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 34px;font-weight:600}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.card{background:#fff;border:1px solid rgba(11,12,11,.1);margin:0}
.stage{aspect-ratio:1.1;display:grid;place-items:center;padding:17%}.stage svg{width:100%;height:100%}
.cap{border-top:1px solid rgba(11,12,11,.1);padding:10px 12px;font-size:10.5px}
.cap b{letter-spacing:.18em;margin-right:7px;opacity:.4}.cap span{display:block;opacity:.5;margin-top:4px;font-size:10px}
.sc{display:flex;align-items:flex-end;justify-content:center;gap:16px;padding:13px 0;border-top:1px solid rgba(11,12,11,.08)}
.sc figure{margin:0;text-align:center}.sc svg{display:block}.sc figcaption{padding-top:5px;opacity:.4;font-size:9px}</style>
<h1>VAYRO — round three</h1><div class="grid">
${concepts.map(c=>`<figure class="card"><div class="stage"><svg viewBox="-4 -4 108 108">${c.s}</svg></div>
${row(c.s,'#fff',INK)}${row(c.s,INK,IVORY)}
<figcaption class="cap"><b>${c.n}</b>${c.t}<span>${c.d}</span></figcaption></figure>`).join('')}</div>`);
console.log('ok');
