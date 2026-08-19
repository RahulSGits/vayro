import { VayroMark } from './VayroMark';
import { VayroWordmark } from './VayroWordmark';
import { LOCKUP_SYMBOL_RATIO, LOCKUP_GAP_RATIO } from '@/lib/brand-art';

type Props = {
  /** 'horizontal' for headers and wide spaces, 'stacked' for hero and packaging. */
  variant?: 'horizontal' | 'stacked';
  /** Wordmark cap height in px. Symbol scales from it. */
  cap?: number;
  className?: string;
};

/**
 * Symbol + wordmark, at the locked optical relationship.
 * The two are drawn at matched stem weight — never rescale one independently.
 */
export function VayroLockup({ variant = 'horizontal', cap = 16, className }: Props) {
  const symbolPx = cap * LOCKUP_SYMBOL_RATIO;
  const gap = cap * LOCKUP_GAP_RATIO;

  if (variant === 'stacked') {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: cap * 0.3 }}
      >
        <VayroMark size={cap * 2.55} cut="regular" />
        <VayroWordmark height={cap} />
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap }}
      aria-label="VAYRO"
    >
      <VayroMark size={symbolPx} cut="regular" />
      <VayroWordmark height={cap} title="" />
    </span>
  );
}
