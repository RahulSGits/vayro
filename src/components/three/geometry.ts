import * as THREE from 'three';

/* ==========================================================================
   VAYRO — procedural shell geometry

   There is no GLB in the repository yet, so the Meridian is drawn from
   revolved profiles, swept tubes and bevelled extrusions. The proportions are
   not decorative: they are set against the catalogue's `hotspots[].anchor3d`
   coordinates, so the annotation anchors land on the right seams whether the
   viewer is showing this shape or the real scan.

   Model space: 1 unit ~= 62 cm. Shoulders sit at y = 0.73, hem at y = -0.80,
   hood crown at y = 1.30. The shell faces +Z.

   Everything here is pure — no React, no side effects — so the builders can be
   run one stage at a time behind a progress readout.
   ========================================================================== */

export type JacketQuality = 'high' | 'medium' | 'low';
export type MaterialKey = 'shell' | 'shellDeep' | 'lining' | 'hardware' | 'webbing';
export type Vec3 = [number, number, number];

export type JacketPart = {
  /** Stable identity — also the Object3D name inside the scene graph. */
  key: string;
  material: MaterialKey;
  geometry: THREE.BufferGeometry;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  /** Offset applied at explode = 1. */
  explode?: Vec3;
  /** Transform blended in as packProgress -> 1. */
  packPosition?: Vec3;
  packRotation?: Vec3;
  packScale?: Vec3;
  /** Fades in across this packProgress window (carry hardware). */
  appear?: [from: number, to: number];
  /** Fades out across this packProgress window (worn-state hardware). */
  vanish?: [from: number, to: number];
  /** Excluded from the rounded-box collapse. */
  noClamp?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export type BuildStage = { label: string; build: (quality: JacketQuality) => JacketPart[] };

/* ------------------------------------------------------------- budgets --- */

const SEG = {
  high: { lathe: 96, arc: 28, tube: 64, radial: 20, sphere: 40, bevel: 3, curve: 12 },
  medium: { lathe: 64, arc: 18, tube: 44, radial: 14, sphere: 28, bevel: 2, curve: 8 },
  low: { lathe: 40, arc: 12, tube: 28, radial: 10, sphere: 20, bevel: 1, curve: 5 },
} as const;

/**
 * The packed unit. Ratio is the catalogue's own 24 x 16 x 9 cm packed size, so
 * the carry state on screen is the carry state on the spec sheet.
 */
export const CARRY_BOX = {
  center: [0, 0, 0] as Vec3,
  half: [0.3, 0.2, 0.1125] as Vec3,
  /** Corner rounding used by the collapse, in model units. */
  radius: 0.05,
};

/* ------------------------------------------------------------- profiles --- */

/** [radius, y] pairs, crown to hem. Scaled on Z to an ellipse after revolving. */
const TORSO: ReadonlyArray<readonly [number, number]> = [
  [0.001, 0.802], [0.13, 0.797], [0.235, 0.783], [0.318, 0.757],
  [0.386, 0.716], [0.428, 0.655], [0.447, 0.575], [0.452, 0.470],
  [0.448, 0.340], [0.436, 0.185], [0.424, 0.020], [0.423, -0.160],
  [0.436, -0.360], [0.454, -0.545], [0.468, -0.690], [0.472, -0.752],
  [0.462, -0.788], [0.372, -0.806], [0.190, -0.814], [0.001, -0.816],
];

/** Front-to-back squash applied to every revolved body part. */
const DEPTH = 0.6;

function radiusAtY(y: number): number {
  if (y >= TORSO[0][1]) return TORSO[0][0];
  const last = TORSO[TORSO.length - 1];
  if (y <= last[1]) return last[0];
  for (let i = 0; i < TORSO.length - 1; i++) {
    const [r0, y0] = TORSO[i];
    const [r1, y1] = TORSO[i + 1];
    if (y <= y0 && y >= y1) {
      const t = (y0 - y) / (y0 - y1 || 1);
      return r0 + (r1 - r0) * t;
    }
  }
  return last[0];
}

/** Samples the torso silhouette between two heights, optionally inflated. */
function profileSlice(yTop: number, yBottom: number, steps: number, inflate = 0): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= steps; i++) {
    const y = yTop + ((yBottom - yTop) * i) / steps;
    pts.push(new THREE.Vector2(radiusAtY(y) + inflate, y));
  }
  return pts;
}

