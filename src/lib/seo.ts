import type { Metadata } from 'next';
import { env } from '@/lib/env';
import type { JournalPost, Product } from '@/types';

/* ==========================================================================
   VAYRO — metadata and structured data.

   One source of truth for what the site says about itself to crawlers and to
   social cards. Two rules hold throughout:

   1. Everything is derived from real catalogue fields. No invented ratings,
      no fabricated review counts, no synthetic scarcity.
   2. `@id` anchors are stable and shared, so the Organization declared on the
      homepage is the same node a product page points its `brand` at.

   Titles are returned bare: the root layout owns the `%s — VAYRO` template.
   Open Graph titles are written out in full because social cards do not
   inherit it.
   ========================================================================== */

export const SITE = {
  name: 'VAYRO',
  tagline: 'One layer. Every destination.',
  strapline: 'Engineered for the way forward',
  description:
    'Premium outerwear and travel equipment engineered to pack. The Meridian Carry Shell '
    + 'folds into its own hood and becomes a 2.1 L carry unit.',
  locale: 'en_IN',
  language: 'en',
  logo: '/brand/png/vayro-lockup-horizontal-ivory-2048.png',
  logoSize: { width: 2048, height: 428 },
  social: [
    'https://www.instagram.com/vayro',
    'https://www.youtube.com/@vayro',
    'https://www.pinterest.com/vayro',
  ],
} as const;

/** Stable JSON-LD node identifiers. Referenced across pages, never inlined twice. */
export const NODE = {
  organization: `${env.siteUrl}/#organization`,
  website: `${env.siteUrl}/#website`,
  logo: `${env.siteUrl}/#logo`,
} as const;

/* ------------------------------------------------------------------ urls -- */

/** Route-relative path → absolute URL. Absolute inputs pass through untouched. */
export function absoluteUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = env.siteUrl.replace(/\/$/, '');
  return path === '/' ? base : `${base}/${path.replace(/^\//, '')}`;
}

/* -------------------------------------------------------------- metadata -- */

export type BuildMetadataInput = {
  /** Bare page title — the root layout appends ` — VAYRO`. */
  title: string;
  description: string;
  /** Route-relative path used for the canonical link and OG url. */
  path: string;
  /** Card image. Root-relative paths are resolved against the site URL. */
  image?: string | null;
  imageAlt?: string;
  imageSize?: { width: number; height: number };
  type?: 'website' | 'article';
  keywords?: string[];
  /** Set on screens that must never be indexed (account, checkout, admin). */
  noIndex?: boolean;
  /** Bypasses the title template — for the homepage and error documents. */
  absoluteTitle?: boolean;
  /** Article fields; ignored unless `type` is `'article'`. */
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
};

/**
 * Builds a complete `Metadata` object: canonical, Open Graph and Twitter in
 * one pass, so no route has to remember the full shape.
 *
 * `image` is deliberately optional — when it is omitted the generated
 * `opengraph-image` route supplies the card, which is the right default.
 */
export function buildMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  imageSize = { width: 1200, height: 630 },
  type = 'website',
  keywords,
  noIndex = false,
  absoluteTitle = false,
  publishedTime,
  modifiedTime,
  authors,
  section,
}: BuildMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const socialTitle = absoluteTitle ? title : `${title} — ${SITE.name}`;
  const images = image
    ? [{ url: absoluteUrl(image), width: imageSize.width, height: imageSize.height, alt: imageAlt ?? socialTitle }]
    : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords?.length ? { keywords } : {}),
    alternates: { canonical: path },
    robots: noIndex
      ? { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      type,
      siteName: SITE.name,
      locale: SITE.locale,
      title: socialTitle,
      description,
      url,
      ...(images ? { images } : {}),
      ...(type === 'article'
        ? {
            publishedTime,
            modifiedTime: modifiedTime ?? publishedTime,
            authors: authors ?? [SITE.name],
            section,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      ...(images ? { images: images.map((entry) => entry.url) } : {}),
    },
  };
}

/* ------------------------------------------------------------- structured -- */

type JsonLd = Record<string, unknown>;

