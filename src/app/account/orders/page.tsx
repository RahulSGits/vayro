import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, EmptyState } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { cn, pluralise } from '@/lib/utils';
import { getMyOrders } from '../data';
import { PageHeading } from '@/components/account/AccountShell';
import { OrderSummary } from '@/components/account/OrderSummary';
import type { Order, OrderStatus } from '@/types';

export const metadata: Metadata = {
  title: 'Orders',
  description: 'Every VAYRO order on your account, with live fulfilment status.',
};

type FilterKey = 'all' | 'open' | 'delivered' | 'closed';

const FILTERS: { key: FilterKey; label: string; match: (status: OrderStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  {
    key: 'open',
    label: 'In progress',
    match: (status) => status === 'pending' || status === 'paid' || status === 'processing' || status === 'shipped',
  },
  { key: 'delivered', label: 'Delivered', match: (status) => status === 'delivered' },
  {
    key: 'closed',
    label: 'Cancelled & refunded',
    match: (status) => status === 'cancelled' || status === 'refunded',
  },
];

function countFor(orders: Order[], key: FilterKey) {
  const filter = FILTERS.find((entry) => entry.key === key);
  if (!filter) return 0;
  return orders.filter((order) => filter.match(order.status)).length;
}

export default async function OrdersPage(props: PageProps<'/account/orders'>) {
  const [searchParams] = await Promise.all([props.searchParams, requireUser()]);
  const orders = await getMyOrders();

  const requested = typeof searchParams.status === 'string' ? searchParams.status : 'all';
  const active = FILTERS.find((filter) => filter.key === requested) ?? FILTERS[0];
  const visible = orders.filter((order) => active.match(order.status));

  return (
    <div className="flex flex-col gap-14">
      <PageHeading
        eyebrow="Orders"
        title="Order history"
        lede={
          orders.length === 0
            ? 'Nothing here yet.'
            : `${pluralise(orders.length, 'order')} on this account.`
        }
      />

      {orders.length > 0 ? (
        <nav aria-label="Filter orders">
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-[var(--border)] pb-4">
            {FILTERS.map((filter) => {
              const count = countFor(orders, filter.key);
              const selected = filter.key === active.key;
              return (
                <li key={filter.key}>
                  <Link
                    href={filter.key === 'all' ? '/account/orders' : `/account/orders?status=${filter.key}`}
                    aria-current={selected ? 'true' : undefined}
                    data-cursor="link"
                    className={cn(
                      't-label inline-flex items-baseline gap-2 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                      selected ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]',
                      count === 0 && !selected ? 'opacity-45' : '',
                    )}
                  >
                    {filter.label}
                    <span className="t-spec text-[var(--fg-subtle)]">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}

      {visible.length > 0 ? (
        <div>
          {visible.map((order) => (
            <OrderSummary key={order.id} order={order} />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          body="When you place an order, it appears here with its fulfilment status and tracking."
          action={<ButtonLink href="/shop" size="md">Browse the shop</ButtonLink>}
        />
      ) : (
        <EmptyState
          title={`Nothing under “${active.label}”`}
          body="Try another filter — the rest of your orders are still here."
          action={<ButtonLink href="/account/orders" variant="secondary" size="md">Show all orders</ButtonLink>}
        />
      )}
    </div>
  );
}
