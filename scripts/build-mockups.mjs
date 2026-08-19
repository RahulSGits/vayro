/** VAYRO brand application mockups — apparel, hardware and packaging.
 *  Composites the locked mark over the generated material plates and simulates
 *  embroidery, deboss, laser-etch and woven-label finishes. */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as B from './brand.mjs';

const MEDIA = fileURLToPath(new URL('../public/media/', import.meta.url));
const OUT = fileURLToPath(new URL('../public/brand/applications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const { ink, ivory, stone, bone, graphite, sand } = B.COLOR;

const markSvg = (px, fill, opacity = 1) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 100 100">
    <path d="${B.SYMBOL.d}" fill="${fill}" opacity="${opacity}"/></svg>`);

const wordSvg = (capPx, fill, opacity = 1) => {
  const w = (capPx * B.WORDMARK.width) / B.CAP;
  return { buf: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(w)}" height="${capPx}" viewBox="0 0 ${B.WORDMARK.width} ${B.CAP}" fill="${fill}" opacity="${opacity}">${B.WORDMARK.svg}</svg>`), w: Math.round(w) };
};

/** Two offset copies fake the light break of a debossed / embroidered edge. */
const relief = (buf, size, left, top, { light = '#ffffff', dark = '#000000', depth = 3, la = 0.34, da = 0.46 } = {}) => ([
  { input: buf, left: left + depth, top: top + depth, blend: 'over' },
  { input: buf, left, top, blend: 'over' },
]);

async function plate(name, base, composites, { w, h } = {}) {
  let img = sharp(base);
  if (w && h) img = img.resize(w, h, { fit: 'cover' });
  const buf = await img.png().toBuffer();
  await sharp(buf).composite(composites).jpeg({ quality: 90, mozjpeg: true }).toFile(`${OUT}${name}.jpg`);
  return name;
}

const made = [];

/* ---------------------------------------------------- apparel: embroidery -- */
// Chest mark — quiet branding, ~34mm on a garment.
{
  const W = 1600, H = 1200;
  const m = markSvg(96, ivory, 0.96);
  const shadow = markSvg(96, '#000', 0.34);
  made.push(await plate('apparel-chest-mark', `${MEDIA}material-ripstop.jpg`, [
    { input: shadow, left: 322, top: 424 },
    { input: m, left: 320, top: 420 },
  ], { w: W, h: H }));
}
// Sleeve mark — smaller, uses the micro optical cut.
{
  const micro = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 100 100"><path d="${B.SYMBOL_MICRO.d}" fill="${ivory}" opacity="0.94"/></svg>`);
  made.push(await plate('apparel-sleeve-mark', `${MEDIA}material-shell.jpg`, [
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 100 100"><path d="${B.SYMBOL_MICRO.d}" fill="#000" opacity="0.4"/></svg>`), left: 774, top: 578 },
    { input: micro, left: 772, top: 574 },
  ], { w: 1600, h: 1200 }));
}
// Back — wordmark at scale, still restrained.
{
  const wm = wordSvg(70, ivory, 0.92);
  made.push(await plate('apparel-back-wordmark', `${MEDIA}material-twill.jpg`, [
    { input: wordSvg(70, '#000', 0.35).buf, left: Math.round(800 - wm.w / 2) + 3, top: 563 },
    { input: wm.buf, left: Math.round(800 - wm.w / 2), top: 560 },
  ], { w: 1600, h: 1200 }));
}
// Reflective mark — high-contrast, simulates retroreflective transfer.
{
  const m = markSvg(120, '#F7F7F5', 1);
  made.push(await plate('apparel-reflective-mark', `${MEDIA}studio-dark.jpg`, [
    { input: await sharp(markSvg(160, '#ffffff', 0.18)).blur(14).png().toBuffer(), left: 700, top: 640 },
    { input: m, left: 720, top: 660 },
  ], { w: 1600, h: 1600 }));
}

