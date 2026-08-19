import { PATTERN_TILE, PATTERN_PATH } from '@/lib/brand-art';

type Props = {
  /** 0–1. Keep at or below 0.14 — the pattern must never compete with product. */
  opacity?: number;
  /** Tile size in px. */
  scale?: number;
  className?: string;
};

/**
 * The VAYRO contour field — repeated chevron topography.
 * Ambient texture only: it sits behind content and is never a focal element.
 */
export function ContourField({ opacity = 0.1, scale = 120, className }: Props) {
  const id = `contour-${scale}`;
  return (
    <svg className={className} aria-hidden="true" focusable="false"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <pattern id={id} width={scale} height={scale} patternUnits="userSpaceOnUse"
          viewBox={`0 0 ${PATTERN_TILE} ${PATTERN_TILE}`}>
          <path d={PATTERN_PATH} fill="none" stroke="currentColor"
            strokeWidth={1.6} strokeLinejoin="round" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} opacity={opacity} />
    </svg>
  );
}
