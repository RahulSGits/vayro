import { cn, formatDate } from '@/lib/utils';
import type { OrderStatus } from '@/types';

/* ==========================================================================
   OrderStatusTimeline

   One fulfilment story, told the same way in the customer's account and in the
   admin order view. No hooks, no client boundary — it renders anywhere.

   Only two timestamps exist on an order (`placed_at`, `updated_at`), so only
   two are shown. Inventing a plausible date for every step would look better
   and be a lie.
   ========================================================================== */

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Awaiting payment',
  paid: 'Payment confirmed',
  processing: 'Preparing',
  shipped: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

/** Maps a status onto the palette without hard-coding a colour anywhere. */
export function orderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'delivered':
      return 'var(--positive)';
    case 'cancelled':
    case 'refunded':
      return 'var(--danger)';
    case 'pending':
      return 'var(--warning)';
    default:
      return 'var(--fg)';
  }
}

type Step = { key: OrderStatus; label: string; note: string };

const STEPS: Step[] = [
  { key: 'pending', label: 'Order placed', note: 'We have the order.' },
  { key: 'paid', label: 'Payment confirmed', note: 'Funds cleared.' },
  { key: 'processing', label: 'Preparing', note: 'Picked, checked and packed.' },
  { key: 'shipped', label: 'In transit', note: 'Handed to the carrier.' },
  { key: 'delivered', label: 'Delivered', note: 'Signed for at the address.' },
];

const STEP_INDEX: Record<OrderStatus, number> = {
  pending: 0,
  paid: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
  cancelled: -1,
  refunded: -1,
};

export type OrderStatusTimelineProps = {
  status: OrderStatus;
  placedAt: string;
  updatedAt?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  /** Horizontal reads better across a wide admin table row. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * Renders the tracking number inside the "In transit" step. Turn it off on
   * screens that already show tracking elsewhere — the order detail page puts
   * a copyable version in its aside.
   */
  showTracking?: boolean;
  className?: string;
};

export function OrderStatusTimeline({
  status,
  placedAt,
  updatedAt,
  trackingNumber,
  carrier,
  orientation = 'vertical',
  showTracking = true,
  className,
}: OrderStatusTimelineProps) {
  const terminal = status === 'cancelled' || status === 'refunded';

  if (terminal) {
    return (
      <div className={cn('relative pl-6', className)}>
        <span
          aria-hidden
          className="absolute top-1.5 left-0 block h-2 w-2"
          style={{ background: 'var(--danger)' }}
        />
        <p className="t-label text-[var(--danger)]">{ORDER_STATUS_LABEL[status]}</p>
        <p className="t-body-sm mt-2 text-[var(--fg-muted)]">
          {status === 'cancelled'
            ? 'This order was cancelled before dispatch. Nothing was shipped.'
            : 'This order was refunded. Funds return to the original payment method.'}
        </p>
        <p className="t-spec mt-3 text-[var(--fg-subtle)]">
          Placed {formatDate(placedAt)}
          {updatedAt ? ` · Updated ${formatDate(updatedAt)}` : ''}
        </p>
      </div>
    );
  }

  const current = STEP_INDEX[status];

  if (orientation === 'horizontal') {
    return (
      <ol className={cn('flex w-full items-start gap-0', className)}>
        {STEPS.map((step, index) => {
          const reached = index <= current;
          const isCurrent = index === current;
          return (
            <li key={step.key} className="relative flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex items-center">
                <Node reached={reached} current={isCurrent} status={status} />
                {index < STEPS.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn('h-px flex-1', index < current ? 'bg-[var(--fg)]' : 'bg-[var(--border)]')}
                  />
                ) : null}
              </div>
              <span
                className={cn(
                  't-label-sm pr-3',
                  reached ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <div className={className}>
      <ol className="relative">
        {STEPS.map((step, index) => {
          const reached = index <= current;
          const isCurrent = index === current;
          const last = index === STEPS.length - 1;

          return (
            <li key={step.key} className="relative flex gap-5 pb-8 last:pb-0">
              <div className="relative flex flex-col items-center">
                <Node reached={reached} current={isCurrent} status={status} />
                {last ? null : (
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 w-px flex-1',
                      index < current ? 'bg-[var(--fg)]' : 'bg-[var(--border)]',
                    )}
                  />
                )}
              </div>

              <div className="-mt-1 min-w-0 flex-1 pb-1">
                <p
                  className={cn(
                    't-label',
                    reached ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                  )}
                >
                  {step.label}
                  {isCurrent ? (
                    <span className="text-[var(--fg-subtle)]">{' — current'}</span>
                  ) : null}
                </p>
                <p
                  className={cn(
                    't-body-sm mt-1.5',
                    reached ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)]',
                  )}
                >
                  {step.note}
                </p>

                {index === 0 ? (
                  <p className="t-spec mt-2 text-[var(--fg-subtle)]">{formatDate(placedAt)}</p>
                ) : null}
                {isCurrent && index > 0 && updatedAt ? (
                  <p className="t-spec mt-2 text-[var(--fg-subtle)]">{formatDate(updatedAt)}</p>
                ) : null}

                {step.key === 'shipped' && reached && showTracking && trackingNumber ? (
                  <div className="mt-4 border border-[var(--border)] p-4">
                    <p className="t-label-sm text-[var(--fg-subtle)]">
                      {carrier ? `${carrier} · Tracking` : 'Tracking'}
                    </p>
                    <p className="t-spec mt-2 text-[var(--fg)]">{trackingNumber}</p>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Node({
  reached,
  current,
  status,
}: {
  reached: boolean;
  current: boolean;
  status: OrderStatus;
}) {
  if (current) {
    return (
      <span
        aria-hidden
        className="relative flex h-3 w-3 shrink-0 items-center justify-center border"
        style={{ borderColor: orderStatusColor(status) }}
      >
        <span className="h-1 w-1" style={{ background: orderStatusColor(status) }} />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        'h-3 w-3 shrink-0 border',
        reached ? 'border-[var(--fg)] bg-[var(--fg)]' : 'border-[var(--border-strong)]',
      )}
    />
  );
}

/** Compact status chip. Shares the timeline's colour language. */
export function OrderStatusChip({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span className={cn('t-label-sm inline-flex items-center gap-2', className)}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 shrink-0"
        style={{ background: orderStatusColor(status) }}
      />
      <span style={{ color: orderStatusColor(status) }}>{ORDER_STATUS_LABEL[status]}</span>
    </span>
  );
}