/* ------------------------------------------------------- hardware: etch ---- */
// Zipper pull — laser mark on anodised alloy.
{
  const W = 1200, H = 1200;
  const slab = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="al" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4A4E4C"/><stop offset="0.42" stop-color="#2A2D2B"/>
      <stop offset="0.58" stop-color="#3A3E3C"/><stop offset="1" stop-color="#1A1C1A"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="${ink}"/>
    <rect x="330" y="180" width="540" height="840" rx="18" fill="url(#al)"/>
    <rect x="330" y="180" width="540" height="840" rx="18" fill="none" stroke="#5C6360" stroke-width="2" opacity="0.7"/>
    <rect x="516" y="238" width="168" height="118" rx="10" fill="none" stroke="#0B0C0B" stroke-width="26" opacity="0.55"/>
  </svg>`);
  made.push(await plate('hardware-zipper-pull', slab, [
    { input: markSvg(210, '#0B0C0B', 0.62), left: 498, top: 560 },
    { input: markSvg(210, '#9AA09D', 0.30), left: 495, top: 557 },
  ]));
}

/* --------------------------------------------------------- labels ---------- */
// Woven neck label — ivory ground, ink mark, technical type.
{
  const W = 1400, H = 900;
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${ink}"/>
    <rect x="170" y="230" width="1060" height="440" fill="${bone}"/>
    <rect x="170" y="230" width="1060" height="440" fill="none" stroke="${stone}" stroke-width="3"/>
    <g font-family="ui-monospace, monospace" fill="${graphite}" font-size="26" letter-spacing="6">
      <text x="700" y="560" text-anchor="middle">ENGINEERED FOR THE WAY FORWARD</text>
    </g>
  </svg>`);
  const wm = wordSvg(52, ink, 1);
  made.push(await plate('label-woven-neck', label, [
    { input: markSvg(92, ink), left: 700 - 46, top: 300 },
    { input: wm.buf, left: 700 - Math.round(wm.w / 2), top: 440 },
  ]));
}
// Care label — technical aesthetic, mono type.
{
  const W = 1000, H = 1300;
  const rows = ['MERIDIAN CARRY SHELL', 'SHELL  20D RECYCLED RIPSTOP', 'WASH   COLD / GENTLE', 'DRY    LINE DRY ONLY', 'IRON   COOL, THROUGH CLOTH', 'NO SOFTENER · NO TUMBLE', 'MADE RESPONSIBLY'];
  const label = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${graphite}"/>
    <rect x="120" y="110" width="760" height="1080" fill="${ivory}"/>
    <g font-family="ui-monospace, monospace" fill="${ink}" font-size="27" letter-spacing="3.4">
      ${rows.map((r, i) => `<text x="180" y="${470 + i * 78}">${r}</text>`).join('')}
    </g>
    <rect x="180" y="1100" width="640" height="2" fill="${stone}"/>
  </svg>`);
  made.push(await plate('label-care', label, [{ input: markSvg(120, ink), left: 180, top: 200 }]));
}
// Hang tag — heavy ivory card, stacked lockup.
{
  const W = 1100, H = 1600;
  const ls = B.lockupStacked();
  const scale = 420 / ls.width;
  const lock = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="420" height="${Math.round(ls.height * scale)}" viewBox="0 0 ${ls.width} ${ls.height}" fill="${ink}">${ls.inner}</svg>`);
  const card = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${graphite}"/>
    <rect x="130" y="120" width="840" height="1360" fill="${ivory}"/>
    <circle cx="550" cy="240" r="26" fill="${graphite}"/>
    <g font-family="ui-monospace, monospace" fill="${graphite}" font-size="24" letter-spacing="5" text-anchor="middle">
      <text x="550" y="1180">318 g · 2.1 L PACKED · 20D</text>
      <text x="550" y="1250">MERIDIAN CARRY SHELL</text>
      <text x="550" y="1370">₹5,999</text>
    </g>
    <rect x="250" y="1290" width="600" height="1.6" fill="${stone}"/>
  </svg>`);
  made.push(await plate('packaging-hang-tag', card, [{ input: lock, left: 340, top: 420 }]));
}

/* ------------------------------------------------------- packaging -------- */
// Product box — matte ink with a debossed mark.
{
  const W = 1800, H = 1200;
  const box = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="lid" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="#181A18"/><stop offset="1" stop-color="#0B0C0B"/></linearGradient>
      <linearGradient id="side" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#101210"/><stop offset="1" stop-color="#070807"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="#151716"/>
    <path d="M300 300L1500 300L1500 820L300 820Z" fill="url(#lid)"/>
    <path d="M300 820L1500 820L1420 940L380 940Z" fill="url(#side)"/>
    <path d="M300 300L1500 300L1500 306L300 306Z" fill="#2A2D2B" opacity="0.7"/>
  </svg>`);
  made.push(await plate('packaging-product-box', box, [
    { input: markSvg(150, '#000000', 0.75), left: 828, top: 486 },
    { input: markSvg(150, '#4A4E4C', 0.30), left: 824, top: 482 },
  ]));
}
// Tissue paper — the contour field.
{
  const p = B.pattern({ size: 300 });
  const W = 1600, H = 1100;
  const tissue = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${bone}"/>
    <defs><pattern id="c" width="300" height="300" patternUnits="userSpaceOnUse" viewBox="0 0 300 300">
      <path d="${p.d}" fill="none" stroke="${stone}" stroke-width="2.4" stroke-linejoin="round" opacity="0.42"/>
    </pattern></defs>
    <rect width="${W}" height="${H}" fill="url(#c)"/>
  </svg>`);
  made.push(await plate('packaging-tissue', tissue, [{ input: markSvg(84, graphite, 0.35), left: 758, top: 508 }]));
}
// Garment bag + sticker
{
  const W = 1400, H = 1000;
  const bag = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="b" x1="0" y1="0" x2="0.5" y2="1">
      <stop offset="0" stop-color="#22251F"/><stop offset="1" stop-color="#12150F"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="${ink}"/>
    <rect x="220" y="120" width="960" height="760" rx="6" fill="url(#b)"/>
    <rect x="220" y="120" width="960" height="760" rx="6" fill="none" stroke="#3D4536" stroke-width="2"/>
    <rect x="600" y="120" width="200" height="34" rx="4" fill="#0B0C0B" opacity="0.6"/>
  </svg>`);
  const wm = wordSvg(34, bone, 0.9);
  made.push(await plate('packaging-garment-bag', bag, [
    { input: markSvg(76, bone, 0.9), left: 700 - 38, top: 420 },
    { input: wm.buf, left: 700 - Math.round(wm.w / 2), top: 530 },
  ]));
}
{
  const W = 900, H = 900;
  const sticker = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${sand}"/>
    <circle cx="450" cy="450" r="300" fill="${ink}"/>
    <circle cx="450" cy="450" r="300" fill="none" stroke="${bone}" stroke-width="3" opacity="0.4"/>
  </svg>`);
  made.push(await plate('packaging-sticker', sticker, [{ input: markSvg(260, ivory), left: 320, top: 320 }]));
}

console.log(made.length, 'application mockups written to public/brand/applications');
made.forEach((m) => console.log('  ' + m + '.jpg'));
