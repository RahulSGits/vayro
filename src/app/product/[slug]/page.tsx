import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  getCategories,
  getProduct,
  getProducts,
  getReviews,
} from '@/lib/repo/products';
import { products as seedProducts } from '@/data/catalog';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Accordion, AccordionItem } from '@/components/ui/Accordion';
import { Reveal, RevealChild } from '@/components/ui/Reveal';
import { ProductProvider } from '@/components/product/ProductProvider';
import { ProductGallery } from '@/components/product/ProductGallery';
import { ProductPurchase } from '@/components/product/ProductPurchase';
import { MobileBuyBar } from '@/components/product/MobileBuyBar';
import { SpecTable } from '@/components/product/SpecTable';
import { HotspotFigure } from '@/components/product/HotspotFigure';
import { ProductReviews } from '@/components/product/ProductReviews';
import { ProductViewTracker } from '@/components/product/ProductViewTracker';
import { RelatedProducts } from '@/components/product/RelatedProducts';
import { colorwaysOf, inStock, specValue } from '@/components/product/product-utils';
import type { Product } from '@/types';

type Params = Promise<{ slug: string }>;

const BUY_PANEL_ID = 'buy';

/* ------------------------------------------------------------- prerender -- */

/**
 * Prerendered from the seed catalogue rather than the read model: the repo
 * layer is request-scoped (it reads cookies for RLS), which is not available at
 * build time. Slugs added in Supabase still render on demand.
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

  const description = product.description;
  const image = product.images[0]?.url;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: `${product.name} — VAYRO`,
      description: product.subtitle ?? description,
      url: `/product/${product.slug}`,
      images: image ? [{ url: image, width: 1200, height: 1600, alt: product.name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name} — VAYRO`,
      description: product.subtitle ?? description,
      images: image ? [image] : undefined,
    },
  };
}

/* ------------------------------------------------------------------ page -- */

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [categories, reviews, all] = await Promise.all([
    getCategories(),
    getReviews(product.id),
    getProducts(),
  ]);

  const category = categories.find((entry) => entry.slug === product.categorySlug);
  const related = pickRelated(product, all);
  const available = inStock(product);
  const swatches = colorwaysOf(product);
  const flatImage =
    product.images.find((image) => image.kind === 'technical') ?? product.images[0];
  const detailImages = product.images.filter((image) => image.kind === 'detail');
  const materials = product.specs.filter((spec) => spec.group === 'materials');
  const faqs = buildFaqs(product);

  return (
    <div className="pb-24">
      <ProductViewTracker
        productId={product.id}
        slug={product.slug}
        price={product.price}
        currency={product.currency}
      />
      <script
        type="application/ld+json"
        // Structured data mirrors the catalogue exactly — no invented ratings.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(product, category?.name, faqs)) }}
      />

      <ProductProvider product={product}>
        {/* ------------------------------------------------------ breadcrumb */}
        <nav aria-label="Breadcrumb" className="shell pt-6 pb-8">
          <ol className="t-caption flex flex-wrap items-center gap-2 text-[var(--fg-subtle)]">
            <Crumb href="/">Home</Crumb>
            <Separator />
            <Crumb href="/shop">Shop</Crumb>
            {category ? (
              <>
                <Separator />
                <Crumb href={`/shop?category=${category.slug}`}>{category.name}</Crumb>
              </>
            ) : null}
            <Separator />
            <li aria-current="page" className="text-[var(--fg)]">
              {product.name}
            </li>
          </ol>
        </nav>

        {/* --------------------------------------------------------- buy box */}
        <div className="shell grid-12 items-start gap-y-12">
          <div className="col-span-4 lg:col-span-7">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
              <ProductGallery />
            </div>
          </div>

          <div id={BUY_PANEL_ID} className="col-span-4 lg:col-span-4 lg:col-start-9">
            <div className="flex flex-wrap items-center gap-2">
              {!available ? <Badge tone="default">Sold out</Badge> : null}
              {product.badges.map((badge) => (
                <Badge key={badge}>{badge}</Badge>
              ))}
            </div>

            <h1 className="t-h1 t-balance mt-5">{product.name}</h1>
            {product.subtitle ? (
              <p className="t-body-lg mt-3 text-[var(--fg-muted)]">{product.subtitle}</p>
            ) : null}

            <ProductPurchase className="mt-8" />
          </div>
        </div>

        <MobileBuyBar anchorId={BUY_PANEL_ID} />
      </ProductProvider>

      {/* ----------------------------------------------------------- story */}
      <section className="shell section" aria-labelledby="story-heading">
        <div className="grid-12 items-start">
          <div className="col-span-4 lg:col-span-5">
            <h2 id="story-heading" className="t-label text-[var(--fg-subtle)]">
              The thinking
            </h2>
            <p className="t-h1 t-balance mt-5">{product.subtitle ?? product.name}</p>
          </div>
          <div className="col-span-4 lg:col-span-6 lg:col-start-7">
            <p className="t-body-lg t-pretty text-[var(--fg-muted)]">{product.story}</p>
            <p className="t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)]">
              {product.description}
            </p>
          </div>
        </div>

        {product.features.length > 0 ? (
          <Reveal variant="stagger" as="ul" className="grid-12 mt-20 gap-y-10">
            {product.features.map((feature, index) => (
              <RevealChild key={feature.title} as="li" className="col-span-4 lg:col-span-4">
                <p className="t-spec text-[var(--fg-subtle)]">
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="t-h3 mt-3 border-t border-[var(--border)] pt-4">{feature.title}</h3>
                <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{feature.body}</p>
              </RevealChild>
            ))}
          </Reveal>
        ) : null}
      </section>

      {/* ---------------------------------------------------- construction */}
      {product.hotspots.length > 0 && flatImage ? (
        <section
          data-surface="inverse"
          className="section"
          aria-labelledby="construction-heading"
        >
          <div className="shell">
            <div className="grid-12 items-end border-b border-[var(--border)] pb-6">
              <div className="col-span-4 lg:col-span-8">
                <p className="t-label text-[var(--fg-subtle)]">Construction</p>
                <h2 id="construction-heading" className="t-h1 t-balance mt-4">
                  Every decision, where you can see it.
                </h2>
              </div>
              <div className="col-span-4 lg:col-span-4">
                <p className="t-body-sm t-pretty mt-4 text-[var(--fg-muted)] lg:mt-0">
                  Select a marker to read what it does. The same anchors drive the 3D viewer.
                </p>
              </div>
            </div>
            <HotspotFigure
              image={{ url: flatImage.url, alt: flatImage.alt }}
              hotspots={product.hotspots}
              className="mt-14"
            />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- materials */}
      {materials.length > 0 ? (
        <section className="shell section" aria-labelledby="materials-heading">
          <div className="grid-12 items-start">
            <div className="col-span-4 lg:col-span-5">
              <p className="t-label text-[var(--fg-subtle)]">Materials</p>
              <h2 id="materials-heading" className="t-h1 t-balance mt-4">
                What it is made from.
              </h2>
              <dl className="mt-10">
                {materials.map((spec) => (
                  <div
                    key={spec.label}
                    className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-4"
                  >
                    <dt className="t-spec text-[var(--fg-subtle)]">{spec.label}</dt>
                    <dd className="t-spec text-right">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {detailImages.length > 0 ? (
              <div className="col-span-4 lg:col-span-6 lg:col-start-7">
                <ul className="grid grid-cols-2 gap-[var(--gutter)]">
                  {detailImages.map((image, index) => (
                    <li
                      key={image.id}
                      className={cn(
                        'relative aspect-square overflow-hidden bg-[var(--bg-sunken)]',
                        detailImages.length === 1 && 'col-span-2 aspect-[16/10]',
                        index === 1 && 'mt-12',
                      )}
                    >
                      <Image
                        src={image.url}
                        alt={image.alt}
                        fill
                        sizes="(min-width: 1024px) 28vw, 50vw"
                        className="object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------------ spec */}
      <section className="shell section-tight" aria-labelledby="spec-heading">
        <div className="border-b border-[var(--fg)] pb-5">
          <h2 id="spec-heading" className="t-h1">
            Specification
          </h2>
        </div>
        <SpecTable product={product} className="mt-12" />

        {swatches.length > 0 ? (
          <div className="mt-16 border-t border-[var(--border)] pt-8">
            <h3 className="t-label text-[var(--fg-subtle)]">Colourways</h3>
            <ul className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              {swatches.map((swatch) => (
                <li key={swatch.name} className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="h-4 w-4 border border-[var(--border-strong)]"
                    style={{ background: swatch.hex }}
                  />
                  <span className="t-spec">{swatch.name}</span>
                  {!swatch.inStock ? (
                    <span className="t-spec text-[var(--fg-subtle)]">— sold out</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* ------------------------------------------------------------ care */}
      {product.care.length > 0 ? (
        <section className="shell section-tight" aria-labelledby="care-heading">
          <div className="grid-12 items-start">
            <div className="col-span-4 lg:col-span-4">
              <h2 id="care-heading" className="t-h1">
                Care
              </h2>
              <p className="t-body-sm t-pretty mt-4 text-[var(--fg-muted)]">
                Looked after, this outlasts the trip it was bought for.
              </p>
            </div>
            <ol className="col-span-4 lg:col-span-7 lg:col-start-6">
              {product.care.map((line, index) => (
                <li
                  key={line}
                  className="flex items-baseline gap-6 border-b border-[var(--border)] py-5"
                >
                  <span className="t-spec shrink-0 text-[var(--fg-subtle)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="t-body-lg t-pretty">{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- reviews */}
      <section className="shell section-tight">
        <ProductReviews reviews={reviews} />
      </section>

      {/* ------------------------------------------------------------- faq */}
      {faqs.length > 0 ? (
        <section className="shell section-tight" aria-labelledby="faq-heading">
          <div className="grid-12 items-start">
            <div className="col-span-4 lg:col-span-4">
              <h2 id="faq-heading" className="t-h1">
                Questions
              </h2>
            </div>
            <div className="col-span-4 lg:col-span-7 lg:col-start-6">
              <Accordion type="single">
                {faqs.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id} title={faq.question}>
                    {faq.answer}
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      ) : null}

      {/* --------------------------------------------------------- related */}
      {related.length > 0 ? (
        <section className="shell section-tight">
          <RelatedProducts products={related} href="/shop" hrefLabel="Shop everything" />
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ primitives -- */

function Crumb({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        data-cursor="link"
        className="transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
      >
        {children}
      </Link>
    </li>
  );
}

function Separator() {
  return (
    <li aria-hidden className="text-[var(--fg-subtle)]">
      /
    </li>
  );
}

/* --------------------------------------------------------------- helpers -- */

/** Same collection first, then same category, then whatever is left. */
function pickRelated(product: Product, all: Product[]): Product[] {
  const others = all.filter((entry) => entry.id !== product.id);
  const score = (entry: Product) =>
    (entry.collectionSlugs.some((slug) => product.collectionSlugs.includes(slug)) ? 2 : 0) +
    (entry.categorySlug === product.categorySlug ? 1 : 0);
  return [...others].sort((a, b) => score(b) - score(a)).slice(0, 3);
}

type Faq = { id: string; question: string; answer: string };

/**
 * Built from the catalogue, never authored per product — an answer only exists
 * when the specification that supports it does.
 */
function buildFaqs(product: Product): Faq[] {
  const faqs: Faq[] = [];

  const water = specValue(product, 'Water resistance');
  if (water) {
    faqs.push({
      id: 'water',
      question: 'Is it waterproof?',
      answer: `No. ${water} It handles wind and passing rain; it is not what you want in sustained heavy rainfall.`,
    });
  }

  const packed = specValue(product, 'Packed volume') ?? specValue(product, 'Folded');
  const packedSize = specValue(product, 'Packed size');
  if (packed) {
    faqs.push({
      id: 'packed',
      question: 'How small does it pack?',
      answer: `${packed}${packedSize ? ` — ${packedSize}.` : '.'} There is no stuff sack to lose: it packs into itself.`,
    });
  }

  const sizes = [...new Set(product.variants.map((variant) => variant.size))];
  if (sizes.length > 1) {
    faqs.push({
      id: 'fit',
      question: 'Which size should I take?',
      answer:
        `Available in ${sizes.join(', ')}. The cut allows for a mid layer underneath, so take your usual size. ` +
        'Between sizes, take the larger. Full body measurements are in the size guide above.',
    });
  }

  if (product.care.length > 0) {
    faqs.push({
      id: 'care',
      question: 'How do I wash it?',
      answer: product.care.join(' '),
    });
  }

  const weight = specValue(product, 'Weight (size M)') ?? specValue(product, 'Weight');
  if (weight) {
    faqs.push({
      id: 'weight',
      question: 'What does it weigh?',
      answer: `${weight}. Every gram is accounted for in the specification table on this page.`,
    });
  }

  return faqs;
}

/** Product + breadcrumb + FAQ structured data, all derived from real fields. */
function jsonLd(product: Product, categoryName: string | undefined, faqs: Faq[]) {
  const url = `${env.siteUrl}/product/${product.slug}`;
  const images = product.images.map((image) => `${env.siteUrl}${image.url}`);
  const prices = product.variants.map((variant) => variant.priceOverride ?? product.price);
  const low = prices.length ? Math.min(...prices) : product.price;
  const high = prices.length ? Math.max(...prices) : product.price;
  const available = inStock(product);

  const graph: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: images,
      sku: product.variants[0]?.sku ?? product.id,
      brand: { '@type': 'Brand', name: 'VAYRO' },
      category: categoryName ?? product.categorySlug,
      url,
      material: product.specs.find((spec) => spec.group === 'materials')?.value,
      additionalProperty: product.specs.map((spec) => ({
        '@type': 'PropertyValue',
        name: spec.label,
        value: spec.value,
      })),
      offers: {
        '@type': 'AggregateOffer',
        url,
        priceCurrency: product.currency,
        lowPrice: (low / 100).toFixed(2),
        highPrice: (high / 100).toFixed(2),
        offerCount: product.variants.length,
        availability: available
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@type': 'Organization', name: 'VAYRO' },
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: env.siteUrl },
        { '@type': 'ListItem', position: 2, name: 'Shop', item: `${env.siteUrl}/shop` },
        ...(categoryName
          ? [
              {
                '@type': 'ListItem',
                position: 3,
                name: categoryName,
                item: `${env.siteUrl}/shop?category=${product.categorySlug}`,
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: categoryName ? 4 : 3,
          name: product.name,
          item: url,
        },
      ],
    },
  ];

  if (faqs.length > 0) {
    graph.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  return graph;
}
