import { writeFileSync } from 'node:fs';
import { centred } from './mark-geometry.mjs';

const INK = '#0B0C0B', IVORY = '#F4F1EA';
const M = centred();
const p = (a) => `M${a.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L')}Z`;

/* ---- Split Vector: the ascending arm is severed and steps forward ---- */
const body = [[8,21],[41,87],[55,87],[76,45],[64.4,39.2],[52.5,63],[43.5,63],[22.5,21]];
const chipRaw = [[76,45],[92,13],[77.5,13],[64.4,39.2]];
const slide = (arr, g) => arr.map(([x,y]) => [x + g*0.4472, y - g*0.8944]);

/* ---- helpers ---- */
const chevStroke = (d, w, extra='') => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w}" stroke-linejoin="miter" stroke-linecap="butt" ${extra}/>`;

const concepts = [
  { n:'01', t:'Split Vector', d:'Ascending arm severed, stepped forward along its own axis.',
    s:`<path d="${p(body)}" fill="${INK}"/><path d="${p(slide(chipRaw,11))}" fill="${INK}"/>` },

  { n:'02', t:'Detached Arm', d:'Descending stroke + free ascending bar. Eye closes the V.',
    s:`<path d="${p([[10,18],[43,88],[57,88],[24,18]])}" fill="${INK}"/>
       <path d="${p([[60,80],[93,10],[79,10],[46,80]])}" fill="${INK}" transform="translate(6,-6)"/>` },

  { n:'03', t:'Nested Fold', d:'A chevron packed inside a chevron, offset forward.',
    s:`${chevStroke('M12 22L50 84L88 14',13)}<g transform="translate(16,-9) scale(0.5) translate(50,50) translate(-50,-50)">${chevStroke('M12 22L50 84L88 14',13)}</g>` },

  { n:'04', t:'Interlock', d:'Peak and valley sharing one edge. Convergence.',
    s:`<path d="${p([[6,20],[42,86],[56,86],[92,20],[78,20],[49,73],[20,20]])}" fill="${INK}"/>
       <path d="${p([[20,20],[49,73],[78,20],[64,20],[49,47],[34,20]])}" fill="${IVORY}"/>
       <path d="${p([[34,14],[49,41],[64,14]])}" fill="${INK}"/>` },

  { n:'05', t:'Aperture', d:'Solid field breached by a V void. Containment, opened.',
    s:`<path d="M10 12H90V88H10Z M50 88L28 42H40L50 66L60 42H72Z" fill="${INK}" fill-rule="evenodd"/>` },

  { n:'06', t:'Bearing', d:'Wide chevron on a stem. Compass needle.',
    s:`<path d="${p([[6,38],[50,74],[94,38],[94,54],[50,90],[6,54]])}" fill="${INK}"/>
       <rect x="44" y="8" width="12" height="42" fill="${INK}"/>` },

  { n:'07', t:'Clasp', d:'V with a bridged vertex. Reads as hardware.',
    s:`<path d="${p([[10,14],[10,60],[50,88],[90,60],[90,14],[76,14],[76,52],[50,70],[24,52],[24,14]])}" fill="${INK}"/>` },

  { n:'08', t:'Ribbon', d:'Two planes mitred at a fold. Unequal weight.',
    s:`<path d="${p([[8,20],[46,88],[52,78],[24,20]])}" fill="${INK}"/>
       <path d="${p([[52,78],[92,14],[74,14],[46,88]])}" fill="${INK}" opacity=".55"/>` },

  { n:'09', t:'Switchfold', d:'The arm folds back once before ascending.',
    s:`${chevStroke('M12 20L44 66L28 70L88 16',12)}` },

  { n:'10', t:'Implied V', d:'Two bars, no vertex. Gestalt closure at the fold point.',
    s:`<path d="${p([[10,18],[40,78],[54,78],[24,18]])}" fill="${INK}"/>
       <path d="${p([[60,78],[90,18],[76,18],[46,78]])}" fill="${INK}"/>` },

  { n:'11', t:'Waypoint', d:'Chevron inside an aperture ring.',
    s:`<circle cx="50" cy="50" r="42" fill="none" stroke="${INK}" stroke-width="10"/>${chevStroke('M30 36L50 68L70 28',11)}` },

  { n:'12', t:'Crossing', d:'The ascending path overshoots the descent. A route crossing.',
    s:`${chevStroke('M18 14L52 84L90 6',13)}<path d="${p([[6,30],[86,30],[86,42],[6,42]])}" fill="${INK}" opacity=".25"/>` },
];

const scaleRow = (svg, bg, fg) => `<div class="scales" style="background:${bg}">${[16,24,32,64].map(s=>`<figure><svg width="${s}" height="${s}" viewBox="-4 -4 108 108">${svg.replaceAll(INK,fg)}</svg><figcaption style="color:${fg}">${s}</figcaption></figure>`).join('')}</div>`;

const html = `<!doctype html><meta charset="utf-8"><title>VAYRO — round two</title>
<style>
 body{margin:0;padding:44px;background:${IVORY};color:${INK};font:400 12px/1.5 ui-sans-serif,-apple-system,Inter,sans-serif}
 h1{font-size:12px;letter-spacing:.32em;text-transform:uppercase;margin:0 0 36px;font-weight:600}
 .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
 .card{background:#fff;border:1px solid rgba(11,12,11,.1)}
 .stage{aspect-ratio:1.12;display:grid;place-items:center;padding:18%}
 .stage svg{width:100%;height:100%}
 .cap{border-top:1px solid rgba(11,12,11,.1);padding:10px 12px;font-size:10.5px;letter-spacing:.03em}
 .cap b{letter-spacing:.18em;margin-right:7px;opacity:.4}
 .cap span{display:block;opacity:.5;margin-top:4px;font-size:10px;line-height:1.4}
 .scales{display:flex;align-items:flex-end;justify-content:center;gap:16px;padding:14px 0;border-top:1px solid rgba(11,12,11,.08)}
 .scales figure{margin:0;text-align:center}.scales svg{display:block}
 .scales figcaption{padding-top:5px;opacity:.4;font-size:9px}
</style>
<h1>VAYRO — Structural exploration, round two</h1>
<div class="grid">
${concepts.map(c=>`<figure class="card" style="margin:0">
  <div class="stage"><svg viewBox="-4 -4 108 108">${c.s}</svg></div>
  ${scaleRow(c.s,'#fff',INK)}${scaleRow(c.s,INK,IVORY)}
  <figcaption class="cap"><b>${c.n}</b>${c.t}<span>${c.d}</span></figcaption>
</figure>`).join('')}
</div>`;
writeFileSync(new URL('../.brand-lab/round2.html', import.meta.url), html);
console.log('ok');
