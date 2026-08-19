import { cn, formatDate } from '@/lib/utils';

/* ==========================================================================
   VAYRO admin charts — hand-drawn SVG, no library, no client JavaScript.

   Technique: plots are drawn in a normalised 0–100 space with
   `preserveAspectRatio="none"` so they stretch to any container width, and
   every stroke carries `vector-effect="non-scaling-stroke"` so hairlines stay
   exactly one pixel however far the shape is stretched. Nothing textual lives
   inside the SVG — labels are real HTML, so they never distort and always
   inherit the type scale.

   Colour comes from `currentColor` and the semantic tokens only, so every
   chart flips with the theme without a single re-render.

   Accessibility: each chart is a <figure> with a caption and a visually hidden
   data table, so the numbers are readable without seeing the drawing.
   ========================================================================== */

export type Point = { date: string; value: number };

const PLOT_W = 100;
const PLOT_H = 100;

function scale(values: number[]) {
  const max = Math.max(...values, 0);
  // A flat-zero series still needs a denominator, and a little headroom keeps
  // the peak off the top edge.
  return max === 0 ? 1 : max * 1.08;
}

function linePath(values: number[], max: number) {
  if (values.length === 0) return '';
  if (values.length === 1) return `M0,${(PLOT_H - (values[0]! / max) * PLOT_H).toFixed(3)} L${PLOT_W},${(PLOT_H - (values[0]! / max) * PLOT_H).toFixed(3)}`;
  const step = PLOT_W / (values.length - 1);
  return values
    .map((value, index) => {
      const x = (index * step).toFixed(3);
      const y = (PLOT_H - (value / max) * PLOT_H).toFixed(3);
      return `${index === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
}

function areaPath(values: number[], max: number) {
  const line = linePath(values, max);
  if (!line) return '';
  return `${line} L${PLOT_W},${PLOT_H} L0,${PLOT_H} Z`;
}

function DataTable({
  caption,
  rows,
  keyLabel,
  valueLabel,
}: {
  caption: string;
  rows: { key: string; value: string }[];
  keyLabel: string;
  valueLabel: string;
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{keyLabel}</th>
          <th scope="col">{valueLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.key}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------------- area ---- */

export function AreaChart({
  data,
  format,
  label,
  height = 200,
  accent = 'var(--fg)',
  gridLines = 4,
  className,
}: {
  data: Point[];
  /** Formats a raw value for the axis and the hover readout. */
  format: (value: number) => string;
  label: string;
  height?: number;
  accent?: string;
  gridLines?: number;
  className?: string;
}) {
  const values = data.map((point) => point.value);
  const max = scale(values);
  const peak = Math.max(...values, 0);
  const gradientId = `vayro-area-${label.replace(/\W+/g, '-').toLowerCase()}`;

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="flex gap-4">
        {/* y axis — HTML, so it keeps the type scale at every width */}
        <div
          className="t-spec flex w-16 shrink-0 flex-col justify-between text-right text-[var(--fg-subtle)]"
          style={{ height }}
          aria-hidden
        >
          <span>{format(peak)}</span>
          <span>{format(peak / 2)}</span>
          <span>{format(0)}</span>
        </div>

        <div className="relative min-w-0 flex-1" style={{ height }}>
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="none"
            className="h-full w-full overflow-visible"
            style={{ color: accent }}
            aria-hidden
            focusable="false"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0.01" />
              </linearGradient>
            </defs>

            {Array.from({ length: gridLines + 1 }, (_, index) => {
              const y = (index / gridLines) * PLOT_H;
              return (
                <line
                  key={index}
                  x1="0"
                  x2={PLOT_W}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}

            <path d={areaPath(values, max)} fill={`url(#${gradientId})`} />
            <path
              d={linePath(values, max)}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="square"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Hover columns. CSS-only: a hairline and a readout, no client JS. */}
          <div className="absolute inset-0 flex">
            {data.map((point) => (
              <div key={point.date} className="group/col relative flex-1">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--fg)] opacity-0 transition-opacity duration-[var(--d-fast)] group-hover/col:opacity-40"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-1.5 opacity-0 shadow-[var(--sh-md)] transition-opacity duration-[var(--d-fast)] group-hover/col:opacity-100"
                >
                  <span className="t-label-sm block text-[var(--fg-subtle)]">
                    {formatDate(point.date, { day: '2-digit', month: 'short', year: undefined })}
                  </span>
                  <span className="t-spec mt-1 block text-[var(--fg)]">{format(point.value)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <figcaption className="t-spec mt-3 flex justify-between pl-20 text-[var(--fg-subtle)]">
        <span>{data[0] ? formatDate(data[0].date, { day: '2-digit', month: 'short', year: undefined }) : ''}</span>
        <span>{data.at(-1) ? formatDate(data.at(-1)!.date, { day: '2-digit', month: 'short', year: undefined }) : ''}</span>
      </figcaption>

      <DataTable
        caption={label}
        keyLabel="Date"
        valueLabel="Value"
        rows={data.map((point) => ({ key: point.date, value: format(point.value) }))}
      />
    </figure>
  );
}

/* ------------------------------------------------------------ sparkline --- */

export function Sparkline({
  data,
  height = 34,
  accent = 'var(--fg)',
  className,
}: {
  data: Point[];
  height?: number;
  accent?: string;
  className?: string;
}) {
  const values = data.map((point) => point.value);
  const max = scale(values);
  return (
    <svg
      viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height, color: accent }}
      aria-hidden
      focusable="false"
    >
      <path d={areaPath(values, max)} fill="currentColor" opacity="0.07" />
      <path
        d={linePath(values, max)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* --------------------------------------------------------------- column --- */

export function ColumnChart({
  data,
  format,
  label,
  height = 190,
  accent = 'var(--fg)',
  className,
}: {
  data: { key: string; label: string; sublabel?: string; value: number }[];
  format: (value: number) => string;
  label: string;
  height?: number;
  accent?: string;
  className?: string;
}) {
  const max = scale(data.map((entry) => entry.value));

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="flex items-end gap-3" style={{ height }}>
        {data.map((entry) => {
          const ratio = entry.value / max;
          return (
            <div key={entry.key} className="group/bar flex h-full min-w-0 flex-1 flex-col justify-end">
              <p className="t-spec mb-2 truncate text-center text-[var(--fg-muted)]">{format(entry.value)}</p>
              <svg
                viewBox="0 0 10 100"
                preserveAspectRatio="none"
                className="w-full"
                style={{ height: `${Math.max(ratio * 100, 1.2)}%`, color: accent }}
                aria-hidden
                focusable="false"
              >
                <rect
                  x="0"
                  y="0"
                  width="10"
                  height="100"
                  fill="currentColor"
                  opacity="0.82"
                  className="transition-opacity duration-[var(--d-fast)] group-hover/bar:opacity-100"
                />
              </svg>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex gap-3 border-t border-[var(--border)] pt-3">
        {data.map((entry) => (
          <div key={entry.key} className="min-w-0 flex-1">
            <p className="t-caption truncate text-[var(--fg)]" title={entry.label}>{entry.label}</p>
            {entry.sublabel ? (
              <p className="t-spec truncate text-[var(--fg-subtle)]">{entry.sublabel}</p>
            ) : null}
          </div>
        ))}
      </div>

      <figcaption className="sr-only">{label}</figcaption>
      <DataTable
        caption={label}
        keyLabel="Item"
        valueLabel="Value"
        rows={data.map((entry) => ({ key: entry.label, value: format(entry.value) }))}
      />
    </figure>
  );
}

/* ----------------------------------------------------------- bar (rows) --- */

export function BarRows({
  data,
  format,
  label,
  accent = 'var(--fg)',
  className,
}: {
  data: { key: string; label: string; value: number; href?: string }[];
  format: (value: number) => string;
  label: string;
  accent?: string;
  className?: string;
}) {
  const max = scale(data.map((entry) => entry.value));

  return (
    <figure className={cn('min-w-0', className)}>
      <ul className="flex flex-col gap-4">
        {data.map((entry) => (
          <li key={entry.key} className="min-w-0">
            <div className="mb-2 flex items-baseline justify-between gap-4">
              <span className="t-body-sm truncate text-[var(--fg)]">{entry.label}</span>
              <span className="t-spec shrink-0 text-[var(--fg-muted)]">{format(entry.value)}</span>
            </div>
            <svg
              viewBox="0 0 100 4"
              preserveAspectRatio="none"
              className="h-1.5 w-full"
              style={{ color: accent }}
              aria-hidden
              focusable="false"
            >
              <rect x="0" y="0" width="100" height="4" fill="currentColor" opacity="0.09" />
              <rect x="0" y="0" width={Math.max((entry.value / max) * 100, 0.6)} height="4" fill="currentColor" />
            </svg>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{label}</figcaption>
      <DataTable
        caption={label}
        keyLabel="Item"
        valueLabel="Value"
        rows={data.map((entry) => ({ key: entry.label, value: format(entry.value) }))}
      />
    </figure>
  );
}

/* --------------------------------------------------------------- funnel --- */

export function FunnelChart({
  steps,
  label,
  className,
}: {
  steps: { name: string; label: string; count: number }[];
  label: string;
  className?: string;
}) {
  const top = steps[0]?.count ?? 0;

  return (
    <figure className={cn('min-w-0', className)}>
      <ol className="flex flex-col">
        {steps.map((step, index) => {
          const share = top === 0 ? 0 : (step.count / top) * 100;
          const previous = steps[index - 1];
          const stepRate = previous && previous.count > 0 ? (step.count / previous.count) * 100 : null;

          return (
            <li key={step.name} className="min-w-0">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="t-body-sm text-[var(--fg)]">{step.label}</span>
                <span className="t-spec text-[var(--fg-muted)]">
                  {step.count.toLocaleString('en-IN')}
                  <span className="ml-3 text-[var(--fg-subtle)]">{share.toFixed(1)}%</span>
                </span>
              </div>

              <svg
                viewBox="0 0 100 6"
                preserveAspectRatio="none"
                className="h-2.5 w-full"
                aria-hidden
                focusable="false"
              >
                <rect x="0" y="0" width="100" height="6" fill="var(--fg)" opacity="0.07" />
                <rect
                  x={(100 - Math.max(share, 0.8)) / 2}
                  y="0"
                  width={Math.max(share, 0.8)}
                  height="6"
                  fill="var(--fg)"
                  opacity={0.9 - index * 0.13}
                />
              </svg>

              {index < steps.length - 1 ? (
                <div className="flex items-center gap-3 py-3 pl-1">
                  <span aria-hidden className="h-4 w-px bg-[var(--border-strong)]" />
                  <span className="t-spec text-[var(--fg-subtle)]">
                    {stepRate === null ? 'no basis' : `${stepRate.toFixed(1)}% continue`}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

/* ---------------------------------------------------------------- donut --- */

export function DonutChart({
  segments,
  label,
  total,
  totalLabel,
  size = 148,
  className,
}: {
  segments: { key: string; label: string; value: number; color: string }[];
  label: string;
  total: number;
  totalLabel: string;
  size?: number;
  className?: string;
}) {
  const sum = segments.reduce((acc, segment) => acc + segment.value, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  // Arc geometry is accumulated, not mutated: each arc starts where the
  // previous one ended, so nothing is reassigned while React renders.
  type Arc = (typeof segments)[number] & { length: number; offset: number };
  const arcs = segments.reduce<Arc[]>((acc, segment) => {
    const previous = acc[acc.length - 1];
    const offset = previous ? previous.offset + previous.length : 0;
    return [...acc, { ...segment, length: (segment.value / sum) * circumference, offset }];
  }, []);

  return (
    <figure className={cn('flex flex-wrap items-center gap-8', className)}>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden focusable="false">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="t-price-lg">{total.toLocaleString('en-IN')}</span>
          <span className="t-label-sm mt-1 text-[var(--fg-subtle)]">{totalLabel}</span>
        </div>
      </div>

      <ul className="flex min-w-0 flex-1 flex-col gap-2.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden className="h-[7px] w-[7px] shrink-0" style={{ backgroundColor: segment.color }} />
              <span className="t-body-sm truncate text-[var(--fg-muted)]">{segment.label}</span>
            </span>
            <span className="t-spec shrink-0 text-[var(--fg)]">{segment.value.toLocaleString('en-IN')}</span>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}
