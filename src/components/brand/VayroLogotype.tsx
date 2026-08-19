import { LOGOTYPE, LOGOTYPE_STACKED } from '@/lib/brand-art';

type Props = {
  /** Cap height in px for `horizontal`; symbol height for `stacked`. */
  height?: number;
  variant?: 'horizontal' | 'stacked';
  className?: string;
  title?: string;
};

/**
 * The VAYRO logotype — the symbol standing in for the V of the word, so the
 * mark and the name are a single form rather than a lockup of two.
 *
 * Use this where the brand signs itself: the masthead, packaging, campaign
 * end-frames. Where a mark has to work alone — favicon, zip pull, embroidery —
 * use `VayroMark`, which carries the optical size system.
 *
 * Never re-space it: the gap after the symbol is intentionally tighter than the
 * tracking between the remaining letters, because the symbol's ascending arm is
 * vertical and leaves more optical air than a drawn V's diagonal would.
 */
export function VayroLogotype({
  height = 24,
  variant = 'horizontal',
  className,
  title = 'VAYRO',
}: Props) {
  const art = variant === 'stacked' ? LOGOTYPE_STACKED : LOGOTYPE;
  // `height` sets the cap height; the SVG's own box is taller for the stacked
  // cut, so scale from the art's intrinsic ratio rather than assuming 1:1.
  const renderedHeight = variant === 'stacked' ? height * (art.height / 100) : height;
  const width = (renderedHeight * art.width) / art.height;

  return (
    <svg
      viewBox={`0 0 ${art.width} ${art.height}`}
      height={renderedHeight}
      width={width}
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: `<title>${title}</title>${art.inner}` }}
    />
  );
}
