import { requireAdmin } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import {
  BarRows, FilterTabs, InventoryTable, PageHeader, Panel, SearchField, StatStrip,
} from '@/components/admin';
import { adminContext, listInventory } from '../_data/queries';

export const metadata = { title: 'Inventory' };

const VIEWS = ['all', 'low', 'out'] as const;
type View = (typeof VIEWS)[number];

export default async function AdminInventoryPage({ searchParams }: PageProps<'/admin/inventory'>) {
  await requireAdmin();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };

  const query = one('q').trim();
  const onlyParam = one('only');
  const only: View = (VIEWS as readonly string[]).includes(onlyParam) ? (onlyParam as View) : 'all';

  const [{ demo }, unfiltered, filtered] = await Promise.all([
    adminContext(),
    listInventory(),
    listInventory({ q: query, only }),
  ]);

  const byProduct = new Map<string, number>();
  for (const row of unfiltered.rows) {
    byProduct.set(row.productName, (byProduct.get(row.productName) ?? 0) + row.stock);
  }
  const stockByProduct = [...byProduct.entries()]
    .map(([name, stock]) => ({ key: name, label: name, value: stock }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Inventory"
        description="Stock by SKU across every product, including drafts. Edit a count in place — each row saves on its own."
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'SKUs', value: unfiltered.totals.skus.toLocaleString('en-IN') },
          { label: 'Units on hand', value: unfiltered.totals.units.toLocaleString('en-IN') },
          {
            label: 'Low stock',
            value: unfiltered.totals.low.toLocaleString('en-IN'),
            tone: unfiltered.totals.low > 0 ? 'warning' : 'default',
          },
          {
            label: 'Out of stock',
            value: unfiltered.totals.out.toLocaleString('en-IN'),
            tone: unfiltered.totals.out > 0 ? 'danger' : 'default',
          },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Panel title="Stock by product" description="Units on hand across every variant.">
          {stockByProduct.length === 0 ? (
            <p className="t-body-sm py-12 text-center text-[var(--fg-muted)]">No stock records yet.</p>
          ) : (
            <BarRows
              label="Units on hand by product"
              data={stockByProduct}
              format={(value) => `${value.toLocaleString('en-IN')} units`}
            />
          )}
        </Panel>

        <Panel title="Valuation" description="Stock on hand at current retail price. Not a cost basis.">
          <div className="flex h-full flex-col justify-center gap-6 py-6">
            <div>
              <p className="t-label-sm text-[var(--fg-subtle)]">Retail value of stock on hand</p>
              <p className="t-display-md mt-3">{formatPrice(unfiltered.totals.retailValue, 'INR')}</p>
            </div>
            <p className="t-caption t-pretty max-w-[52ch] text-[var(--fg-muted)]">
              Calculated as units on hand multiplied by the price a customer would pay today, including
              any variant-level override. It is a planning figure, not an accounting one.
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FilterTabs
          basePath="/admin/inventory"
          param="only"
          current={only}
          preserve={query ? { q: query } : {}}
          label="Filter stock levels"
          options={[
            { value: 'all', label: 'All', count: unfiltered.totals.skus },
            { value: 'low', label: 'Low', count: unfiltered.totals.low },
            { value: 'out', label: 'Out of stock', count: unfiltered.totals.out },
          ]}
        />
        <SearchField
          basePath="/admin/inventory"
          preserve={only !== 'all' ? { only } : {}}
          defaultValue={query}
          label="Search inventory"
          placeholder="SKU, product, colourway…"
          className="ml-auto w-full sm:w-80"
        />
      </div>

      <Panel
        className="mt-4"
        bleed
        footer={
          <p className="t-spec text-[var(--fg-subtle)]">
            {filtered.rows.length.toLocaleString('en-IN')} of {unfiltered.totals.skus.toLocaleString('en-IN')} SKUs
            {demo ? ' · demo data — edits validate but do not persist' : ''}
          </p>
        }
      >
        <InventoryTable rows={filtered.rows} />
      </Panel>
    </div>
  );
}
