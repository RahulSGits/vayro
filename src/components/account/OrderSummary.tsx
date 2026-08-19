import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn, formatDate, formatPrice, pluralise } from '@/lib/utils';
import type { Order } from '@/types';
import { OrderStatusChip } from './OrderStatusTimeline';

/* ==========================================================================
   OrderSummary — one order as a hairline row.

   Thumbnails first, because that is how people recognise their own order.
   The number and the date are the technical register; the total is the only
   figure given weight.
   ========================================================================== */

export function OrderSummary({ order, className }: { order: Order; className?: string }) {
  const units = order.items.reduce((total, item) => total + item.quantity, 0);
  const thumbnails = order.items.slice(0, 3);
  const overflow = order.items.length - thumbnails.length;

  return (
    <article
      className={cn(
        'group relative border-b border-[var(--border)] py-8 first:border-t',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--border-strong)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
        <div className="flex min-w-0 items-start gap-5">
          <div className="flex shrink-0 -space-x-3">
            {thumbnails.map((item) => (
              <div
                key={item.id}
                className="relative h-16 w-14 overflow-hidden border border-[var(--border)] bg-[var(--bg-sunken)]"
              >
                {item.image ? (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
            ))}
            {overflow > 0 ? (
              <div className="relative flex h-16 w-14 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--bg-elevated)]">
                <span className="t-spec text-[var(--fg-muted)]">+{overflow}</span>
              </div>
            ) : null}
          </div>

          <div className="min-w-0">
            <Link
              href={`/account/orders/${order.orderNumber}`}
              data-cursor="link"
              className="t-h3 inline-flex items-center gap-2 transition-opacity duration-[var(--d-fast)] hover:opacity-60"
            >
              <span className="t-spec text-[1rem] tracking-[0.08em]">{order.orderNumber}</span>
              <ArrowUpRight
                size={15}
                strokeWidth={1.25}
                strokeLinecap="square"
                strokeLinejoin="miter"
                aria-hidden
                className="translate-y-px opacity-0 transition-opacity duration-[var(--d-fast)] group-hover:opacity-60"
              />
              <span className="sr-only">View order {order.orderNumber}</span>
            </Link>
            <p className="t-body-sm mt-2 text-[var(--fg-muted)]">
              {formatDate(order.placedAt)} · {pluralise(units, 'item')}
            </p>
            <div className="mt-3">
              <OrderStatusChip status={order.status} />
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="t-price-lg tabular-nums">{formatPrice(order.total, order.currency)}</p>
          {order.trackingNumber ? (
            <p className="t-spec mt-2 text-[var(--fg-subtle)]">
              {order.carrier ? `${order.carrier} · ` : ''}
              {order.trackingNumber}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
