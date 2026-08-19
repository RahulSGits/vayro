import { SYMBOL_PATH, SYMBOL_MICRO_PATH } from '@/lib/brand-art';

type Props = {
  /** Rendered size in px. Below 22 the micro optical cut is used automatically. */
  size?: number | string;
  /** Force an optical cut instead of letting `size` decide. */
  cut?: 'auto' | 'regular' | 'micro';
  className?: string;
  title?: string;
};

/**
 * The VAYRO symbol — a chevron whose ascending arm turns.
 * Inherits `currentColor`; never hard-code a fill on it.
 */
export function VayroMark({ size = 24, cut = 'auto', className, title }: Props) {
  const numeric = typeof size === 'number' ? size : Number.parseFloat(String(size));
  const useMicro =
    cut === 'micro' || (cut === 'auto' && Number.isFinite(numeric) && numeric <= 22);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={useMicro ? SYMBOL_MICRO_PATH : SYMBOL_PATH} />
    </svg>
  );
}
