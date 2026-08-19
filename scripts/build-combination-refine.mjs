/** Refinement pass on the selected combination mark: the symbol as the V. */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import * as B from './brand.mjs';

const { ink } = B.COLOR;
const G = B.GLYPHS;
const CAP = B.CAP;
const bb = B.SYMBOL.bbox;
const SYM_W = bb.x1 - bb.x0;
const SYM_H = bb.y1 - bb.y0;

function symGlyph(height, y = 0) {
  const s = height / SYM_H;
  return {
    w: SYM_W * s,
    node: `<g transform="translate(${(-bb.x0 * s).toFixed(2)} ${(y - bb.y0 * s).toFixed(2)}) scale(${s.toFixed(4)})"><path d="${B.SYMBOL.d}"/></g>`,
  };
}

function letters(str, startX, track) {
  let x = startX;
  const parts = [];
  for (const ch of str) {
    parts.push(`<g transform="translate(${x.toFixed(2)} 0)"><path d="${G[ch].d}"/></g>`);
    x += G[ch].w + track;
  }
  return { svg: parts.join(''), end: x - track };
}

/** Horizontal combination mark. `gap` is the space after the symbol-V. */
function mark({ gap, track = B.TRACK, symHeight = CAP }) {
  const s = symGlyph(symHeight);
  const rest = letters('AYRO', s.w + gap, track);
  return { w: rest.end, h: CAP, inner: s.node + rest.svg };
}

const VARIANTS = [
  { n: 'T1', label: `gap ${B.TRACK} (standard tracking)`, cfg: { gap: B.TRACK } },
  { n: 'T2', label: 'gap 12 (tightened)', cfg: { gap: 12 } },
  { n: 'T3', label: 'gap 7 (tight)', cfg: { gap: 7 } },
  { n: 'T4', label: 'gap 12, letters tracked 13', cfg: { gap: 12, track: 13 } },
  { n: 'T5', label: 'gap 12, symbol 1.06x cap', cfg: { gap: 12, symHeight: CAP * 1.06 } },
  { n: 'T6', label: 'gap 7, letters tracked 13', cfg: { gap: 7, track: 13 } },
];

const PAD = 10;
const tiles = [];
for (const v of VARIANTS) {
  const m = mark(v.cfg);
  const vb = `${-PAD} ${-PAD} ${m.w + PAD * 2} ${m.h + PAD * 2}`;
  const H = 120;
  const W = Math.round((H * (m.w + PAD * 2)) / (m.h + PAD * 2));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vb}" fill="${ink}">${m.inner}</svg>`;
  const img = await sharp(Buffer.from(svg), { density: 300 })
    .resize(W, H, { fit: 'contain', background: '#FFFFFF' })
    .flatten({ background: '#FFFFFF' }).png().toBuffer();
  const card = await sharp({ create: { width: 800, height: 150, channels: 3, background: '#FFFFFF' } })
    .composite([{ input: img, gravity: 'center' }]).png().toBuffer();
  tiles.push(card);
}

const gap = 8;
const sheet = await sharp({
  create: { width: 800 + gap * 2, height: tiles.length * (150 + gap) + gap, channels: 3, background: '#EDEAE3' },
}).composite(tiles.map((t, i) => ({ input: t, left: gap, top: gap + i * (150 + gap) })))
  .jpeg({ quality: 93 }).toBuffer();

writeFileSync(new URL('../.brand-lab/combination-refine.jpg', import.meta.url), sheet);
console.log('variants:', VARIANTS.map((v) => `${v.n} ${v.label}`).join(' | '));
console.log('wrote .brand-lab/combination-refine.jpg');
