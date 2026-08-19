import type { Metadata } from 'next';
import { Hero } from '@/components/hero/Hero';
import { StatementStrip } from '@/components/home/StatementStrip';
import { TransformationSection } from '@/components/home/TransformationSection';
import { TechnologySection } from '@/components/home/TechnologySection';
import { EditorialSplit } from '@/components/home/EditorialSplit';
import { CollectionsSection } from '@/components/home/CollectionsSection';
import { FeaturedProducts } from '@/components/home/FeaturedProducts';
import { FieldBand } from '@/components/home/FieldBand';
import { JournalTeaser } from '@/components/home/JournalTeaser';
import { NewsletterBlock } from '@/components/home/NewsletterBlock';
import {
  getCollections,
  getFeaturedProducts,
  getHeroProduct,
  getJournalPosts,
  getProducts,
} from '@/lib/repo/products';
import { env } from '@/lib/env';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/types';

/* ==========================================================================
   VAYRO — homepage.

   A server component end to end. Every section below is server-rendered; the
   interactive parts (hero parallax, the pinned transformation sequence, the
   construction explorer, the collections scroller) are small client children
   that receive already-resolved data.
   ========================================================================== */

export const metadata: Metadata = {
  title: 'VAYRO — Engineered for the way forward',
  description:
    'The Meridian Carry Shell folds into its own hood and becomes a 2.1 L carry unit. '
    + 'Premium outerwear designed for the city, the trail, and everywhere between.',
  alternates: { canonical: '/' },
};

const FEATURED_COUNT = 3;
const HERO_SPEC_LABELS = ['Weight (size M)', 'Packed volume', 'Shell'];

/** Three cards, whatever the catalogue looks like: featured first, then range. */
function pickFeatured(featured: Product[], all: Product[]): Product[] {
  const picked = [...featured];
  for (const product of all) {
    if (picked.length >= FEATURED_COUNT) break;
    if (!picked.some((item) => item.id === product.id)) picked.push(product);
  }
  return picked.slice(0, FEATURED_COUNT);
}

/** The three statement-strip specs, read off the hero product's spec sheet. */
function stripSpecs(product: Product): string[] {
  return HERO_SPEC_LABELS.map((label) => {
    const spec = product.specs.find((entry) => entry.label === label);
    if (!spec) return null;
    if (label === 'Shell') return spec.value.split(',')[0];
    if (label === 'Packed volume') return `${spec.value} packed`;
    return spec.value;
  }).filter((value): value is string => Boolean(value));
}

function uniqueColorways(product: Product) {
  const seen = new Map<string, string>();
  for (const variant of product.variants) {
    if (!seen.has(variant.colorway)) seen.set(variant.colorway, variant.colorHex);
  }
  return [...seen].map(([name, hex]) => ({ name, hex }));
}

export default async function HomePage() {
  const [heroProduct, featured, allProducts, collections, journalPosts] = await Promise.all([
    getHeroProduct(),
    getFeaturedProducts(),
    getProducts(),
    getCollections(),
    getJournalPosts(),
  ]);

  const cards = pickFeatured(featured, allProducts);
  const latestPosts = [...journalPosts]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 3);

  const site = env.siteUrl;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${site}/#organization`,
        name: 'VAYRO',
        url: site,
        slogan: 'One layer. Every destination.',
        description:
          'VAYRO makes outerwear and carry systems engineered to pack — technical shells '
          + 'and travel equipment built for the city, the trail, and everywhere between.',
        logo: {
          '@type': 'ImageObject',
          '@id': `${site}/#logo`,
          url: `${site}/brand/png/vayro-lockup-horizontal-ivory-2048.png`,
          width: 2048,
          height: 428,
          caption: 'VAYRO',
        },
        image: { '@id': `${site}/#logo` },
        sameAs: [
          'https://www.instagram.com/vayro',
          'https://www.youtube.com/@vayro',
          'https://www.pinterest.com/vayro',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${site}/#website`,
        url: site,
        name: 'VAYRO',
        description: 'Engineered for the way forward.',
        publisher: { '@id': `${site}/#organization` },
        inLanguage: 'en',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${site}/shop?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${site}/#webpage`,
        url: site,
        name: 'VAYRO — Engineered for the way forward',
        isPartOf: { '@id': `${site}/#website` },
        about: { '@id': `${site}/#organization` },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: `${site}/media/field-ascent.jpg`,
        },
        inLanguage: 'en',
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <Hero
        productSlug={heroProduct.slug}
        product={heroProduct}
        priceLabel={formatPrice(heroProduct.price, heroProduct.currency)}
        colorways={uniqueColorways(heroProduct)}
      />

      <StatementStrip
        tagline={heroProduct.subtitle ?? 'One layer. Every destination.'}
        specs={stripSpecs(heroProduct)}
      />

      <TransformationSection product={heroProduct} />

      <TechnologySection product={heroProduct} />

      <EditorialSplit />

      <CollectionsSection collections={collections} />

      <FeaturedProducts products={cards} />

      <FieldBand />

      <JournalTeaser posts={latestPosts} />

      <NewsletterBlock />
    </>
  );
}
