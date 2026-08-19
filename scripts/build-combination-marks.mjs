/** VAYRO — combination-mark exploration.
 *  Approaches where the symbol and the word are ONE form, not a lockup. */
import { writeFileSync, mkdirSync } from 'node:fs';
import * as B from './brand.mjs';

const { ink, ivory } = B.COLOR;
const G = B.GLYPHS;
const CAP = B.CAP;
const TRACK = B.TRACK;
const bb = B.SYMBOL.bbox;
const SYM_W = bb.x1 - bb.x0;
const SYM_H = bb.y1 - bb.y0;

/** The symbol re-cast as a glyph: baseline-aligned, cap-height matched. */
function symGlyph(height = CAP, { x = 0, y = 0 } = {}) {
  const s = height / SYM_H;
  return {
    w: SYM_W * s,
    node: `<g transform="translate(${(x - bb.x0 * s).toFixed(2)} ${(y - bb.y0 * s).toFixed(2)}) scale(${s.toFixed(4)})"><path d="${B.SYMBOL.d}"/></g>`,
  };
}

/** Lay out letters from the drawn wordmark. */
function word(letters, { track = TRACK, startX = 0 } = {}) {
  let x = startX;
  const parts = [];
  for (const ch of letters) {
    const g = G[ch];
    parts.push(`<g transform="translate(${x.toFixed(2)} 0)"><path d="${g.d}"/></g>`);
    x += g.w + track;
  }
  return { svg: parts.join(''), width: x - track - startX };
}

const C = [];

/* 01 — Symbol as the V, cap-height matched. */
{
  const s = symGlyph(CAP);
  const rest = word('AYRO', { startX: s.w + TRACK });
  C.push({
    n: '01', t: 'Substitution', d: 'The symbol IS the V. One word, one mark.',
    w: s.w + TRACK + rest.width, h: CAP, inner: s.node + rest.svg,
  });
}

/* 02 — Symbol as the V, overshooting the cap line. */
{
  const H = CAP * 1.2;
  const s = symGlyph(H, { y: -(H - CAP) });
  const rest = word('AYRO', { startX: s.w + TRACK });
  C.push({
    n: '02', t: 'Overshoot', d: 'The mark rises past the cap line and leads the eye up.',
    w: s.w + TRACK + rest.width, h: CAP, top: H - CAP, inner: s.node + rest.svg,
  });
}

/* 03 — Tucked: the A nests under the ascending arm. */
{
  const s = symGlyph(CAP);
  const rest = word('AYRO', { startX: s.w - CAP * 0.11 });
  C.push({
    n: '03', t: 'Tucked', d: 'Negative tracking pulls the A under the ascending arm.',
    w: s.w - CAP * 0.11 + rest.width, h: CAP, inner: s.node + rest.svg,
  });
}

/* 04 — Stacked monogram in a hairline frame. */
{
  const H = CAP * 1.9;
  const s = symGlyph(H);
  const w = word('VAYRO', { track: CAP * 0.4 });
  const scale = (s.w * 0.98) / w.width;
  const boxW = s.w + CAP * 0.85;
  const boxH = H + CAP * 0.36 + CAP * scale + CAP * 0.85;
  C.push({
    n: '04', t: 'Seal', d: 'Symbol over letterspaced word, held in a hairline frame.',
    w: boxW, h: boxH, frame: true,
    inner:
      `<g transform="translate(${((boxW - s.w) / 2).toFixed(2)} ${(CAP * 0.42).toFixed(2)})">${s.node}</g>`
      + `<g transform="translate(${((boxW - w.width * scale) / 2).toFixed(2)} ${(CAP * 0.42 + H + CAP * 0.36).toFixed(2)}) scale(${scale.toFixed(4)})">${w.svg}</g>`,
  });
}

/* 05 — The word set inside the symbol's counter. */
{
  const H = CAP * 3.0;
  const s = symGlyph(H);
  const w = word('VAYRO', { track: CAP * 0.16 });
  const scale = (s.w * 0.3) / w.width;
  C.push({
    n: '05', t: 'Counterset', d: 'The word occupies the mark’s negative space.',
    w: s.w, h: H,
    inner: s.node
      + `<g transform="translate(${(s.w * 0.16).toFixed(2)} ${(H * 0.26).toFixed(2)}) scale(${scale.toFixed(4)})">${w.svg}</g>`,
  });
}

/* 06 — Interlock: symbol overlaps the wordmark's own V. */
{
  const s = symGlyph(CAP);
  const rest = word('VAYRO', { startX: s.w * 0.5 });
  C.push({
    n: '06', t: 'Interlock', d: 'Mark and wordmark overlap and share ink.',
    w: s.w * 0.5 + rest.width, h: CAP, inner: s.node + rest.svg,
  });
}

/* 07 — A shared baseline rule binds mark and word. */
{
  const H = CAP * 1.45;
  const s = symGlyph(H);
  const w = word('VAYRO', { track: CAP * 0.24 });
  const scale = 0.5;
  C.push({
    n: '07', t: 'Datum', d: 'A shared baseline rule binds mark and word.',
    w: s.w + CAP * 0.26 + w.width * scale, h: H,
    inner: s.node
      + `<rect x="${(s.w + CAP * 0.26).toFixed(2)}" y="${(H - 2.4).toFixed(2)}" width="${(w.width * scale).toFixed(2)}" height="2.4"/>`
      + `<g transform="translate(${(s.w + CAP * 0.26).toFixed(2)} ${(H - CAP * scale - CAP * 0.18).toFixed(2)}) scale(${scale.toFixed(4)})">${w.svg}</g>`,
  });
}

