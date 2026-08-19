import { GLYPH_PATHS, WORDMARK_WIDTH, CAP_HEIGHT, TRACKING } from '@/lib/brand-art';

type Props = {
  /** Cap height in px. */
  height?: number;
  /** Extra tracking in wordmark units (cap height = 100). */
  track?: number;
  className?: string;
  title?: string;
};

/** The custom VAYRO wordmark. Drawn as outlines — never as live text. */
export function VayroWordmark({ height = 16, track = TRACKING, className, title = 'VAYRO' }: Props) {
  let x = 0;
  const glyphs = 'VAYRO'.split('').map((ch) => {
    const g = GLYPH_PATHS[ch];
    const node = (
      <path key={`${ch}-${x}`} d={g.d} transform={`translate(${x} 0)`} />
    );
    x += g.w + track;
    return node;
  });
  const width = x - track;

  return (
    <svg
      viewBox={`0 0 ${width} ${CAP_HEIGHT}`}
      height={height}
      width={(height * width) / CAP_HEIGHT}
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
      focusable="false"
    >
      <title>{title}</title>
      {glyphs}
    </svg>
  );
}

export { WORDMARK_WIDTH, CAP_HEIGHT };
