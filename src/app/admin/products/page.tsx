import { requireAdmin } from '@/lib/auth';
import { ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, pluralise } from '@/lib/utils';
import {
  ActionButtonForm, EmptyRow, FilterTabs, PageHeader, Panel, ProductPrice, ProductStatusPill,
  RowLink, SearchField, StatStrip, TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import type { ProductStatus } from '@/types';
import { adminContext, listProducts } from '../_data/queries';
import { setProductStatus } from '../actions';

export const metadata = { title: 'Products' };

const STATUS_FILTERS: (ProductStatus | 'all')[] = ['all', 'published', 'draft', 'archived'];

export default async function AdminProductsPage({ searchParams }: PageProps<'/admin/products'>) {
  await requireAdmin();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };

  const query = one('q').trim();
  const statusParam = one('status');
  const status = (STATUS_FILTERS as string[]).includes(statusParam) ? statusParam : 'all';

  const [{ demo }, products] = await Promise.all([adminContext(), listProducts()]);

  const counts = {
    all: products.length,
    published: products.filter((product) => product.status === 'published').length,
    draft: products.filter((product) => product.status === 'draft').length,
    archived: products.filter((product) => product.status === 'archived').length,
  };

  let rows = products;
  if (status !== 'all') rows = rows.filter((product) => product.status === status);
  if (query) {
    const needle = query.toLowerCase();
    rows = rows.filter((product) =>
      [product.name, product.slug, product.categorySlug, ...product.badges, ...product.variants.map((v) => v.sku)]
        .join(' ').toLowerCase().includes(needle));
  }

  const totalUnits = products.reduce(
    (sum, product) => sum + product.variants.reduce((count, variant) => count + variant.stock, 0), 0,
  );
  const lowStock = products.reduce(
    (count, product) => count + product.variants.filter((variant) => variant.stock <= variant.lowStockThreshold).length,
    0,
  );

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Every piece in the catalogue, published or not. A draft is fully editable and completely invisible to the storefront."
        actions={<ButtonLink href="/admin/products/new" size="sm">New product</ButtonLink>}
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'Products', value: String(counts.all) },
          { label: 'Published', value: String(counts.published) },
          { label: 'Units in stock', value: totalUnits.toLocaleString('en-IN') },
          { label: 'Low or out', value: String(lowStock), tone: lowStock > 0 ? 'warning' : 'default' },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <FilterTabs
          basePath="/admin/products"
          param="status"
          current={status}
          preserve={query ? { q: query } : {}}
          label="Filter by status"
          options={STATUS_FILTERS.map((value) => ({
            value,
            label: value === 'all' ? 'All' : value,
            count: counts[value as keyof typeof counts],
          }))}
        />
        <SearchField
          basePath="/admin/products"
          preserve={status !== 'all' ? { status } : {}}
          defaultValue={query}
          label="Search products"
          placeholder="Name, slug, SKU…"
          className="ml-auto w-full sm:w-80"
        />
      </div>

      <Panel className="mt-4" bleed>
        <TableScroller>
          <Table caption="Products in the catalogue">
            <THead>
              <TH>Product</TH>
              <TH width="9rem">Status</TH>
              <TH width="10rem">Category</TH>
              <TH align="right" width="11rem">Price</TH>
              <TH align="right" width="9rem">Stock</TH>
              <TH align="right" width="8rem">Updated</TH>
              <TH align="right" width="11rem"><span className="sr-only">Actions</span></TH>
            </THead>
            <TBody>
              {rows.map((product) => {
                const stock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
                const low = product.variants.filter((variant) => variant.stock <= variant.lowStockThreshold).length;
                return (
                  <TR key={product.id} muted={product.status === 'archived'}>
                    <TD>
                      <RowLink
                        href={`/admin/products/${product.id}`}
                        title={
                          <span className="flex items-center gap-3">
                            {product.name}
                            {product.featured ? <Badge tone="muted">Featured</Badge> : null}
                          </span>
                        }
                        meta={`/${product.slug} · ${pluralise(product.variants.length, 'variant')}`}
                      />
                    </TD>
                    <TD><ProductStatusPill status={product.status} /></TD>
                    <TD>{product.categorySlug || '—'}</TD>
                    <TD align="right"><ProductPrice product={product} /></TD>
                    <TD align="right" mono>
                      {stock.toLocaleString('en-IN')}
                      {low > 0 ? (
                        <span className="ml-2 text-[var(--warning)]" title={`${low} variants at or below threshold`}>
                          ·{low}
                        </span>
                      ) : null}
                    </TD>
                    <TD align="right" mono>{formatDate(product.updatedAt, { year: undefined })}</TD>
                    <TD align="right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionButtonForm
                          action={setProductStatus}
                          fields={{ id: product.id, status: product.status === 'published' ? 'draft' : 'published' }}
                          variant={product.status === 'published' ? 'ghost' : 'secondary'}
                          size="xs"
                        >
                          {product.status === 'published' ? 'Unpublish' : 'Publish'}
                        </ActionButtonForm>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {rows.length === 0 ? (
                <EmptyRow colSpan={7}>
                  {query
                    ? `Nothing matches “${query}”.`
                    : 'No products in this view yet. Create one to get started.'}
                </EmptyRow>
              ) : null}
            </TBody>
          </Table>
        </TableScroller>
      </Panel>

      {demo ? (
        <p className="t-caption mt-4 text-[var(--fg-subtle)]">
          Showing the seed catalogue. Publish controls validate but do not persist until Supabase is connected.
        </p>
      ) : null}
    </div>
  );
}
