/** Convert an open polyline centreline into a closed, filled outline with
 *  mitred joins and optional chamfered (flattened) corners. */
const r = (n) => Math.round(n * 1000) / 1000;

export function offsetOutline(pts, w, { chamfer = {} } = {}) {
  const n = pts.length;
  const seg = [];
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
    seg.push({ ux: dx / L, uy: dy / L, nx: -dy / L, ny: dx / L });
  }
  const side = (s) => {
    const out = [];
    out.push({ p: [pts[0][0] + s * seg[0].nx * w / 2, pts[0][1] + s * seg[0].ny * w / 2] });
    for (let i = 1; i < n - 1; i++) {
      const a = seg[i - 1], b = seg[i];
      let mx = a.nx + b.nx, my = a.ny + b.ny;
      const ml = Math.hypot(mx, my) || 1;
      mx /= ml; my /= ml;
      const cosHalf = mx * a.nx + my * a.ny;
      const len = (w / 2) / cosHalf;
      out.push({ p: [pts[i][0] + s * mx * len, pts[i][1] + s * my * len], i, a, b, miter: Math.abs(len) });
    }
    const last = seg[n - 2];
    out.push({ p: [pts[n - 1][0] + s * last.nx * w / 2, pts[n - 1][1] + s * last.ny * w / 2] });
    return out;
  };

  const build = (arr) => {
    const res = [];
    for (const v of arr) {
      const c = v.i !== undefined ? (chamfer[v.i] || 0) : 0;
      // only chamfer the outer (long-miter) side
      if (c > 0 && v.miter > w / 2 * 1.02) {
        res.push([v.p[0] - c * v.a.ux, v.p[1] - c * v.a.uy]);
        res.push([v.p[0] + c * v.b.ux, v.p[1] + c * v.b.uy]);
      } else res.push(v.p);
    }
    return res;
  };

  const L = build(side(1)), R = build(side(-1)).reverse();
  const all = [...L, ...R];
  return {
    pts: all,
    d: `M${all.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`,
    bbox: all.reduce((b, [x, y]) => ({
      x0: Math.min(b.x0, x), x1: Math.max(b.x1, x),
      y0: Math.min(b.y0, y), y1: Math.max(b.y1, y),
    }), { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }),
  };
}

/** Fit a path's points into a target box, returning re-emitted path data. */
export function fitPath(o, { box = 100, pad = 8 } = {}) {
  const { x0, x1, y0, y1 } = o.bbox;
  const w = x1 - x0, h = y1 - y0;
  const k = (box - pad * 2) / Math.max(w, h);
  const ox = (box - w * k) / 2 - x0 * k;
  const oy = (box - h * k) / 2 - y0 * k;
  const pts = o.pts.map(([x, y]) => [x * k + ox, y * k + oy]);
  return {
    pts,
    d: `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`,
    scale: k,
    bbox: { x0: x0 * k + ox, x1: x1 * k + ox, y0: y0 * k + oy, y1: y1 * k + oy },
  };
}
