/** Generates VAYRO's placeholder imagery. These are real, art-directed plates —
 *  atmospheric terrain, material macros and studio fields built from the brand
 *  palette — so the site reads as designed until real photography replaces them.
 *  Every file is listed in docs/MEDIA.md with its intended replacement. */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../public/media/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const C = {
  ink: '#0B0C0B', ink80: '#1A1C1A', graphite: '#3A3E3C', slate: '#5C6360',
  titanium: '#8C9195', stone: '#B9B2A5', sand: '#D8D0C0', bone: '#EAE5DB',
  ivory: '#F4F1EA', forest: '#1E2C25', olive: '#3D4536', moss: '#5A6350',
};

/* deterministic PRNG so builds are reproducible */
const rng = (seed) => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

/** Layered ridge silhouettes — terrain without a cliché mountain icon. */
function ridges(w, h, { seed = 7, bands = 5, from, to, sky = [] }) {
  const rand = rng(seed);
  const layers = [];
  for (let b = 0; b < bands; b++) {
    const base = h * (0.42 + (b / bands) * 0.5);
    const amp = h * (0.16 - b * 0.02);
    const pts = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const y = base - Math.sin((i / steps) * Math.PI * (1.1 + b * 0.5) + b * 2.1) * amp
                     - rand() * amp * 0.45;
      pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    const mix = b / Math.max(1, bands - 1);
    layers.push(
      `<path d="M0 ${h}L0 ${pts[0].split(' ')[1]}L${pts.join('L')}L${w} ${h}Z" fill="url(#band${b})" opacity="${(0.9 - mix * 0.25).toFixed(2)}"/>`
      + `<linearGradient id="band${b}" x1="0" y1="0" x2="0" y2="1">`
      + `<stop offset="0" stop-color="${from}" stop-opacity="${(0.35 + mix * 0.5).toFixed(2)}"/>`
      + `<stop offset="1" stop-color="${to}" stop-opacity="1"/></linearGradient>`,
    );
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        ${sky.map((s, i) => `<stop offset="${i / (sky.length - 1)}" stop-color="${s}"/>`).join('')}
      </linearGradient>
      <radialGradient id="glow" cx="0.62" cy="0.28" r="0.6">
        <stop offset="0" stop-color="${C.bone}" stop-opacity="0.30"/>
        <stop offset="1" stop-color="${C.bone}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#sky)"/>
    <rect width="${w}" height="${h}" fill="url(#glow)"/>
    ${layers.join('')}
  </svg>`;
}

/** Woven material macro — ripstop / twill structure at high magnification. */
function weave(w, h, { seed = 3, warp = C.graphite, weft = C.ink80, bg = C.ink, ripstop = true }) {
  const rand = rng(seed);
  const pitch = 9;
  const lines = [];
  for (let x = 0; x < w + pitch; x += pitch) {
    const jitter = (rand() - 0.5) * 1.4;
    lines.push(`<rect x="${(x + jitter).toFixed(1)}" y="0" width="${(pitch * 0.52).toFixed(1)}" height="${h}" fill="${warp}" opacity="${(0.5 + rand() * 0.35).toFixed(2)}"/>`);
  }
  for (let y = 0; y < h + pitch; y += pitch) {
    const jitter = (rand() - 0.5) * 1.4;
    lines.push(`<rect x="0" y="${(y + jitter).toFixed(1)}" width="${w}" height="${(pitch * 0.46).toFixed(1)}" fill="${weft}" opacity="${(0.4 + rand() * 0.3).toFixed(2)}"/>`);
  }
  const grid = [];
  if (ripstop) {
    const cell = pitch * 7;
    for (let x = 0; x < w + cell; x += cell) grid.push(`<rect x="${x}" y="0" width="2.4" height="${h}" fill="${C.titanium}" opacity="0.30"/>`);
    for (let y = 0; y < h + cell; y += cell) grid.push(`<rect x="0" y="${y}" width="${w}" height="2.4" fill="${C.titanium}" opacity="0.30"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><radialGradient id="v" cx="0.5" cy="0.42" r="0.78">
      <stop offset="0" stop-color="#fff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.62"/>
    </radialGradient></defs>
    <rect width="${w}" height="${h}" fill="${bg}"/>
    ${lines.join('')}${grid.join('')}
    <rect width="${w}" height="${h}" fill="url(#v)"/>
  </svg>`;
}

/** Studio field — a soft sweep backdrop for product plates. */
function studio(w, h, { top = C.ink80, bottom = C.ink, floor = 0.72, warm = false }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${top}"/>
        <stop offset="${floor}" stop-color="${bottom}"/>
        <stop offset="1" stop-color="${bottom}"/>
      </linearGradient>
      <radialGradient id="key" cx="0.5" cy="${floor - 0.28}" r="0.52">
        <stop offset="0" stop-color="${warm ? C.sand : C.bone}" stop-opacity="0.22"/>
        <stop offset="1" stop-color="${warm ? C.sand : C.bone}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="shadow" cx="0.5" cy="${floor + 0.02}" r="0.36">
        <stop offset="0" stop-color="#000" stop-opacity="0.5"/>
        <stop offset="1" stop-color="#000" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#s)"/>
    <rect width="${w}" height="${h}" fill="url(#key)"/>
    <ellipse cx="${w / 2}" cy="${h * (floor + 0.03)}" rx="${w * 0.34}" ry="${h * 0.045}" fill="url(#shadow)"/>
  </svg>`;
}

/** Fine film grain, composited over every plate. */
async function grain(w, h, strength = 12) {
  const px = Buffer.alloc(w * h);
  const rand = rng(991);
  for (let i = 0; i < px.length; i++) px[i] = 128 + (rand() - 0.5) * strength * 2;
  return sharp(px, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
}

async function plate(name, w, h, svg, { grainStrength = 14, blur = 0 } = {}) {
  let img = sharp(Buffer.from(svg));
  if (blur) img = img.blur(blur);
  const base = await img.png().toBuffer();
  const g = await grain(w, h, grainStrength);
  const out = await sharp(base)
    .composite([{ input: g, blend: 'overlay', tile: true }])
    .toBuffer();
  await sharp(out).webp({ quality: 82 }).toFile(`${OUT}${name}.webp`);
  await sharp(out).jpeg({ quality: 84, mozjpeg: true }).toFile(`${OUT}${name}.jpg`);
  return name;
}

const made = [];
const W = 2000, H16 = 1125, H43 = 2666, HP = 2500;

/* editorial / campaign — landscape */
made.push(await plate('field-ridgeline', W, H16,
  ridges(W, H16, { seed: 11, bands: 6, from: C.slate, to: C.ink, sky: [C.ink80, C.graphite, C.stone] })));
made.push(await plate('field-dusk', W, H16,
  ridges(W, H16, { seed: 29, bands: 5, from: C.olive, to: C.ink, sky: [C.ink, C.forest, C.moss] })));
made.push(await plate('field-highpass', W, H16,
  ridges(W, H16, { seed: 47, bands: 7, from: C.titanium, to: C.ink80, sky: [C.bone, C.sand, C.stone] })));
made.push(await plate('field-coastal', W, H16,
  ridges(W, H16, { seed: 63, bands: 4, from: C.stone, to: C.graphite, sky: [C.ivory, C.bone, C.titanium] })));
made.push(await plate('field-transit', W, H16,
  ridges(W, H16, { seed: 81, bands: 3, from: C.graphite, to: C.ink, sky: [C.ink80, C.slate, C.stone] }), { blur: 6 }));

/* editorial — portrait, for split layouts */
made.push(await plate('field-ascent', 1500, 2000,
  ridges(1500, 2000, { seed: 17, bands: 6, from: C.forest, to: C.ink, sky: [C.ink80, C.olive, C.moss] })));
made.push(await plate('field-treeline', 1500, 2000,
  ridges(1500, 2000, { seed: 37, bands: 5, from: C.moss, to: C.ink80, sky: [C.stone, C.sand, C.bone] })));

/* material macros */
made.push(await plate('material-ripstop', 1600, 1600, weave(1600, 1600, { seed: 5 })));
made.push(await plate('material-twill', 1600, 1600, weave(1600, 1600, { seed: 23, warp: C.olive, weft: C.forest, bg: C.forest, ripstop: false })));
made.push(await plate('material-shell', 1600, 1600, weave(1600, 1600, { seed: 41, warp: C.slate, weft: C.graphite, bg: C.ink80 })));
made.push(await plate('material-liner', 1600, 1600, weave(1600, 1600, { seed: 59, warp: C.sand, weft: C.stone, bg: C.bone, ripstop: false })));

/* studio product fields — the plates the jacket renders sit on */
made.push(await plate('studio-dark', 1800, HP, studio(1800, HP, {})));
made.push(await plate('studio-light', 1800, HP, studio(1800, HP, { top: C.ivory, bottom: C.bone, warm: true })));
made.push(await plate('studio-forest', 1800, HP, studio(1800, HP, { top: C.forest, bottom: C.ink })));
made.push(await plate('studio-stone', 1800, HP, studio(1800, HP, { top: C.sand, bottom: C.stone, warm: true })));

console.log(made.length * 2, 'media files written to public/media');
made.forEach((m) => console.log('  ' + m + '.{webp,jpg}'));
