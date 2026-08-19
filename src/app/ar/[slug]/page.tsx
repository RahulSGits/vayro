import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct } from '@/lib/repo/products';
import { products as seedProducts } from '@/data/catalog';
import {
  absoluteUrl,
  breadcrumbJsonLd,
  buildMetadata,
  jsonLdScript,
  productJsonLd,
} from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { ARStage } from '@/components/ar/ARStage';
import { ProductProvider } from '@/components/product/ProductProvider';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { defaultColorway, inStock, specValue } from '@/components/product/product-utils';
import type { Product } from '@/types';

/* ==========================================================================
   /ar/[slug] — the page a phone camera lands on.

   This is the destination for a QR code on a swing tag, a shop window or a
   printed card. Whoever arrives has the product in front of them, or wants to
   know whether it belongs in the room they are standing in, and they have not
   signed in to anything. So the page is one column, in order: what it is,
   what it costs, look at it, put it in your room, the numbers, buy it.

   No account, no gate, no interstitial. The heavy parts — WebGL, the AR
   runtime — are behind a tap, because the connection this page loads over is
   whatever the reader happened to be standing in.
   ========================================================================== */

type Params = Promise<{ slug: string }>;

/** Only these three carry figures a reader in a shop actually wants. */
const AT_A_GLANCE = ['Packed volume', 'Packed size', 'Weight (size M)'];

/* ------------------------------------------------------------- prerender -- */

/**
 * Prerendered from the seed catalogue, as the product page is: the read model
 * is request-scoped and cannot run at build time. Slugs that only exist in
 * Supabase still render on demand.
 */
export function generateStaticParams() {
  return seedProducts
    .filter((product) => product.status === 'published')
    .map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Product not found' };

  const plate = product.images.find((image) => image.kind === 'technical') ?? product.images[0];

  const metadata = buildMetadata({
    title: `${product.name} in your space`,
    description:
      `See the ${product.name} at true size, in your own room, before you buy it. `
      + `${product.subtitle ?? product.description}`,
    path: `/ar/${product.slug}`,
    image: plate?.url ?? null,
    imageAlt: plate?.alt,
    imageSize: { width: 1200, height: 1500 },
    keywords: ['augmented reality', 'view in your space', product.name, 'VAYRO'],
  });

  return {
    ...metadata,
    // The product page is the canonical record of this product. This page is a
    // route into it, not a second copy of it.
    alternates: { canonical: `/product/${product.slug}` },
  };
}

/* ------------------------------------------------------------------ page -- */

export default async function ARPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const available = inStock(product);
  const colorway = defaultColorway(product);
  const glance = AT_A_GLANCE.map((label) => ({ label, value: specValue(product, label) })).filter(
    (entry): entry is { label: string; value: string } => Boolean(entry.value),
  );
  const specs = product.specs.filter(
    (spec) => spec.group === 'dimensions' || spec.group === 'performance',
  );

  return (
    <div className="pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(graph(product)) }}
      />

      {/* --------------------------------------------------------- heading */}
      <header className="shell pt-8 sm:pt-12">
        <p className="t-label-sm text-[var(--fg-subtle)]">Augmented reality</p>
        <h1 className="t-display-md t-balance mt-4">{product.name}</h1>
        {product.subtitle ? (
          <p className="t-body-lg t-pretty mt-3 max-w-[var(--max-text)] text-[var(--fg-muted)]">
            {product.subtitle}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="t-price-lg">{formatPrice(product.price, product.currency)}</p>
          {!available ? <Badge tone="default">Sold out</Badge> : null}
          {product.badges.map((badge) => (
            <Badge key={badge}>{badge}</Badge>
          ))}
        </div>
      </header>

      {/* ------------------------------------------------- stage + purchase */}
      <div className="shell grid-12 mt-10 items-start gap-y-14">
        <div className="col-span-4 lg:col-span-7">
          <ARStage product={product} colorway={colorway} />

          {glance.length > 0 ? (
            <dl className="mt-8 grid grid-cols-3 border-t border-[var(--border)]">
              {glance.map((entry) => (
                <div key={entry.label} className="border-b border-[var(--border)] py-4 pr-4">
                  <dt className="t-label-sm text-[var(--fg-subtle)]">{entry.label}</dt>
                  <dd className="t-spec mt-2">{entry.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="col-span-4 lg:col-span-4 lg:col-start-9">
          <ProductProvider product={product}>
            <ProductPurchase />
          </ProductProvider>
        </div>
      </div>

      {/* ------------------------------------------------------------ specs */}
      {specs.length > 0 ? (
        <section className="shell section-tight" aria-labelledby="ar-spec-heading">
          <h2 id="ar-spec-heading" className="t-h2 border-b border-[var(--fg)] pb-4">
            The numbers
          </h2>
          <dl className="mt-8 max-w-[var(--max-text)]">
            {specs.map((spec) => (
              <div
                key={`${spec.group}-${spec.label}`}
                className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-4"
              >
                <dt className="t-spec text-[var(--fg-subtle)]">{spec.label}</dt>
                <dd className="t-spec text-right">{spec.value}</dd>
              </div>
            ))}
          </dl>
          <p className="t-caption t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-subtle)]">
            The augmented reality view is drawn from the same figures. It is weather resistant, not
            waterproof.
          </p>
        </section>
      ) : null}

      {/* -------------------------------------------------------- onward */}
      <section className="shell section-tight">
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="t-body-sm t-pretty text-[var(--fg-muted)]">
            The full record — construction, materials, care and every angle.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/product/${product.slug}`}>Full product page</ButtonLink>
            <ButtonLink href="/shop" variant="secondary">
              Shop everything
            </ButtonLink>
          </div>
        </div>
        <p className="t-caption mt-6 text-[var(--fg-subtle)]">
          <Link href="/technology" className="underline underline-offset-4">
            How the carry system works
          </Link>
        </p>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- helpers -- */

/** Product and breadcrumb nodes, every field derived from the catalogue. */
function graph(product: Product): Record<string, unknown>[] {
  return [
    productJsonLd(product),
    breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Shop', path: '/shop' },
      { name: product.name, path: `/product/${product.slug}` },
      { name: 'In your space', path: `/ar/${product.slug}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      '@id': `${absoluteUrl(`/ar/${product.slug}`)}#webpage`,
      name: `${product.name} in your space`,
      url: absoluteUrl(`/ar/${product.slug}`),
      mainEntity: { '@id': `${absoluteUrl(`/product/${product.slug}`)}#product` },
    },
  ];
}
