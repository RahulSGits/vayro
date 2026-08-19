/** VAYRO — single source of truth for all brand artwork. */
import { offsetOutline, fitPath } from './outline.mjs';
import { wordmark, GLYPHS, CAP, TRACK, STEM } from './wordmark.mjs';

export const COLOR = {
  ink:     '#0B0C0B',
  ink80:   '#1A1C1A',
  graphite:'#3A3E3C',
  slate:   '#5C6360',
  titanium:'#8C9195',
  stone:   '#B9B2A5',
  sand:    '#D8D0C0',
  bone:    '#EAE5DB',
  ivory:   '#F4F1EA',
  forest:  '#1E2C25',
  olive:   '#3D4536',
  moss:    '#5A6350',
};

/** The symbol. A chevron whose ascending arm turns. */
const symbolFrom = ({ w, ch, chKink, pad }) => {
  const bx = 50, by = 84, kinkY = 46, leg1 = 0.55, leg2 = 0.06, dy = 14;
  const cx = bx + leg1 * (by - kinkY);
  const pts = [[20, 20], [bx, by], [cx, kinkY], [cx + leg2 * (kinkY - dy), dy]];
  return fitPath(offsetOutline(pts, w, { chamfer: { 1: ch, 2: chKink } }), { box: 100, pad });
};

/* Optical size system. The primary mark carries the same stem architecture as
   the wordmark (14.2 at cap 100) so the two read as one family. The micro cut
   is drawn heavier and more open so it survives 16px, embroidery and hardware. */
export const SYMBOL       = symbolFrom({ w: 11.8, ch: 4.5, chKink: 3.5, pad: 6 });
export const SYMBOL_MICRO = symbolFrom({ w: 19.5, ch: 5, chKink: 3.5, pad: 3 });

/** Fold expression — the symbol split into two tonal planes at the turn. */
export const FOLD = (() => {
  const n = SYMBOL.pts.length, half = n / 2;
  const L = SYMBOL.pts.slice(0, half), R = SYMBOL.pts.slice(half);
  const d = (a) => `M${a.map(([x, y]) => `${+x.toFixed(2)} ${+y.toFixed(2)}`).join('L')}Z`;
  // seam runs from the vertex chamfer midpoint up through the counter apex
  const vtx = [(L[1][0] + L[2][0]) / 2, (L[1][1] + L[2][1]) / 2];
  const top = R[R.length - 2];
  return { lower: d([...L.slice(0, 3), vtx]), seam: `M${vtx[0]} ${vtx[1]}L${top[0]} ${top[1]}` };
})();

export const WORDMARK = wordmark('VAYRO');
export { GLYPHS, CAP, TRACK, STEM };

/* ---------- lockups ---------- */
const SYM_RATIO = 1.204;  // puts the mark 6% above cap height AND matches stem weight
const GAP_H = 0.46;       // × cap height
const GAP_V = 0.30;

export function lockupHorizontal() {
  const symH = CAP * SYM_RATIO, gap = CAP * GAP_H;
  const symW = symH;                       // symbol art is square
  const w = symW + gap + WORDMARK.width;
  const h = symH;
  const symY = 0, wmY = (symH - CAP) / 2;
  return {
    width: w, height: h,
    inner: `<g transform="translate(0 ${symY}) scale(${symH / 100})"><path d="${SYMBOL.d}"/></g>`
         + `<g transform="translate(${symW + gap} ${wmY})">${WORDMARK.svg}</g>`,
  };
}

export function lockupStacked() {
  const symH = CAP * 2.55, gap = CAP * GAP_V;
  const w = Math.max(symH, WORDMARK.width);
  const h = symH + gap + CAP;
  return {
    width: w, height: h,
    inner: `<g transform="translate(${(w - symH) / 2} 0) scale(${symH / 100})"><path d="${SYMBOL.d}"/></g>`
         + `<g transform="translate(${(w - WORDMARK.width) / 2} ${symH + gap})">${WORDMARK.svg}</g>`,
  };
}

const r = (n) => Math.round(n * 100) / 100;

/* ---------- combination mark ---------- */
/**
 * The logotype: the symbol standing in for the V of VAYRO, so the mark and the
 * word are one form rather than a lockup of two.
 *
 * Spacing is deliberate. The gap after the symbol (12) is slightly tighter than
 * the tracking between the remaining letters (13) because the symbol's
 * ascending arm is vertical, which leaves more optical air on its right than a
 * drawn V's diagonal would. Matching the two numbers literally reads as a hole.
 */
export const LOGOTYPE_GAP = 12;
export const LOGOTYPE_TRACK = 13;

export function logotype({ gap = LOGOTYPE_GAP, track = LOGOTYPE_TRACK } = {}) {
  const bb = SYMBOL.bbox;
  const symH = bb.y1 - bb.y0;
  const scale = CAP / symH;
  const symW = (bb.x1 - bb.x0) * scale;

  const parts = [
    `<g transform="translate(${r(-bb.x0 * scale)} ${r(-bb.y0 * scale)}) scale(${r(scale)})">`
    + `<path d="${SYMBOL.d}"/></g>`,
  ];

  let x = symW + gap;
  for (const ch of 'AYRO') {
    const g = GLYPHS[ch];
    parts.push(`<g transform="translate(${r(x)} 0)"><path d="${g.d}"/></g>`);
    x += g.w + track;
  }

  return { inner: parts.join(''), width: r(x - track), height: CAP, symbolWidth: r(symW) };
}

/** Stacked variant: word set to the exact width of the symbol above it. */
export function logotypeStacked({ symHeight = CAP * 1.5, gapY = CAP * 0.22 } = {}) {
  const bb = SYMBOL.bbox;
  const scale = symHeight / (bb.y1 - bb.y0);
  const symW = (bb.x1 - bb.x0) * scale;

  let wordW = 0;
  const glyphs = [];
  for (const ch of 'VAYRO') {
    glyphs.push({ ch, x: wordW });
    wordW += GLYPHS[ch].w + CAP * 0.02;
  }
  wordW -= CAP * 0.02;
  const wordScale = symW / wordW;

  const word = glyphs
    .map((g) => `<g transform="translate(${r(g.x)} 0)"><path d="${GLYPHS[g.ch].d}"/></g>`)
    .join('');

  return {
    inner:
      `<g transform="translate(${r(-bb.x0 * scale)} ${r(-bb.y0 * scale)}) scale(${r(scale)})">`
      + `<path d="${SYMBOL.d}"/></g>`
      + `<g transform="translate(0 ${r(symHeight + gapY)}) scale(${r(wordScale)})">${word}</g>`,
    width: r(symW),
    height: r(symHeight + gapY + CAP * wordScale),
  };
}

/* ---------- pattern ---------- */
export function pattern({ size = 120, stroke = 1.6, opacity = 1 } = {}) {
  const rows = [];
  for (let i = -1; i < 5; i++) {
    const y = i * (size / 4);
    rows.push(`M0 ${y + size / 8}L${size / 2} ${y + size / 8 + size / 8}L${size} ${y + size / 8}`);
  }
  return { size, d: rows.join(''), stroke, opacity };
}

export const svg = (w, h, inner, { fill = COLOR.ink, bg = null, pad = 0 } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}" fill="${fill}">`
  + (bg ? `<rect x="${-pad}" y="${-pad}" width="${w + pad * 2}" height="${h + pad * 2}" fill="${bg}"/>` : '')
  + inner + '</svg>';