/** Outward normal angle of the squashed body at a given lathe angle. */
function surfaceAngle(phi: number, r: number): number {
  return Math.atan2(Math.sin(phi) / r, Math.cos(phi) / (r * DEPTH));
}

/* -------------------------------------------------------------- helpers --- */

function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const k = Math.min(r, w / 2, h / 2);
  s.moveTo(x + k, y);
  s.lineTo(x + w - k, y);
  s.quadraticCurveTo(x + w, y, x + w, y + k);
  s.lineTo(x + w, y + h - k);
  s.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  s.lineTo(x + k, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - k);
  s.lineTo(x, y + k);
  s.quadraticCurveTo(x, y, x + k, y);
  return s;
}

function extrude(shape: THREE.Shape, depth: number, q: JacketQuality): THREE.BufferGeometry {
  const s = SEG[q];
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: Math.min(depth * 0.35, 0.004),
    bevelSize: 0.003,
    bevelOffset: 0,
    bevelSegments: s.bevel,
    curveSegments: s.curve,
  });
  geo.center();
  return geo;
}

/**
 * Sweeps a circular section along a curve and tapers it per station. Three's
 * TubeGeometry is a constant radius; a sleeve is not, so the ring vertices are
 * pushed out from their station centre by the taper function.
 */
function taperedTube(
  curve: THREE.Curve<THREE.Vector3>,
  tubular: number,
  radial: number,
  radiusAt: (t: number) => number,
): THREE.BufferGeometry {
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const ring = radial + 1;
  const v = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, c);
    const r = radiusAt(t);
    for (let j = 0; j <= radial; j++) {
      const idx = i * ring + j;
      v.fromBufferAttribute(pos, idx);
      v.sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(idx, v.x, v.y, v.z);
    }
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

/** A sub-curve between two normalised stations of a parent curve. */
function subCurve(curve: THREE.Curve<THREE.Vector3>, t0: number, t1: number, samples = 8) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= samples; i++) {
    pts.push(curve.getPointAt(t0 + ((t1 - t0) * i) / samples));
  }
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
}

function smoothstep(t: number) {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

/** The sleeve centreline. `side` is +1 for the wearer's right on screen. */
function sleeveCurve(side: 1 | -1) {
  return new THREE.CatmullRomCurve3(
    [
      [0.235, 0.742, -0.005],
      [0.392, 0.634, 0.012],
      [0.482, 0.428, 0.036],
      [0.530, 0.176, 0.058],
      [0.552, -0.086, 0.062],
      [0.556, -0.302, 0.052],
      [0.552, -0.424, 0.040],
    ].map(([x, y, z]) => new THREE.Vector3(x * side, y, z)),
    false,
    'catmullrom',
    0.35,
  );
}

function sleeveRadius(t: number) {
  const base = 0.204 - 0.108 * smoothstep(t);
  return base * (1 + 0.045 * Math.sin(Math.PI * t));
}

/* --------------------------------------------------------------- stages --- */

function buildBody(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];

  const torsoPts = TORSO.map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.LatheGeometry(torsoPts, s.lathe, 0, Math.PI * 2);
  torso.scale(1, 1, DEPTH);
  parts.push({
    key: 'shell_body',
    material: 'shell',
    geometry: torso,
    packScale: [0.94, 0.58, 1.04],
    castShadow: true,
    receiveShadow: true,
  });

  // Yoke seam — a hairline ring where the shoulder panel meets the body.
  const yokeR = radiusAtY(0.585) + 0.005;
  const yoke = new THREE.CylinderGeometry(yokeR, yokeR + 0.004, 0.013, s.lathe, 1, true);
  yoke.scale(1, 1, DEPTH);
  yoke.translate(0, 0.585, 0);
  parts.push({
    key: 'shell_yoke_seam',
    material: 'shellDeep',
    geometry: yoke,
    packScale: [0.94, 0.58, 1.04],
    packPosition: [0, 0.06, 0],
  });

  // Collar stand — rises out of the closed shoulder dome.
  const collar = new THREE.CylinderGeometry(0.222, 0.262, 0.155, s.lathe, 1, true);
  collar.scale(1, 1, 0.74);
  collar.translate(0, 0.812, 0.01);
  parts.push({
    key: 'shell_collar',
    material: 'shellDeep',
    geometry: collar,
    explode: [0, 0.34, 0],
    packPosition: [0, -0.5, 0],
    packScale: [0.9, 0.5, 0.9],
    castShadow: true,
  });

  return parts;
}

