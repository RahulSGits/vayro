import { cn } from '@/lib/utils';
import type { OrderStatus, ProductStatus } from '@/types';

/* ==========================================================================
   Status marks.
   A hairline square in a semantic colour plus the word — never colour alone,
   so the state survives greyscale, low vision and a printed picking sheet.
   ========================================================================== */

const ORDER_TONE: Record<OrderStatus, string> = {
  pending: 'var(--fg-subtle)',
  paid: 'var(--positive)',
  processing: 'var(--warning)',
  shipped: 'var(--accent)',
  delivered: 'var(--positive)',
  cancelled: 'var(--fg-subtle)',
  refunded: 'var(--danger)',
};

const PRODUCT_TONE: Record<ProductStatus, string> = {
  published: 'var(--positive)',
  draft: 'var(--warning)',
  archived: 'var(--fg-subtle)',
};

function Pill({ tone, label, className }: { tone: string; label: string; className?: string }) {
  return (
    <span
      className={cn(
        't-label-sm inline-flex items-center gap-2 whitespace-nowrap text-[var(--fg-muted)]',
        className,
      )}
    >
      <span aria-hidden className="h-[7px] w-[7px] shrink-0" style={{ backgroundColor: tone }} />
      {label}
    </span>
  );
}

export function OrderStatusPill({ status, className }: { status: OrderStatus; className?: string }) {
  return <Pill tone={ORDER_TONE[status]} label={status} className={className} />;
}

export function ProductStatusPill({ status, className }: { status: ProductStatus; className?: string }) {
  return <Pill tone={PRODUCT_TONE[status]} label={status} className={className} />;
}

export function StockPill({
  stock,
  threshold,
  className,
}: {
  stock: number;
  threshold: number;
  className?: string;
}) {
  const state = stock === 0 ? 'out' : stock <= threshold ? 'low' : 'ok';
  const tone = state === 'out' ? 'var(--danger)' : state === 'low' ? 'var(--warning)' : 'var(--positive)';
  const label = state === 'out' ? 'Out of stock' : state === 'low' ? 'Low' : 'In stock';
  return <Pill tone={tone} label={label} className={className} />;
}

/** Signed change against the previous period. Neutral when there is no basis. */
export function Delta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return (
      <span className="t-spec text-[var(--fg-subtle)]">
        {current === 0 ? 'no change' : 'no prior period'}
      </span>
    );
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change * 10) / 10;
  const rising = rounded > 0;
  const flat = rounded === 0;
  return (
    <span
      className="t-spec inline-flex items-center gap-1.5"
      style={{ color: flat ? 'var(--fg-subtle)' : rising ? 'var(--positive)' : 'var(--danger)' }}
    >
      <span aria-hidden>{flat ? '—' : rising ? '↑' : '↓'}</span>
      {Math.abs(rounded).toFixed(1)}%
      <span className="sr-only">{rising ? 'increase' : 'decrease'} versus the previous period</span>
    </span>
  );
}
