import { ImageResponse } from 'next/og';
import {
  CAP_HEIGHT,
  GLYPH_PATHS,
  PATTERN_PATH,
  PATTERN_TILE,
  SYMBOL_PATH,
  TRACKING,
} from '@/lib/brand-art';
import { palette, semantic } from '@/lib/design-tokens';
import { SITE } from '@/lib/seo';

/* ==========================================================================
   Default Open Graph card — generated, not photographed.

   An ink field, the VAYRO lockup drawn from the real brand geometry, the
   tagline set large, and a specification strip on a hairline. This is the
   card every route inherits unless it declares its own.

   Satori (the renderer behind `next/og`) supports flexbox and a subset of
   CSS — no grid, no CSS variables, no `color-mix`. Colour therefore comes
   from `@/lib/design-tokens`, which is the same source `globals.css`
   mirrors, rather than from literals typed in here. Brand marks are handed
   over as SVG data URIs because that is the one vector path Satori rasterises
   faithfully at any scale.
   ========================================================================== */

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/* ------------------------------------------------------------- brand art -- */

const ink = semantic.dark;

function dataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/** The symbol, filled flat. `fill` is explicit — Satori has no currentColor. */
function symbolSvg(fill: string): string {
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`
      + `<path d="${SYMBOL_PATH}" fill="${fill}"/>`
      + `</svg>`,
  );
}

/**
 * The wordmark, composed from the outline glyphs on the same advance-width
 * and tracking maths as `<VayroWordmark>`. Live text is never used for it.
 */
function wordmarkSvg(fill: string): { uri: string; ratio: number } {
  let x = 0;
  const paths = 'VAYRO'
    .split('')
    .map((character) => {
      const glyph = GLYPH_PATHS[character];
      const path = `<path d="${glyph.d}" transform="translate(${x} 0)" fill="${fill}"/>`;
      x += glyph.w + TRACKING;
      return path;
    })
    .join('');
  const width = x - TRACKING;

  return {
    uri: dataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CAP_HEIGHT}">${paths}</svg>`,
    ),
    ratio: width / CAP_HEIGHT,
  };
}

/** The contour field, tiled across the full card at the usual low contrast. */
function contourSvg(stroke: string, opacity: number): string {
  return dataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" `
      + `viewBox="0 0 ${size.width} ${size.height}">`
      + `<defs><pattern id="contour" width="${PATTERN_TILE}" height="${PATTERN_TILE}" `
      + `patternUnits="userSpaceOnUse" viewBox="0 0 ${PATTERN_TILE} ${PATTERN_TILE}">`
      + `<path d="${PATTERN_PATH}" fill="none" stroke="${stroke}" stroke-width="1.6" `
      + `stroke-linejoin="round"/></pattern></defs>`
      + `<rect width="100%" height="100%" fill="url(#contour)" opacity="${opacity}"/>`
      + `</svg>`,
  );
}

/* ------------------------------------------------------------------ card -- */

const WORDMARK_CAP = 34;
const SYMBOL_SIZE = 46;

/** Specification strip — factual, drawn from the Meridian's real numbers. */
const SPECS = ['PACKABLE', 'WEATHER RESISTANT', '2.1 L CARRY'];

export default function OpengraphImage() {
  const wordmark = wordmarkSvg(palette.ivory);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          backgroundColor: ink.bg,
          color: ink.fg,
          padding: '68px 76px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Ambient topography, then an oversized ghost of the mark bled off
            the right edge. Both sit under everything and read as texture. */}
        <img
          src={contourSvg(palette.ivory, 0.07)}
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', top: 0, left: 0 }}
          alt=""
        />
        <img
          src={symbolSvg(palette.graphite)}
          width={600}
          height={600}
          style={{ position: 'absolute', top: -132, left: 826, opacity: 0.6 }}
          alt=""
        />

        {/* ----------------------------------------------------------- head */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <img src={symbolSvg(palette.ivory)} width={SYMBOL_SIZE} height={SYMBOL_SIZE} alt="" />
          <img
            src={wordmark.uri}
            width={Math.round(WORDMARK_CAP * wordmark.ratio)}
            height={WORDMARK_CAP}
            style={{ marginLeft: 26 }}
            alt=""
          />
        </div>

        {/* --------------------------------------------------------- stated */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 15,
              letterSpacing: '0.26em',
              color: ink.fgSubtle,
              marginBottom: 34,
            }}
          >
            TRAVEL OUTERWEAR
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 96,
              lineHeight: 1.02,
              letterSpacing: '-0.035em',
            }}
          >
            <div style={{ display: 'flex' }}>One layer.</div>
            <div style={{ display: 'flex' }}>Every destination.</div>
          </div>
        </div>

        {/* ---------------------------------------------------------- specs */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ display: 'flex', height: 1, backgroundColor: ink.border }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 26,
            }}
          >
            <div style={{ display: 'flex', fontSize: 20, color: ink.fgMuted }}>
              Engineered for lighter travel.
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {SPECS.map((spec, index) => (
                <div key={spec} style={{ display: 'flex', alignItems: 'center' }}>
                  {index > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        width: 4,
                        height: 4,
                        margin: '0 18px',
                        backgroundColor: ink.fgSubtle,
                      }}
                    />
                  ) : null}
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 14,
                      letterSpacing: '0.22em',
                      color: ink.fgSubtle,
                    }}
                  >
                    {spec}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