function buildSleeves(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];

  for (const side of [1, -1] as const) {
    const label = side === 1 ? 'r' : 'l';
    const curve = sleeveCurve(side);

    parts.push({
      key: `shell_sleeve_${label}`,
      material: 'shell',
      geometry: taperedTube(curve, s.tube, s.radial, sleeveRadius),
      explode: [side * 0.55, 0.04, 0],
      packPosition: [-side * 0.26, 0.16, 0.01],
      packRotation: [0, 0, side * 1.32],
      packScale: [0.82, 0.68, 0.82],
      castShadow: true,
      receiveShadow: true,
    });

    // Armhole seam — the gusseted underarm the catalogue calls out.
    parts.push({
      key: `shell_armhole_${label}`,
      material: 'shellDeep',
      geometry: taperedTube(subCurve(curve, 0.03, 0.085), 6, s.radial, (t) =>
        sleeveRadius(0.03 + t * 0.055) + 0.007),
      explode: [side * 0.55, 0.04, 0],
      packPosition: [-side * 0.26, 0.16, 0.01],
      packRotation: [0, 0, side * 1.32],
      packScale: [0.82, 0.68, 0.82],
    });

    // Cuff — a short band, aligned to the sleeve by construction.
    parts.push({
      key: `shell_cuff_${label}`,
      material: 'shellDeep',
      geometry: taperedTube(subCurve(curve, 0.9, 1), 8, s.radial, (t) =>
        sleeveRadius(0.9 + t * 0.1) * 1.055),
      explode: [side * 0.62, 0.02, 0],
      packPosition: [-side * 0.26, 0.16, 0.01],
      packRotation: [0, 0, side * 1.32],
      packScale: [0.82, 0.68, 0.82],
    });
  }

  return parts;
}

function buildHood(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];

  const shell = new THREE.SphereGeometry(0.3, s.sphere, Math.round(s.sphere * 0.7), 0, Math.PI * 2, 0, Math.PI * 0.63);
  shell.scale(1.03, 1.14, 1.0);
  shell.rotateX(0.3);
  shell.translate(0, 0.975, -0.055);
  parts.push({
    key: 'shell_hood',
    material: 'shell',
    geometry: shell,
    explode: [0, 0.46, -0.1],
    // The collar inverts and the hood becomes the cavity. It leads the fold.
    packPosition: [0, -0.62, 0.01],
    packRotation: [Math.PI * 0.92, 0, 0],
    packScale: [0.92, 0.86, 0.92],
    castShadow: true,
  });

  // Cavity lining — the surface that becomes the inside of the carry unit.
  const lining = new THREE.SphereGeometry(0.288, Math.round(s.sphere * 0.8), Math.round(s.sphere * 0.6), 0, Math.PI * 2, 0, Math.PI * 0.63);
  lining.scale(1.03, 1.14, 1.0);
  lining.rotateX(0.3);
  lining.translate(0, 0.975, -0.055);
  parts.push({
    key: 'hood_lining',
    material: 'lining',
    geometry: lining,
    explode: [0, 0.46, -0.1],
    packPosition: [0, -0.62, 0.01],
    packRotation: [Math.PI * 0.92, 0, 0],
    packScale: [0.92, 0.86, 0.92],
  });

  // Hood rim — the bound edge around the opening.
  const rim = new THREE.TorusGeometry(0.3, 0.011, 6, Math.round(s.sphere * 0.8), Math.PI * 2);
  rim.scale(1.03, 1.0, 1.0);
  rim.rotateX(Math.PI / 2 + 0.3 - Math.PI * 0.63 + Math.PI * 0.5);
  rim.translate(0, 0.9, 0.09);
  parts.push({
    key: 'hood_rim',
    material: 'shellDeep',
    geometry: rim,
    explode: [0, 0.46, -0.1],
    packPosition: [0, -0.62, 0.01],
    packRotation: [Math.PI * 0.92, 0, 0],
    packScale: [0.92, 0.86, 0.92],
  });

  return parts;
}

