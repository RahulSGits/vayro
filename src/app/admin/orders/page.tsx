import { requireAdmin } from '@/lib/auth';
import { formatDate, formatPrice, pluralise } from '@/lib/utils';
import {
  EmptyRow, FilterTabs, OrderStatusPill, PageHeader, Pagination, Panel, RowLink, SearchField,
  StatStrip, TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import type { OrderStatus } from '@/types';
import { listOrders } from '../_data/queries';

export const metadata = { title: 'Orders' };

const STATUSES: (OrderStatus | 'all')[] = [
  'all', 'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

const PER_PAGE = 25;

export default async function AdminOrdersPage({ searchParams }: PageProps<'/admin/orders'>) {
  await requireAdmin();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };

  const query = one('q').trim();
  const statusParam = one('status');
  const status = (STATUSES as string[]).includes(statusParam) ? (statusParam as OrderStatus) : 'all';
  const page = Math.max(1, Number(one('page')) || 1);

  const { rows, total, counts } = await listOrders({ status, q: query, page, perPage: PER_PAGE });

  const preserve: Record<string, string> = {};
  if (query) preserve.q = query;
  if (status !== 'all') preserve.status = status;

  const openCount = counts.pending + counts.paid + counts.processing;
  const revenueOnPage = rows.reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Commerce"
        title="Orders"
        description="Every order, newest first. Status transitions are recorded against the order and drive the customer's notifications."
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'All orders', value: counts.all.toLocaleString('en-IN') },
          { label: 'Awaiting fulfilment', value: openCount.toLocaleString('en-IN'), tone: openCount > 0 ? 'warning' : 'default' },
          { label: 'Shipped', value: counts.shipped.toLocaleString('en-IN') },
          { label: 'Refunded', value: counts.refunded.toLocaleString('en-IN'), tone: counts.refunded > 0 ? 'danger' : 'default' },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FilterTabs
          basePath="/admin/orders"
          param="status"
          current={status}
          preserve={query ? { q: query } : {}}
          label="Filter by status"
          options={STATUSES.map((value) => ({
            value,
            label: value === 'all' ? 'All' : value,
            count: counts[value],
          }))}
        />
        <SearchField
          basePath="/admin/orders"
          preserve={status !== 'all' ? { status } : {}}
          defaultValue={query}
          label="Search orders"
          placeholder="Order number, email, tracking…"
          className="ml-auto w-full sm:w-80"
        />
      </div>

      <Panel
        className="mt-4"
        bleed
        footer={
          <Pagination
            basePath="/admin/orders"
            preserve={preserve}
            page={page}
            perPage={PER_PAGE}
            total={total}
          />
        }
      >
        <TableScroller>
          <Table caption="Orders">
            <THead>
              <TH width="9rem">Order</TH>
              <TH>Customer</TH>
              <TH width="10rem">Status</TH>
              <TH width="9rem">Items</TH>
              <TH align="right" width="9rem">Placed</TH>
              <TH align="right" width="9rem">Total</TH>
            </THead>
            <TBody>
              {rows.map((order) => {
                const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <TR key={order.id}>
                    <TD mono><RowLink href={`/admin/orders/${order.id}`} title={order.orderNumber} /></TD>
                    <TD>
                      <span className="block truncate">{order.shippingAddress?.fullName ?? order.email}</span>
                      <span className="t-caption block truncate text-[var(--fg-subtle)]">{order.email}</span>
                    </TD>
                    <TD>
                      <OrderStatusPill status={order.status} />
                      {order.trackingNumber ? (
                        <span className="t-spec mt-1 block text-[var(--fg-subtle)]">{order.carrier}</span>
                      ) : null}
                    </TD>
                    <TD>
                      <span className="block truncate">{pluralise(units, 'unit')}</span>
                      <span className="t-caption block truncate text-[var(--fg-subtle)]">
                        {order.items[0]?.name ?? '—'}
                        {order.items.length > 1 ? ` +${order.items.length - 1}` : ''}
                      </span>
                    </TD>
                    <TD align="right" mono>{formatDate(order.placedAt)}</TD>
                    <TD align="right" mono>{formatPrice(order.total, order.currency)}</TD>
                  </TR>
                );
              })}
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>
                  {query || status !== 'all'
                    ? 'No orders match this view.'
                    : 'No orders yet. They will appear here the moment one is placed.'}
                </EmptyRow>
              ) : null}
            </TBody>
          </Table>
        </TableScroller>
      </Panel>

      {rows.length > 0 ? (
        <p className="t-spec mt-4 text-[var(--fg-subtle)]">
          {formatPrice(revenueOnPage, rows[0]!.currency)} across this page
        </p>
      ) : null}
    </div>
  );
}
