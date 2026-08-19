import type { NextRequest } from 'next/server';
import { getCollections, getJournalPosts, getProducts } from '@/lib/repo/products';
import { searchQuerySchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { CACHEABLE_READ, badRequest, jsonResponse, logRouteError, rateLimited, serverError, searchParamsToObject } from '../_lib/http';

/* ==========================================================================
   GET /api/search?q=

   Feeds the ⌘K overlay in `src/components/navigation/SearchOverlay.tsx`.

   The overlay normalises defensively — it will accept a bare array, a
   `{ results }` envelope, or per-type buckets — but it only derives an href
   from a slug as a *last* resort, and its fallback prefix for a product is
   `/products`, which is not this app's route (`/product/[slug]`). So every
   result carries an explicit `href`. Do not remove it.

   Matching is substring, weighted by where the hit landed: a name match beats
   a description match, and a prefix beats a mid-word hit. Eight results per
   type, which is what the grouped listbox can show without scrolling.
   ========================================================================== */

const PER_TYPE = 8;

interface Hit<T> {
  score: number;
  item: T;
}

/**
 * Scores one record. Fields are supplied most-significant first, and each is
 * worth less than the one before it, so `Meridian` ranks the product above a
 * journal post that merely mentions it.
 */
function score(query: string, fields: (string | null | undefined)[]): number {
  let total = 0;

  for (const [index, field] of fields.entries()) {
    if (!field) continue;
    const haystack = field.toLowerCase();
    const at = haystack.indexOf(query);
    if (at === -1) continue;

    const weight = fields.length - index;
    // Exact, then prefix, then word-boundary, then anywhere.
    if (haystack === query) total += weight * 8;
    else if (at === 0) total += weight * 4;
    else if (haystack[at - 1] === ' ' || haystack[at - 1] === '-') total += weight * 2;
    else total += weight;
  }

  return total;
}

function take<T>(hits: Hit<T>[]): T[] {
  return hits
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, PER_TYPE)
    .map((hit) => hit.item);
}

export async function GET(request: NextRequest) {
  const { result, headers } = await guard('search', request);
  if (!result.ok) return rateLimited(result);

  const parsed = parseInput(searchQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const query = parsed.data.q.toLowerCase();

  try {
    const [products, collections, journal] = await Promise.all([
      getProducts(),
      getCollections(),
      getJournalPosts(),
    ]);

    const productHits = take(
      products.map((product) => ({
        score: score(query, [
          product.name,
          product.subtitle,
          ...product.badges,
          ...product.variants.map((variant) => variant.colorway),
          product.categorySlug,
          product.description,
        ]),
        item: {
          id: product.id,
          type: 'product' as const,
          title: product.name,
          subtitle: product.subtitle ?? undefined,
          slug: product.slug,
          href: `/product/${product.slug}`,
          image: product.images[0]?.url,
          price: product.price,
          currency: product.currency,
        },
      })),
    );

    const collectionHits = take(
      collections.map((collection) => ({
        score: score(query, [collection.name, collection.tagline, collection.description]),
        item: {
          id: collection.id,
          type: 'collection' as const,
          title: collection.name,
          subtitle: collection.tagline ?? undefined,
          slug: collection.slug,
          href: `/collections/${collection.slug}`,
          image: collection.heroImage ?? undefined,
        },
      })),
    );

    const journalHits = take(
      journal.map((post) => ({
        score: score(query, [post.title, post.category, post.excerpt, post.body]),
        item: {
          id: post.id,
          type: 'journal' as const,
          title: post.title,
          subtitle: post.category,
          slug: post.slug,
          href: `/journal/${post.slug}`,
          image: post.heroImage ?? undefined,
        },
      })),
    );

    return jsonResponse(
      {
        query: parsed.data.q,
        products: productHits,
        collections: collectionHits,
        journal: journalHits,
        counts: {
          products: productHits.length,
          collections: collectionHits.length,
          journal: journalHits.length,
          total: productHits.length + collectionHits.length + journalHits.length,
        },
      },
      200,
      CACHEABLE_READ,
    );
  } catch (error) {
    logRouteError('search', error, { query: parsed.data.q });
    return serverError('Search is unavailable just now. Try again shortly.', headers);
  }
}