/* 08 — Word set to the exact width of the mark above it. */
{
  const H = CAP * 1.5;
  const s = symGlyph(H);
  const w = word('VAYRO', { track: CAP * 0.02 });
  const scale = s.w / w.width;
  C.push({
    n: '08', t: 'Column', d: 'Word set to the exact width of the mark above it.',
    w: s.w, h: H + CAP * 0.22 + CAP * scale,
    inner: s.node
      + `<g transform="translate(0 ${(H + CAP * 0.22).toFixed(2)}) scale(${scale.toFixed(4)})">${w.svg}</g>`,
  });
}

const PAD = 9;
const viewBox = (c) => {
  const top = -(PAD + (c.top ?? 0));
  return `${-PAD} ${top} ${c.w + PAD * 2} ${c.h + PAD * 2 + (c.top ?? 0)}`;
};
const frameRect = (c) =>
  c.frame ? `<rect x="-2" y="-2" width="${c.w + 4}" height="${c.h + 4}" fill="none" stroke="currentColor" stroke-width="2.2"/>` : '';

const smallRow = (c) => [16, 24, 36, 60].map((h) => {
  const vb = viewBox(c);
  const parts = vb.split(' ').map(Number);
  const wpx = (h * parts[2]) / parts[3];
  return `<figure><svg height="${h}" width="${wpx.toFixed(1)}" viewBox="${vb}" fill="currentColor">${frameRect(c)}${c.inner}</svg><figcaption>${h}</figcaption></figure>`;
}).join('');

const html = `<meta charset="utf-8"><title>VAYRO combination marks</title>
<style>
body{margin:0;padding:44px;background:${ivory};color:${ink};
 font:400 13px/1.6 ui-sans-serif,-apple-system,Inter,sans-serif}
h1{font-size:11px;letter-spacing:.3em;text-transform:uppercase;margin:0 0 8px;font-weight:600}
p.sub{margin:0 0 34px;opacity:.55;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}
.card{background:#fff;border:1px solid rgba(11,12,11,.1);margin:0}
.stage{display:grid;place-items:center;padding:44px 40px;min-height:200px}
.stage svg{max-width:100%;max-height:140px;width:auto;height:auto}
.sc{display:flex;align-items:flex-end;justify-content:center;gap:26px;padding:16px 0;
    border-top:1px solid rgba(11,12,11,.08);flex-wrap:wrap}
.sc figure{margin:0;text-align:center}.sc svg{display:block}
.sc figcaption{padding-top:6px;font-size:9px;opacity:.4}
.cap{border-top:1px solid rgba(11,12,11,.1);padding:11px 14px;font-size:11px}
.cap b{letter-spacing:.16em;margin-right:8px;opacity:.4}
.cap span{display:block;opacity:.5;margin-top:4px;font-size:10.5px}
.dark{background:${ink};color:${ivory}}
.dark figcaption{color:${ivory};opacity:.5}
</style>
<h1>VAYRO &mdash; combination marks</h1>
<p class="sub">Eight ways the symbol and the word become one form.</p>
<div class="grid">
${C.map((c) => `<figure class="card">
  <div class="stage"><svg viewBox="${viewBox(c)}" fill="currentColor">${frameRect(c)}${c.inner}</svg></div>
  <div class="sc">${smallRow(c)}</div>
  <div class="sc dark">${smallRow(c)}</div>
  <figcaption class="cap"><b>${c.n}</b>${c.t}<span>${c.d}</span></figcaption>
</figure>`).join('')}
</div>`;

mkdirSync(new URL('../.brand-lab/', import.meta.url), { recursive: true });
writeFileSync(new URL('../.brand-lab/combination.html', import.meta.url), html);
console.log('wrote .brand-lab/combination.html —', C.length, 'concepts');

/* ---- also emit a raster contact sheet for review ---- */
import sharp from 'sharp';
const OUT = new URL('../.brand-lab/', import.meta.url);
const tiles = [];
for (const c of C) {
  const vb = viewBox(c);
  const p = vb.split(' ').map(Number);
  const W = 520, H = Math.min(200, Math.round((W * p[3]) / p[2]));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vb}" fill="${ink}">${frameRect(c).replace('currentColor', ink)}${c.inner}</svg>`;
  const buf = await sharp(Buffer.from(svg), { density: 300 })
    .resize(W, H, { fit: 'contain', background: '#FFFFFF' })
    .flatten({ background: '#FFFFFF' })
    .png().toBuffer();
  // pad each tile to a uniform 560x230 card
  const card = await sharp({ create: { width: 560, height: 230, channels: 3, background: '#FFFFFF' } })
    .composite([{ input: buf, gravity: 'center' }]).png().toBuffer();
  tiles.push({ n: c.n, buf: card });
}
const cols = 2, cw = 560, ch = 230, gap = 8;
const sheet = await sharp({
  create: {
    width: cols * cw + (cols + 1) * gap,
    height: Math.ceil(tiles.length / cols) * (ch + gap) + gap,
    channels: 3, background: '#EDEAE3',
  },
}).composite(tiles.map((t, i) => ({
  input: t.buf,
  left: gap + (i % cols) * (cw + gap),
  top: gap + Math.floor(i / cols) * (ch + gap),
}))).jpeg({ quality: 92 }).toBuffer();
writeFileSync(new URL('combination-sheet.jpg', OUT), sheet);
console.log('wrote .brand-lab/combination-sheet.jpg');
