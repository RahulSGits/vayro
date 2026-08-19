import { Reveal, RevealChild } from '@/components/ui/Reveal';
import { ContourField } from '@/components/brand';
import { cn } from '@/lib/utils';

/* ==========================================================================
   StatBand — the measured band.

   Every figure on this band is lifted from a product's own specification
   table. Nothing is rounded for effect and nothing is invented: if the
   catalogue does not publish a number, it does not appear here.
   ========================================================================== */

export type Stat = {
  /** Verbatim from the spec table — '318 g', '2.1 L', '24 × 16 × 9 cm'. */
  figure: string;
  label: string;
  note?: string;
  /** Set on figures too long for a single cell — a dimension triple, say. */
  wide?: boolean;
};

/**
 * Separates the numeral from its unit so the unit can be set smaller without
 * anyone having to re-type the figure. Anything unparseable is left whole.
 */
function splitFigure(figure: string): { value: string; unit: string } {
  const match = figure.match(/^([\d.,]+(?:\s*×\s*[\d.,]+)*)\s*(.*)$/);
  if (!match) return { value: figure, unit: '' };
  return { value: match[1].trim(), unit: match[2].trim() };
}

export function StatBand({
  stats,
  eyebrow = 'Measured',
  caption,
  className,
}: {
  stats: Stat[];
  eyebrow?: string;
  caption?: string;
  className?: string;
}) {
  if (stats.length === 0) return null;

  return (
    <section
      data-surface="inverse"
      aria-label="Measured specifications"
      className={cn('relative isolate overflow-hidden', className)}
    >
      <ContourField opacity={0.06} scale={150} className="-z-10 text-[var(--fg)]" />

      <div className="shell section-tight">
        <p className="t-label flex items-center gap-4 text-[var(--fg-subtle)]">
          <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
          {eyebrow}
        </p>

        <Reveal
          variant="stagger"
          as="ul"
          className="mt-12 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-6"
        >
          {stats.map((stat) => {
            const { value, unit } = splitFigure(stat.figure);
            return (
              <RevealChild
                as="li"
                key={stat.label}
                className={cn(
                  'flex flex-col justify-between bg-[var(--bg)] p-6 lg:p-7',
                  stat.wide && 'sm:col-span-2',
                )}
              >
                <p className="t-h1 flex items-baseline gap-1.5 whitespace-nowrap">
                  <span>{value}</span>
                  {unit ? (
                    <span className="t-spec text-[var(--fg-subtle)]">{unit}</span>
                  ) : null}
                </p>
                <div className="mt-8">
                  <p className="t-label-sm text-[var(--fg)]">{stat.label}</p>
                  {stat.note ? (
                    <p className="t-caption t-pretty mt-2 text-[var(--fg-muted)]">{stat.note}</p>
                  ) : null}
                </div>
              </RevealChild>
            );
          })}
        </Reveal>

        {caption ? (
          <p className="t-caption t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-subtle)]">
            {caption}
          </p>
        ) : null}
      </div>
    </section>
  );
}
