import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import {
  AreaChart, BarRows, EmptyRow, FilterTabs, FunnelChart, PageHeader, Panel, StatCard,
  TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import { getAnalytics } from '../_data/queries';

export const metadata = { title: 'Analytics' };

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

/** Events worth surfacing as a raw breakdown, in the order they occur. */
const EVENT_ORDER = [
  'page_view', 'product_view', '3d_view_started', '3d_interaction', 'product_transformation_view',
  'search', 'wishlist_add', 'add_to_cart', 'remove_from_cart', 'checkout_started', 'checkout_step',
  'purchase', 'newsletter_signup', 'signup', 'login',
];

export default async function AdminAnalyticsPage({ searchParams }: PageProps<'/admin/analytics'>) {
  await requireAdmin();
  const params = await searchParams;
  const rangeParam = Array.isArray(params.range) ? params.range[0] : params.range;
  const days = RANGES.some((range) => range.value === rangeParam) ? Number(rangeParam) : 30;

  const report = await getAnalytics(days);
  const revenue = report.revenueSeries.reduce((sum, point) => sum + point.value, 0);

  const breakdown = EVENT_ORDER
    .map((name) => ({ name, count: report.totals[name] ?? 0 }))
    .filter((entry) => entry.count > 0);
  const otherEvents = Object.entries(report.totals)
    .filter(([name]) => !EVENT_ORDER.includes(name))
    .map(([name, count]) => ({ name, count }));

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Overview"
        title="Analytics"
        description="First-party events recorded against the storefront. Every figure here is a count of real recorded events — nothing is modelled or extrapolated."
        actions={
          <FilterTabs
            basePath="/admin/analytics"
            param="range"
            current={String(days)}
            options={RANGES}
            label="Reporting range"
          />
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sessions"
          value={(report.totals.page_view ?? 0).toLocaleString('en-IN')}
          series={report.sessionsSeries}
          footnote={`${report.totalEvents.toLocaleString('en-IN')} events total`}
        />
        <StatCard
          label="Product views"
          value={(report.totals.product_view ?? 0).toLocaleString('en-IN')}
          series={report.productViewSeries}
        />
        <StatCard
          label="Add to cart rate"
          value={`${report.addToCartRate.toFixed(2)}%`}
          footnote="Of product views"
        />
        <StatCard
          label="Conversion rate"
          value={`${report.conversionRate.toFixed(2)}%`}
          footnote={`${report.checkoutCompletionRate.toFixed(1)}% of checkouts complete`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="Traffic" description="Page views per day.">
          <AreaChart
            data={report.sessionsSeries}
            format={(value) => value.toLocaleString('en-IN')}
            label={`Page views over the last ${days} days`}
            height={210}
          />
        </Panel>

        <Panel
          title="Conversion funnel"
          description="Each step counted independently from the event stream."
        >
          <FunnelChart steps={report.funnel} label="Conversion funnel" />
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel
          title="Revenue from recorded purchases"
          description={`${formatPrice(revenue, 'INR')} across the window. This counts purchase events, which can differ from the orders ledger if an order was created outside the storefront.`}
        >
          <AreaChart
            data={report.revenueSeries}
            format={(value) => formatPrice(value, 'INR', { compact: true })}
            label={`Purchase revenue over the last ${days} days`}
            height={210}
            accent="var(--accent)"
          />
        </Panel>

        <Panel title="Most viewed products">
          {report.topViewedProducts.length === 0 ? (
            <p className="t-body-sm py-12 text-center text-[var(--fg-muted)]">No product views recorded.</p>
          ) : (
            <BarRows
              label="Product views"
              data={report.topViewedProducts.map((entry) => ({
                key: entry.slug,
                label: entry.name,
                value: entry.count,
              }))}
              format={(value) => value.toLocaleString('en-IN')}
            />
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top paths" bleed>
          <TableScroller>
            <Table caption="Most viewed paths" className="min-w-0">
              <THead>
                <TH>Path</TH>
                <TH align="right" width="7rem">Views</TH>
              </THead>
              <TBody>
                {report.topPaths.map((entry) => (
                  <TR key={entry.path}>
                    <TD mono><span className="block truncate">{entry.path}</span></TD>
                    <TD align="right" mono>{entry.count.toLocaleString('en-IN')}</TD>
                  </TR>
                ))}
                {report.topPaths.length === 0 ? <EmptyRow colSpan={2}>No page views recorded.</EmptyRow> : null}
              </TBody>
            </Table>
          </TableScroller>
        </Panel>

        <Panel title="Searches" bleed>
          <TableScroller>
            <Table caption="Most frequent search queries" className="min-w-0">
              <THead>
                <TH>Query</TH>
                <TH align="right" width="7rem">Count</TH>
              </THead>
              <TBody>
                {report.topSearches.map((entry) => (
                  <TR key={entry.query}>
                    <TD><span className="block truncate">{entry.query}</span></TD>
                    <TD align="right" mono>{entry.count.toLocaleString('en-IN')}</TD>
                  </TR>
                ))}
                {report.topSearches.length === 0 ? <EmptyRow colSpan={2}>No searches recorded.</EmptyRow> : null}
              </TBody>
            </Table>
          </TableScroller>
        </Panel>

        <Panel title="Event volume" bleed>
          <TableScroller>
            <Table caption="Recorded events by name" className="min-w-0">
              <THead>
                <TH>Event</TH>
                <TH align="right" width="7rem">Count</TH>
              </THead>
              <TBody>
                {[...breakdown, ...otherEvents].map((entry) => (
                  <TR key={entry.name}>
                    <TD mono><span className="block truncate">{entry.name}</span></TD>
                    <TD align="right" mono>{entry.count.toLocaleString('en-IN')}</TD>
                  </TR>
                ))}
                {breakdown.length + otherEvents.length === 0 ? (
                  <EmptyRow colSpan={2}>Nothing recorded in this window.</EmptyRow>
                ) : null}
              </TBody>
            </Table>
          </TableScroller>
        </Panel>
      </div>
    </div>
  );
}