/**
 * Serialises a graph for `dangerouslySetInnerHTML`. `<` is escaped so the
 * payload can never close the script element early.
 */
export function jsonLdScript(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** The brand as a single node. Every other graph references it by `@id`. */
export function organizationJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': NODE.organization,
    name: SITE.name,
    url: absoluteUrl('/'),
    slogan: SITE.tagline,
    description: SITE.description,
    logo: {
      '@type': 'ImageObject',
      '@id': NODE.logo,
      url: absoluteUrl(SITE.logo),
      width: SITE.logoSize.width,
      height: SITE.logoSize.height,
      caption: SITE.name,
    },
    image: { '@id': NODE.logo },
    sameAs: [...SITE.social],
  };
}

/** The site, with the shop search exposed as a sitelinks search action. */
export function websiteJsonLd(): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': NODE.website,
    url: absoluteUrl('/'),
    name: SITE.name,
    description: SITE.strapline,
    publisher: { '@id': NODE.organization },
    inLanguage: SITE.language,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/shop')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export type Crumb = { name: string; path: string };

/** Breadcrumb trail. Pass it in reading order, starting at Home. */
export function breadcrumbJsonLd(trail: Crumb[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export type ProductJsonLdOptions = {
  /** Display name of the product's category, when one is resolved. */
  categoryName?: string;
  /**
   * Real, non-demo review aggregate. Omit it and no rating is emitted —
   * demo reviews must never reach structured data.
   */
  rating?: { value: number; count: number };
};

/**
 * Product node with an AggregateOffer across variants. Prices are minor units
 * in the catalogue and are emitted in major units, as schema.org expects.
 */
export function productJsonLd(product: Product, options: ProductJsonLdOptions = {}): JsonLd {
  const url = absoluteUrl(`/product/${product.slug}`);
  const prices = product.variants.map((variant) => variant.priceOverride ?? product.price);
  const low = prices.length ? Math.min(...prices) : product.price;
  const high = prices.length ? Math.max(...prices) : product.price;
  const inStock = product.variants.some((variant) => variant.available && variant.stock > 0);
  const material = product.specs.find((spec) => spec.group === 'materials')?.value;
  const weight = product.variants.find((variant) => variant.weightGrams)?.weightGrams;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.name,
    description: product.description,
    url,
    image: product.images.map((image) => absoluteUrl(image.url)),
    sku: product.variants[0]?.sku ?? product.id,
    brand: { '@type': 'Brand', name: SITE.name, '@id': NODE.organization },
    category: options.categoryName ?? product.categorySlug,
    ...(material ? { material } : {}),
    ...(weight ? { weight: { '@type': 'QuantitativeValue', value: weight, unitCode: 'GRM' } } : {}),
    ...(product.variants.length
      ? {
          hasVariant: product.variants.map((variant) => ({
            '@type': 'Product',
            name: `${product.name} — ${variant.colorway}, ${variant.size}`,
            sku: variant.sku,
            color: variant.colorway,
            size: variant.size,
          })),
        }
      : {}),
    additionalProperty: product.specs.map((spec) => ({
      '@type': 'PropertyValue',
      name: spec.label,
      value: spec.value,
    })),
    ...(options.rating && options.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: options.rating.value.toFixed(1),
            reviewCount: options.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: {
      '@type': 'AggregateOffer',
      url,
      priceCurrency: product.currency,
      lowPrice: (low / 100).toFixed(2),
      highPrice: (high / 100).toFixed(2),
      offerCount: product.variants.length,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': NODE.organization },
    },
  };
}

/** Journal entry as an Article, authored by the studio unless stated otherwise. */
export function articleJsonLd(post: JournalPost): JsonLd {
  const url = absoluteUrl(`/journal/${post.slug}`);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(post.heroImage ? { image: [absoluteUrl(post.heroImage)] } : {}),
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    articleSection: post.category,
    wordCount: post.body.trim().split(/\s+/).length,
    timeRequired: `PT${post.readingMinutes}M`,
    inLanguage: SITE.language,
    author: { '@type': 'Organization', name: post.author, '@id': NODE.organization },
    publisher: { '@id': NODE.organization },
    isPartOf: { '@id': NODE.website },
  };
}
