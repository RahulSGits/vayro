import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getProduct, getReviews } from '@/lib/repo/products';
import { guard } from '@/lib/rate-limit';
import {
  CACHEABLE_READ,
  badRequest,
  jsonResponse,
  logRouteError,
  notFound,
  rateLimited,
  serverError,
} from '../../_lib/http';

/* ==========================================================================
   GET /api/products/[slug]

   One product with its variants, images, models, specs and reviews — the same
   record `/product/[slug]` renders from, so a client fetch and a server render
   return the identical object.

   Reviews are included because every caller of a single product needs them,
   and a second round trip for four rows is not worth the request.
   ========================================================================== */

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Product slugs are lowercase letters, numbers and hyphens.');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug: raw } = await context.params;

  const { result } = await guard('products', request);
  if (!result.ok) return rateLimited(result);

  const parsed = slugSchema.safeParse(decodeURIComponent(raw).toLowerCase());
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That is not a valid product reference.');
  }

  try {
    const product = await getProduct(parsed.data);
    if (!product) return notFound('No product exists at that address.');

    const reviews = await getReviews(product.id);

    return jsonResponse({ product, reviews }, 200, CACHEABLE_READ);
  } catch (error) {
    logRouteError('products/[slug]', error, { slug: parsed.data });
    return serverError('That product could not be read just now. Try again shortly.');
  }
}
