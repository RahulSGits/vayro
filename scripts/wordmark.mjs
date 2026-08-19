/** VAYRO custom wordmark — geometric caps, 100-unit cap height.
 *  System rule: nothing in VAYRO comes to a point. Every apex is chamfered.
 *  All artwork uses fill-rule:nonzero — outer contours are wound positive,
 *  counters negative, so subpaths union and holes stay holes. */
import { offsetOutline } from './outline.mjs';

export const CAP = 100;
export const STEM = 14.2;
const CH = 5.4;                    // apex chamfer (the "seam")
const r = (n) => Math.round(n * 100) / 100;

const signedArea = (pts) => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
};
const orient = (pts, positive = true) =>
  (signedArea(pts) >= 0) === positive ? pts : [...pts].reverse();
const toD = (pts) => `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`;

const stroke = (pts, chamferIdx) => {
  const chamfer = {};
  if (chamferIdx !== undefined) chamfer[chamferIdx] = CH;
  return toD(orient(offsetOutline(pts, STEM, { chamfer }).pts, true));
};
const rect = (x, y, w, h, positive = true) =>
  toD(orient([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], positive));

/* Superellipse ring. K > 0.5523 flattens the sides — engineered tension.
   `flat` puts a horizontal chamfer at the base, echoing the symbol's seam. */
const K = 0.615;
const ring = (cx, cy, rx, ry, flat = 0, positive = true) => {
  const kx = rx * K, ky = ry * K;
  const fwd = [
    `M${r(cx)} ${r(cy - ry)}`,
    `C${r(cx + kx)} ${r(cy - ry)} ${r(cx + rx)} ${r(cy - ky)} ${r(cx + rx)} ${r(cy)}`,
    `C${r(cx + rx)} ${r(cy + ky)} ${r(cx + kx)} ${r(cy + ry)} ${r(cx + flat)} ${r(cy + ry)}`,
    flat ? `H${r(cx - flat)}` : '',
    `C${r(cx - kx)} ${r(cy + ry)} ${r(cx - rx)} ${r(cy + ky)} ${r(cx - rx)} ${r(cy)}`,
    `C${r(cx - rx)} ${r(cy - ky)} ${r(cx - kx)} ${r(cy - ry)} ${r(cx)} ${r(cy - ry)}Z`,
  ].join('');
  if (positive) return fwd;
  return [                                                   // reversed winding
    `M${r(cx)} ${r(cy - ry)}`,
    `C${r(cx - kx)} ${r(cy - ry)} ${r(cx - rx)} ${r(cy - ky)} ${r(cx - rx)} ${r(cy)}`,
    `C${r(cx - rx)} ${r(cy + ky)} ${r(cx - kx)} ${r(cy + ry)} ${r(cx - flat)} ${r(cy + ry)}`,
    flat ? `H${r(cx + flat)}` : '',
    `C${r(cx + kx)} ${r(cy + ry)} ${r(cx + rx)} ${r(cy + ky)} ${r(cx + rx)} ${r(cy)}`,
    `C${r(cx + rx)} ${r(cy - ky)} ${r(cx + kx)} ${r(cy - ry)} ${r(cx)} ${r(cy - ry)}Z`,
  ].join('');
};

export const GLYPHS = {
  // apex chamfered — the fold seam, shared with the symbol
  V: { w: 76, d: stroke([[0, 0], [38, CAP], [76, 0]], 1) },

  A: { w: 78, d: [
        stroke([[0, CAP], [39, 0], [78, CAP]], 1),
        rect(13.5, 63.5, 51, 13.4),              // crossbar, overlapped into both diagonals
      ].join('') },

  Y: { w: 74, d: [
        stroke([[0, 0], [37, 55], [37, CAP]]),
        stroke([[37, 55], [74, 0]]),
      ].join('') },

  R: { w: 70, d: [
        rect(0, 0, STEM, CAP),                                                        // stem
        `M${STEM} 0H41.5C56.4 0 67.4 10.4 67.4 25.1S56.4 50.2 41.5 50.2H${STEM}Z`,    // bowl outer
        `M${STEM} 36.4H41.5C48.2 36.4 53.2 31.6 53.2 25.1S48.2 13.8 41.5 13.8H${STEM}Z`, // counter (reversed)
        toD(orient([[28.5, 44], [45.6, 44], [70, CAP], [55.4, CAP]], true)),          // leg
      ].join('') },

  O: { w: 80, d: [
        ring(40, 50, 40, 50, 8.5, true),
        ring(40, 50, 40 - STEM, 50 - STEM, 5.4, false),
      ].join('') },
};

export const TRACK = 17;

export function wordmark(text = 'VAYRO', { track = TRACK } = {}) {
  let x = 0;
  const parts = [];
  for (const ch of text) {
    const g = GLYPHS[ch];
    parts.push(`<g transform="translate(${r(x)} 0)"><path d="${g.d}"/></g>`);
    x += g.w + track;
  }
  return { svg: parts.join(''), width: r(x - track), height: CAP };
}
