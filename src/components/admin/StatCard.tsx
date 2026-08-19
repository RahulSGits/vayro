import { cn } from '@/lib/utils';
import { Delta } from './StatusPill';
import { Sparkline, type Point } from './Charts';

/**
 * A single metric. Deliberately quiet: one number at display weight, one
 * comparison, and an optional trend behind it. No gradients, no icons, no
 * decoration that does not carry information.
 */
export function StatCard({
  label,
  value,
  unit,
  current,
  previous,
  series,
  footnote,
  accent = 'var(--fg)',
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  /** Supply both to render a period-over-period delta. */
  current?: number;
  previous?: number;
  series?: Point[];
  footnote?: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden border border-[var(--border)]',
        'rounded-[var(--r-sm)] bg-[var(--bg-elevated)] px-5 pt-5',
        series ? 'pb-0' : 'pb-5',
        className,
      )}
    >
      <p className="t-label-sm text-[var(--fg-subtle)]">{label}</p>

      <p className="mt-3 flex items-baseline gap-1.5">
        <span className="t-price-lg tabular-nums">{value}</span>
        {unit ? <span className="t-spec text-[var(--fg-subtle)]">{unit}</span> : null}
      </p>

      <div className="mt-2 flex min-h-5 items-center gap-3">
        {typeof current === 'number' && typeof previous === 'number' ? (
          <Delta current={current} previous={previous} />
        ) : null}
        {footnote ? <span className="t-caption truncate text-[var(--fg-subtle)]">{footnote}</span> : null}
      </div>

      {series ? (
        <div className="-mx-5 mt-4">
          <Sparkline data={series} accent={accent} height={38} />
        </div>
      ) : null}
    </div>
  );
}