function buildClosure(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];
  const steps = Math.max(10, Math.round(s.lathe * 0.28));

  // Front placket — a strip of the body surface, lifted clear of it.
  const placket = new THREE.LatheGeometry(
    profileSlice(0.735, -0.735, steps, 0.012),
    s.arc,
    -0.1,
    0.2,
  );
  placket.scale(1, 1, DEPTH);
  parts.push({
    key: 'shell_placket',
    material: 'shellDeep',
    geometry: placket,
    explode: [0, 0, 0.3],
    packScale: [0.94, 0.58, 1.04],
    castShadow: true,
  });

  // Zip tape and teeth — the only high-metalness run on the front.
  const zip = new THREE.LatheGeometry(
    profileSlice(0.72, -0.715, steps, 0.021),
    Math.max(6, Math.round(s.arc * 0.4)),
    -0.026,
    0.052,
  );
  zip.scale(1, 1, DEPTH);
  parts.push({
    key: 'hardware_zip',
    material: 'hardware',
    geometry: zip,
    explode: [0, 0, 0.36],
    packScale: [0.94, 0.58, 1.04],
  });

  // Anodised pull — bevelled, because moulded plastic is a different brand.
  const pullBody = extrude(roundedRect(0.03, 0.078, 0.012), 0.009, q);
  const pullAngle = surfaceAngle(0, radiusAtY(0.28));
  pullBody.rotateY(pullAngle);
  pullBody.translate(0.022, 0.276, radiusAtY(0.28) * DEPTH + 0.03);
  parts.push({
    key: 'hardware_zip_pull',
    material: 'hardware',
    geometry: pullBody,
    explode: [0.06, 0, 0.42],
    vanish: [0.26, 0.52],
    noClamp: true,
  });

  // Woven chest label.
  const badgePhi = -0.55;
  const badgeR = radiusAtY(0.44);
  const badge = extrude(roundedRect(0.086, 0.03, 0.006), 0.005, q);
  badge.rotateY(surfaceAngle(badgePhi, badgeR));
  badge.translate(
    Math.sin(badgePhi) * badgeR,
    0.44,
    Math.cos(badgePhi) * badgeR * DEPTH + 0.006,
  );
  parts.push({
    key: 'detail_chest_label',
    material: 'webbing',
    geometry: badge,
    explode: [-0.22, 0, 0.3],
    vanish: [0.2, 0.44],
    noClamp: true,
  });

  return parts;
}

function buildDetails(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];
  const arcSeg = Math.max(8, Math.round(s.arc * 0.8));

  for (const side of [1, -1] as const) {
    const label = side === 1 ? 'r' : 'l';
    const phi = side === 1 ? 0.3 : -0.68;

    const pocket = new THREE.LatheGeometry(
      profileSlice(0.0, -0.3, Math.max(6, Math.round(s.lathe * 0.12)), 0.016),
      arcSeg,
      phi,
      0.38,
    );
    pocket.scale(1, 1, DEPTH);
    parts.push({
      key: `shell_pocket_${label}`,
      material: 'shell',
      geometry: pocket,
      explode: [side * 0.2, -0.08, 0.28],
      packScale: [0.94, 0.58, 1.04],
      castShadow: true,
    });

    // Welt — set high to clear a hip belt, as specified.
    const welt = new THREE.LatheGeometry(
      profileSlice(0.014, -0.008, 2, 0.023),
      arcSeg,
      phi,
      0.38,
    );
    welt.scale(1, 1, DEPTH);
    parts.push({
      key: `detail_welt_${label}`,
      material: 'shellDeep',
      geometry: welt,
      explode: [side * 0.2, -0.08, 0.3],
      packScale: [0.94, 0.58, 1.04],
    });
  }

  // Hem band.
  const hem = new THREE.LatheGeometry(
    profileSlice(-0.688, -0.782, 4, 0.007),
    s.lathe,
    0,
    Math.PI * 2,
  );
  hem.scale(1, 1, DEPTH);
  parts.push({
    key: 'shell_hem',
    material: 'shellDeep',
    geometry: hem,
    explode: [0, -0.3, 0],
    packScale: [0.94, 0.58, 1.04],
    packPosition: [0, 0.22, 0],
  });

  // Drawcord tips — single-hand adjust, tails routed inside.
  for (const side of [1, -1] as const) {
    const tip = new THREE.CapsuleGeometry(0.011, 0.03, 3, 8);
    tip.rotateX(0.35);
    tip.translate(side * 0.072, -0.792, radiusAtY(-0.75) * DEPTH + 0.012);
    parts.push({
      key: `hardware_cord_${side === 1 ? 'r' : 'l'}`,
      material: 'hardware',
      geometry: tip,
      explode: [side * 0.1, -0.34, 0.1],
      vanish: [0.18, 0.4],
      noClamp: true,
    });
  }

  return parts;
}

/**
 * The carry state. These parts do not exist while the shell is worn — they
 * resolve out of the fold as the internal webbing takes the load.
 */
