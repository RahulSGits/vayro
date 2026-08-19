import sharp from 'sharp';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../public/brand/', import.meta.url));
const png = fileURLToPath(new URL('../public/brand/png/', import.meta.url));
mkdirSync(png, { recursive: true });

const jobs = [
  ['vayro-symbol.svg', 'vayro-symbol', [256, 512, 1024]],
  ['vayro-symbol-ivory.svg', 'vayro-symbol-ivory', [256, 512, 1024]],
  ['vayro-wordmark.svg', 'vayro-wordmark', [1024, 2048]],
  ['vayro-wordmark-ivory.svg', 'vayro-wordmark-ivory', [1024, 2048]],
  ['vayro-lockup-horizontal.svg', 'vayro-lockup-horizontal', [1024, 2048]],
  ['vayro-lockup-horizontal-ivory.svg', 'vayro-lockup-horizontal-ivory', [1024, 2048]],
  ['vayro-lockup-stacked.svg', 'vayro-lockup-stacked', [1024]],
  ['vayro-lockup-stacked-ivory.svg', 'vayro-lockup-stacked-ivory', [1024]],
  ['vayro-logotype.svg', 'vayro-logotype', [1024, 2048]],
  ['vayro-logotype-ivory.svg', 'vayro-logotype-ivory', [1024, 2048]],
  ['vayro-logotype-stacked.svg', 'vayro-logotype-stacked', [1024]],
  ['vayro-logotype-stacked-ivory.svg', 'vayro-logotype-stacked-ivory', [1024]],
  ['vayro-app-icon.svg', 'vayro-app-icon', [180, 192, 512, 1024]],
  ['vayro-app-icon-round.svg', 'vayro-app-icon-round', [512]],
];

let n = 0;
for (const [src, base, widths] of jobs) {
  const buf = readFileSync(dir + src);
  for (const width of widths) {
    await sharp(buf, { density: 600 }).resize({ width }).png({ compressionLevel: 9 })
      .toFile(`${png}${base}-${width}.png`);
    n++;
  }
}
// favicon.ico-equivalent PNGs
const fav = readFileSync(dir + 'favicon.svg');
for (const s of [16, 32, 48]) {
  await sharp(fav, { density: 600 }).resize(s, s).png().toFile(`${png}favicon-${s}.png`);
  n++;
}
// app-level icons Next.js picks up
const appDir = fileURLToPath(new URL('../src/app/', import.meta.url));
await sharp(readFileSync(dir + 'vayro-app-icon.svg'), { density: 600 })
  .resize(180, 180).png().toFile(appDir + 'apple-icon.png');
await sharp(readFileSync(dir + 'vayro-app-icon.svg'), { density: 600 })
  .resize(512, 512).png().toFile(appDir + 'icon.png');
console.log(n + 2, 'PNG files written');
console.log(readdirSync(png).length, 'in public/brand/png');
