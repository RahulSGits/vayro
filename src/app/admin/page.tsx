import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatPrice, pluralise } from '@/lib/utils';
import {
  AreaChart, ColumnChart, DonutChart, EmptyRow, FilterTabs, OrderStatusPill, PageHeader, Panel,
  RowLink, StatCard, TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import type { OrderStatus } from '@/types';
import { getDashboard } from './_data/queries';

export const metadata = { title: 'Dashboard' };

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending: 'var(--titanium)',
  paid: 'var(--positive)',
  processing: 'var(--warning)',
  shipped: 'var(--moss)',
  delivered: 'var(--forest)',
  cancelled: 'var(--stone)',
  refunded: 'var(--danger)',
};

export default async function AdminDashboardPage({ searchParams }: PageProps<'/admin'>) {
  await requireAdmin();
  const params = await searchParams;
  const rangeParam = Array.isArray(params.range) ? params.range[0] : params.range;
  const days = RANGES.some((range) => range.value === rangeParam) ? Number(rangeParam) : 30;

  const data = await getDashboard(days);
  const currency = data.currency;
  const money = (value: number) => formatPrice(value, currency, { compact: true });

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`Trading performance across the last ${days} days, measured against the ${days} days before it.`}
        actions={
          <FilterTabs
            basePath="/admin"
            param="range"
            current={String(days)}
            options={RANGES}
            label="Reporting range"
          />
        }
      />

      {/* ----------------------------------------------------------- metrics */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatPrice(data.revenue, currency)}
          current={data.revenue}
          previous={data.revenuePrevious}
          series={data.revenueSeries}
        />
        <StatCard
          label="Orders"
          value={data.orderCount.toLocaleString('en-IN')}
          current={data.orderCount}
          previous={data.orderCountPrevious}
          series={data.orderSeries}
        />
        <StatCard
          label="New customers"
          value={data.customerCount.toLocaleString('en-IN')}
          current={data.customerCount}
          previous={data.customerCountPrevious}
          footnote={`${pluralise(data.unitsSold, 'unit')} sold`}
        />
        <StatCard
          label="Average order value"
          value={formatPrice(data.averageOrderValue, currency)}
          footnote={
            data.orderCount === 0
              ? 'No orders in this window'
              : `Across ${pluralise(data.orderCount, 'order')}`
          }
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Conversion rate"
          value={`${data.conversionRate.toFixed(2)}%`}
          footnote={`${data.sessions.toLocaleString('en-IN')} sessions recorded`}
        />
        <StatCard label="Units sold" value={data.unitsSold.toLocaleString('en-IN')} />
        <StatCard
          label="Low or out of stock"
          value={data.lowStockCount.toLocaleString('en-IN')}
          unit="SKUs"
          footnote="At or below threshold"
          accent="var(--warning)"
        />
        <div className="flex min-w-0 flex-col justify-between border border-[var(--border)] bg-[var(--bg-elevated)] p-5 rounded-[var(--r-sm)]">
          <p className="t-label-sm text-[var(--fg-subtle)]">Jump to</p>
          <ul className="mt-3 flex flex-col gap-2">
            {[
              { href: '/admin/orders?status=paid', label: 'Orders awaiting fulfilment' },
              { href: '/admin/inventory?only=low', label: 'Low stock' },
              { href: '/admin/products/new', label: 'Add a product' },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="t-body-sm inline-flex items-center gap-2 text-[var(--fg-muted)] underline decoration-transparent underline-offset-[5px] transition-[color,text-decoration-color] duration-[var(--d-fast)] hover:text-[var(--fg)] hover:decoration-[var(--border-strong)]"
                >
                  <span aria-hidden className="text-[var(--fg-subtle)]">→</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ------------------------------------------------------------ charts */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.85fr)_minmax(0,1fr)]">
        <Panel
          title="Revenue"
          description={`Captured revenue per day — paid, processing, shipped and delivered orders. Peak ${money(Math.max(...data.revenueSeries.map((point) => point.value), 0))}.`}
        >
          <AreaChart
            data={data.revenueSeries}
            format={(value) => money(value)}
            label={`Daily revenue over the last ${days} days`}
            height={230}
          />
        </Panel>

        <Panel title="Order status" description="Every order placed in the window, by its current state.">
          {data.statusBreakdown.length === 0 ? (
            <p className="t-body-sm py-16 text-center text-[var(--fg-muted)]">No orders in this window.</p>
          ) : (
            <DonutChart
              label="Orders by status"
              total={data.orderCount}
              totalLabel="orders"
              segments={data.statusBreakdown.map((entry) => ({
                key: entry.status,
                label: entry.status,
                value: entry.count,
                color: STATUS_COLOR[entry.status],
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.85fr)]">
        <Panel title="Top products" description="By captured revenue in the window.">
          {data.topProducts.length === 0 ? (
            <p className="t-body-sm py-16 text-center text-[var(--fg-muted)]">Nothing sold in this window.</p>
          ) : (
            <ColumnChart
              label="Top products by revenue"
              height={190}
              format={(value) => money(value)}
              data={data.topProducts.map((product) => ({
                key: product.id,
                label: product.name,
                sublabel: pluralise(product.units, 'unit'),
                value: product.revenue,
              }))}
            />
          )}
        </Panel>

        <Panel
          title="Recent orders"
          bleed
          actions={
            <Link
              href="/admin/orders"
              className="t-label-sm text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
            >
              All orders
            </Link>
          }
        >
          <TableScroller>
            <Table caption="The eight most recent orders">
              <THead>
                <TH width="9rem">Order</TH>
                <TH>Customer</TH>
                <TH width="10rem">Status</TH>
                <TH align="right" width="8rem">Placed</TH>
                <TH align="right" width="8rem">Total</TH>
              </THead>
              <TBody>
                {data.recentOrders.map((order) => (
                  <TR key={order.id}>
                    <TD mono>
                      <RowLink href={`/admin/orders/${order.id}`} title={order.orderNumber} />
                    </TD>
                    <TD>
                      <span className="block truncate">{order.shippingAddress?.fullName ?? order.email}</span>
                      <span className="t-caption block truncate text-[var(--fg-subtle)]">{order.email}</span>
                    </TD>
                    <TD><OrderStatusPill status={order.status} /></TD>
                    <TD align="right" mono>{formatDate(order.placedAt, { year: undefined })}</TD>
                    <TD align="right" mono>{formatPrice(order.total, order.currency)}</TD>
                  </TR>
                ))}
                {data.recentOrders.length === 0 ? (
                  <EmptyRow colSpan={5}>No orders yet. They will appear here the moment one is placed.</EmptyRow>
                ) : null}
              </TBody>
            </Table>
          </TableScroller>
        </Panel>
      </div>
    </div>
  );
}
