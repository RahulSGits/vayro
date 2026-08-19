import type { Metadata } from 'next';
import Link from 'next/link';
import { getCategories, getCollections, getFacets, queryProducts } from '@/lib/repo/products';
import { pluralise } from '@/lib/utils';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ShopFilterPanel } from '@/components/product/ShopFilterPanel';
import { ShopFilterDrawer } from '@/components/product/ShopFilterDrawer';
import { ActiveFilters } from '@/components/product/ActiveFilters';
import {
  activeFilterCount,
  clearedHref,
  parseShopParams,
  stateKey,
  toRepoFilters,
  type ShopSearchParams,
} from '@/components/product/shop-params';

export const metadata: Metadata = {
  title: 'Shop',
  description:
    'The full VAYRO range — packable shells, mid layers, carry systems and essentials. Filter by category, colourway, size and availability.',
  alternates: { canonical: '/shop' },
  openGraph: {
    title: 'Shop — VAYRO',
    description: 'Equipment engineered to pack. The full range.',
    url: '/shop',
    images: [{ url: '/media/field-ridgeline.jpg', width: 1600, height: 900, alt: 'VAYRO field' }],
  },
};

const BASE = '/shop';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopSearchParams>;
}) {
  // Request-time API — always awaited before anything reads it.
  const params = await searchParams;
  const state = parseShopParams(params);

  const [products, facets, categories, collections] = await Promise.all([
    queryProducts(toRepoFilters(state)),
    getFacets(),
    getCategories(),
    getCollections(),
  ]);

  const activeCount = activeFilterCount(state);
  const currency = products[0]?.currency ?? 'INR';

  const panel = (
    <ShopFilterPanel
      basePath={BASE}
      state={state}
      facets={facets}
      categories={categories}
      collections={collections}
      currency={currency}
    />
  );

  return (
    <div className="shell">
      {/* --------------------------------------------------------- masthead */}
      <header className="section-tight border-b border-[var(--border)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <p className="t-label text-[var(--fg-subtle)]">
              {state.q ? 'Search' : 'The range'}
            </p>
            <h1 className="t-display-md t-balance mt-5">
              {state.q ? `“${state.q}”` : 'Everything we make'}
            </h1>
          </div>
          <div className="col-span-4 lg:col-span-4 lg:pb-2">
            <p className="t-body-lg t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)] lg:mt-0">
              Built around a single idea: a layer should still be useful once you take it off.
              Everything here folds, packs or carries.
            </p>
          </div>
        </div>
      </header>

      <div className="grid-12 section">
        {/* ------------------------------------------------------- filters */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100vh-var(--header-h)-4rem)] overflow-y-auto pr-2">
            {panel}
          </div>
        </aside>

        {/* ---------------------------------------------------------- grid */}
        <section className="col-span-4 lg:col-span-9" aria-label="Products">
          {/* Mobile toolbar. Sticks under the header so filters are never far. */}
          <div className="sticky top-[var(--header-h)] z-10 -mx-[var(--gutter)] mb-8 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-[var(--gutter)] py-3 lg:hidden">
            <ShopFilterDrawer
              stateKey={stateKey(BASE, state)}
              activeCount={activeCount}
              resultCount={products.length}
            >
              {panel}
            </ShopFilterDrawer>
            <p className="t-spec shrink-0 text-[var(--fg-subtle)]">
              {products.length.toString().padStart(2, '0')}
            </p>
          </div>

          <div className="mb-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <p className="t-spec text-[var(--fg-subtle)]">
              {pluralise(products.length, 'piece')}
            </p>
            <ActiveFilters
              basePath={BASE}
              state={state}
              categories={categories}
              collections={collections}
              currency={currency}
            />
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              body="Loosen one of them — colourway and size are the usual culprits — or clear them all and start again."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <ButtonLink href={clearedHref(BASE, state)} variant="primary" size="md" scroll={false}>
                    Clear filters
                  </ButtonLink>
                  <ButtonLink href="/collections" variant="secondary" size="md">
                    Browse collections
                  </ButtonLink>
                </div>
              }
              className="border border-[var(--border)] py-24"
            />
          ) : (
            <ProductGrid products={products} priorityCount={3} />
          )}

          {products.length > 0 ? (
            <Reveal variant="fadeUp" className="mt-24 border-t border-[var(--border)] pt-10">
              <p className="t-body-sm t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                Looking for the engineering rather than the catalogue?{' '}
                <Link
                  href="/technology"
                  className="underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
                  data-cursor="link"
                >
                  Read how the carry system works
                </Link>
                .
              </p>
            </Reveal>
          ) : null}
        </section>
      </div>
    </div>
  );
}
