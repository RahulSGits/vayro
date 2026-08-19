import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  getCategories,
  getCollections,
  getFacets,
  queryProducts,
} from '@/lib/repo/products';
import { collections as seedCollections } from '@/data/catalog';
import { pluralise } from '@/lib/utils';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
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

type Params = Promise<{ slug: string }>;

/**
 * From the seed catalogue: the read model is request-scoped, so it cannot be
 * consulted at build time. Collections added later render on demand.
 */
export function generateStaticParams() {
  return seedCollections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const collection = (await getCollections()).find((entry) => entry.slug === slug);
  if (!collection) return { title: 'Collection not found' };

  const description =
    collection.description ?? collection.tagline ?? `The ${collection.name} collection from VAYRO.`;

  return {
    title: collection.name,
    description,
    alternates: { canonical: `/collections/${collection.slug}` },
    openGraph: {
      title: `${collection.name} — VAYRO`,
      description,
      url: `/collections/${collection.slug}`,
      type: 'website',
      images: collection.heroImage
        ? [{ url: collection.heroImage, width: 1600, height: 900, alt: collection.name }]
        : undefined,
    },
  };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<ShopSearchParams>;
}) {
  // Both are request-time APIs in Next 16 — await before reading either.
  const [{ slug }, rawSearch] = await Promise.all([params, searchParams]);

  const collections = await getCollections();
  const collection = collections.find((entry) => entry.slug === slug);
  if (!collection) notFound();

  const state = parseShopParams(rawSearch);
  const basePath = `/collections/${collection.slug}`;

  const [products, facets, categories] = await Promise.all([
    // The collection is fixed by the route — it is not a removable filter here.
    queryProducts(toRepoFilters(state, { collection: collection.slug })),
    getFacets(),
    getCategories(),
  ]);

  const activeCount = activeFilterCount(state, ['collection']);
  const currency = products[0]?.currency ?? 'INR';

  const panel = (
    <ShopFilterPanel
      basePath={basePath}
      state={state}
      facets={facets}
      categories={categories}
      collections={collections}
      currency={currency}
      hideCollections
    />
  );

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <header data-surface="inverse" className="relative isolate overflow-hidden">
        {collection.heroImage ? (
          <>
            <Image
              src={collection.heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="-z-10 object-cover"
            />
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ink)_30%,transparent)_0%,color-mix(in_oklab,var(--ink)_78%,transparent)_100%)]"
            />
          </>
        ) : null}

        <div className="shell flex min-h-[62vh] flex-col justify-end pt-[calc(var(--header-h)+4rem)] pb-16">
          <Link
            href="/collections"
            data-cursor="link"
            className="t-label inline-flex items-center gap-2.5 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            <ArrowLeft size={13} strokeWidth={1.25} aria-hidden />
            All collections
          </Link>

          <div className="grid-12 mt-10 items-end">
            <div className="col-span-4 lg:col-span-7">
              <h1 className="t-display-lg t-balance">{collection.name}</h1>
              {collection.tagline ? (
                <p className="t-body-lg mt-5 text-[var(--fg)]">{collection.tagline}</p>
              ) : null}
            </div>
            {collection.description ? (
              <div className="col-span-4 lg:col-span-4 lg:col-start-9">
                <p className="t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)] lg:mt-0">
                  {collection.description}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------ grid */}
      <div className="shell grid-12 section">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-[calc(var(--header-h)+2rem)] max-h-[calc(100vh-var(--header-h)-4rem)] overflow-y-auto pr-2">
            {panel}
          </div>
        </aside>

        <section className="col-span-4 lg:col-span-9" aria-label={`${collection.name} products`}>
          <div className="sticky top-[var(--header-h)] z-10 -mx-[var(--gutter)] mb-8 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--bg)] px-[var(--gutter)] py-3 lg:hidden">
            <ShopFilterDrawer
              stateKey={stateKey(basePath, state)}
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
            <p className="t-spec text-[var(--fg-subtle)]">{pluralise(products.length, 'piece')}</p>
            <ActiveFilters
              basePath={basePath}
              state={state}
              categories={categories}
              collections={collections}
              currency={currency}
              hideCollections
            />
          </div>

          {products.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              body={`Nothing in ${collection.name} fits that combination. Clear the filters to see the whole collection.`}
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <ButtonLink href={clearedHref(basePath, state)} size="md" scroll={false}>
                    Clear filters
                  </ButtonLink>
                  <ButtonLink href="/shop" variant="secondary" size="md">
                    Shop everything
                  </ButtonLink>
                </div>
              }
              className="border border-[var(--border)] py-24"
            />
          ) : (
            <ProductGrid products={products} priorityCount={2} />
          )}
        </section>
      </div>

      {/* --------------------------------------------------------- onward */}
      <section className="shell section-tight border-t border-[var(--border)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <h2 className="t-h1 t-balance">The rest of the system.</h2>
            <p className="t-pretty mt-4 max-w-[var(--max-text)] text-[var(--fg-muted)]">
              Every collection draws from the same range. Nothing here is exclusive to one route
              through it.
            </p>
          </div>
          <div className="col-span-4 lg:col-span-4 lg:justify-self-end">
            <ButtonLink href="/collections" variant="secondary" size="lg" className="mt-8 lg:mt-0">
              All collections
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
