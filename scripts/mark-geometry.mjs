/**
 * VAYRO mark geometry — parametric source of truth.
 * All logo artwork in /public/brand is generated from this file.
 * Grid: 100 x 100. Optical box is computed, then centred.
 */

const r = (n) => Math.round(n * 1000) / 1000;

/**
 * Asymmetric chevron with a chamfered vertex and a flat-bottomed counter.
 * slope = horizontal travel per unit of vertical travel (dx/dy).
 */
export function chevron({
  cx = 50,
  yBottom = 87,
  yTopL = 21,
  yTopR = 13,
  slope = 0.5,
  chamfer = 7,       // half-width of the outer vertex flat  (the "fold seam")
  counterY = 63,     // y of the counter's flat bottom
  counterHalf = 4.5, // half-width of the counter's flat bottom
} = {}) {
  const lOutX = cx - chamfer - slope * (yBottom - yTopL);
  const rOutX = cx + chamfer + slope * (yBottom - yTopR);
  const lInX = cx - counterHalf - slope * (counterY - yTopL);
  const rInX = cx + counterHalf + slope * (counterY - yTopR);

  const pts = [
    [lOutX, yTopL],
    [cx - chamfer, yBottom],
    [cx + chamfer, yBottom],
    [rOutX, yTopR],
    [rInX, yTopR],
    [cx + counterHalf, counterY],
    [cx - counterHalf, counterY],
    [lInX, yTopL],
  ];

  return {
    pts,
    d: `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`,
    bbox: { x0: lOutX, x1: rOutX, y0: yTopR, y1: yBottom },
    // perpendicular stroke weight of an arm
    weight: (lInX - lOutX) * Math.cos(Math.atan(slope)),
  };
}

/** Translate a path so its bbox is centred inside the 100-grid. */
export function centred(cfg = {}) {
  const c = chevron(cfg);
  const dx = 50 - (c.bbox.x0 + c.bbox.x1) / 2;
  const dy = 50 - (c.bbox.y0 + c.bbox.y1) / 2;
  const pts = c.pts.map(([x, y]) => [x + dx, y + dy]);
  return {
    ...c,
    pts,
    d: `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`,
    bbox: {
      x0: c.bbox.x0 + dx, x1: c.bbox.x1 + dx,
      y0: c.bbox.y0 + dy, y1: c.bbox.y1 + dy,
    },
  };
}

/** Split the centred mark into two tonal planes for the "Fold" expression. */
export function foldPlanes(cfg = {}) {
  const c = centred(cfg);
  const [pL, pBL, pBR, pR, pRI, pCR, pCL, pLI] = c.pts;
  const seamTop = [(pCL[0] + pCR[0]) / 2, pCL[1]];
  const seamBottom = [(pBL[0] + pBR[0]) / 2, pBL[1]];
  const path = (arr) => `M${arr.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`;
  return {
    left: path([pL, pBL, seamBottom, seamTop, pCL, pLI]),
    right: path([seamTop, seamBottom, pBR, pR, pRI, pCR]),
  };
}

export const MARK = centred();
export const MARK_MICRO = centred({ chamfer: 8, counterHalf: 6, counterY: 60, slope: 0.46 });
