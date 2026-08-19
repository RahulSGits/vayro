import type { NextRequest } from 'next/server';
import { getFacets, isDemoData, queryProducts } from '@/lib/repo/products';
import { parseInput, productQuerySchema } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import {
  CACHEABLE_READ,
  badRequest,
  jsonResponse,
  logRouteError,
  rateLimited,
  searchParamsToObject,
  serverError,
} from '../_lib/http';

/* ==========================================================================
   GET /api/products

   The catalogue read, filtered by the same `ShopFilters` the shop page uses,
   so a client rendering from this endpoint and one rendering from the server
   component can never disagree. Filtering and sorting live in
   `queryProducts()`; this route only validates, paginates and caches.

   Paginated with `limit` / `offset` (capped at 50 / 10,000 by the schema), and
   `total` is the count *before* the window is applied so a client can build
   pagination without a second call.
   ========================================================================== */

export async function GET(request: NextRequest) {
  const { result } = await guard('products', request);
  if (!result.ok) return rateLimited(result);

  const parsed = parseInput(productQuerySchema, searchParamsToObject(request.nextUrl.searchParams));
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields);

  const { limit, offset, ...filters } = parsed.data;

  if (
    typeof filters.minPrice === 'number' &&
    typeof filters.maxPrice === 'number' &&
    filters.minPrice > filters.maxPrice
  ) {
    return badRequest('The minimum price is above the maximum.', {
      minPrice: 'Must be at or below the maximum price.',
    });
  }

  try {
    const [matched, facets, demo] = await Promise.all([
      queryProducts(filters),
      getFacets(),
      isDemoData(),
    ]);

    return jsonResponse(
      {
        products: matched.slice(offset, offset + limit),
        total: matched.length,
        limit,
        offset,
        facets,
        /** True when the response came from the seed catalogue, not a database. */
        demo,
      },
      200,
      CACHEABLE_READ,
    );
  } catch (error) {
    logRouteError('products', error, { filters });
    return serverError('The catalogue could not be read just now. Try again shortly.');
  }
}