function buildCarry(q: JacketQuality): JacketPart[] {
  const s = SEG[q];
  const parts: JacketPart[] = [];
  const [hx, hy, hz] = CARRY_BOX.half;

  // Shoulder strap — the internal webbing, now bearing the packed unit.
  const strapPath = new THREE.CatmullRomCurve3(
    [
      new THREE.Vector3(-hx * 0.86, hy * 0.55, 0),
      new THREE.Vector3(-hx * 1.02, hy * 1.9, -0.012),
      new THREE.Vector3(0, hy * 2.35, -0.018),
      new THREE.Vector3(hx * 1.02, hy * 1.9, -0.012),
      new THREE.Vector3(hx * 0.86, hy * 0.55, 0),
    ],
    false,
    'catmullrom',
    0.4,
  );
  const strap = new THREE.ExtrudeGeometry(roundedRect(0.036, 0.007, 0.003), {
    extrudePath: strapPath,
    steps: Math.max(24, s.tube),
    bevelEnabled: false,
    curveSegments: s.curve,
  });
  parts.push({
    key: 'carry_strap',
    material: 'webbing',
    geometry: strap,
    appear: [0.52, 0.88],
    noClamp: true,
    castShadow: true,
  });

  // Ladder-lock buckle.
  const buckleOuter = roundedRect(0.05, 0.034, 0.006);
  buckleOuter.holes.push(new THREE.Path(roundedRect(0.036, 0.012, 0.004).getPoints(24)));
  const buckle = extrude(buckleOuter, 0.008, q);
  buckle.rotateZ(-0.24);
  buckle.translate(hx * 0.9, hy * 0.86, 0);
  parts.push({
    key: 'carry_buckle',
    material: 'hardware',
    geometry: buckle,
    appear: [0.6, 0.92],
    noClamp: true,
  });

  // Perimeter zip on the carry face.
  const zipOuter = roundedRect(hx * 1.76, hy * 1.7, 0.05);
  zipOuter.holes.push(new THREE.Path(roundedRect(hx * 1.72, hy * 1.62, 0.048).getPoints(48)));
  const carryZip = extrude(zipOuter, 0.005, q);
  carryZip.translate(0, 0, hz + 0.004);
  parts.push({
    key: 'carry_zip',
    material: 'hardware',
    geometry: carryZip,
    appear: [0.58, 0.9],
    noClamp: true,
  });

  // Carry tag.
  const tag = extrude(roundedRect(0.072, 0.026, 0.005), 0.004, q);
  tag.translate(hx * 0.5, -hy * 0.72, hz + 0.006);
  parts.push({
    key: 'carry_tag',
    material: 'webbing',
    geometry: tag,
    appear: [0.68, 0.96],
    noClamp: true,
  });

  return parts;
}

export const JACKET_STAGES: BuildStage[] = [
  { label: 'Shell body', build: buildBody },
  { label: 'Sleeves', build: buildSleeves },
  { label: 'Hood', build: buildHood },
  { label: 'Closure', build: buildClosure },
  { label: 'Pockets and hem', build: buildDetails },
  { label: 'Carry system', build: buildCarry },
];

/** Builds every stage at once. Used by the transformation scene's warm start. */
export function buildJacketParts(quality: JacketQuality): JacketPart[] {
  return JACKET_STAGES.flatMap((stage) => stage.build(quality));
}

/** Frees every buffer a part list is holding. Call this on unmount. */
export function disposeParts(parts: JacketPart[]) {
  for (const part of parts) part.geometry.dispose();
}

export type PartMotion = Pick<
  JacketPart,
  'explode' | 'packPosition' | 'packRotation' | 'packScale' | 'appear' | 'vanish' | 'noClamp'
>;

/**
 * The motion table, keyed by part name and stripped of geometry.
 *
 * A real GLB export uses these same node names (see public/models/README.md),
 * so an exported Meridian folds, explodes and packs on exactly the choreography
 * the procedural shell was built against — no second animation system.
 */
export function jacketPartMotion(): Record<string, PartMotion> {
  const table: Record<string, PartMotion> = {};
  for (const part of buildJacketParts('low')) {
    table[part.key] = {
      explode: part.explode,
      packPosition: part.packPosition,
      packRotation: part.packRotation,
      packScale: part.packScale,
      appear: part.appear,
      vanish: part.vanish,
      noClamp: part.noClamp,
    };
    part.geometry.dispose();
  }
  return table;
}

export const jacketGeometryInternals = { radiusAtY, profileSlice, surfaceAngle, DEPTH };
