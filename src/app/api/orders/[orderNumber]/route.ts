import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { guard } from '@/lib/rate-limit';
import { getSession, isAdmin } from '@/lib/auth';
import { badRequest, jsonResponse, logRouteError, notFound, rateLimited, serverError } from '../../_lib/http';
import { findOrderByNumber } from '../../_lib/orders';

/* ==========================================================================
   GET /api/orders/[orderNumber]

   Read back by `fetchOrder()` in `src/components/checkout/order.ts`, which
   treats any non-200 as "no server copy" and falls back to the sessionStorage
   record the confirmation screen stashed at checkout. A 404 here is therefore
   a graceful outcome, not a broken page — which is what makes the strict rule
   below affordable.

   ── Why every unauthorised read is a 404 ─────────────────────────────────
   Order numbers are sequential (`VY-01041`, `VY-01042`, …). Anyone can guess
   the next one. So an order is returned only to the customer it belongs to or
   to an admin, and every other case answers 404 rather than 403 — a 403 would
   confirm that the number exists, which is the fact worth protecting.

   Guest orders have no `user_id` and so are never readable here. That is
   intentional: an order number alone is not proof of identity.
   ========================================================================== */

const orderNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^VY-\d{4,6}$/, 'Order numbers look like VY-01042.');

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orderNumber: string }> },
) {
  const { orderNumber: raw } = await context.params;

  const { result } = await guard('orderLookup', request);
  if (!result.ok) return rateLimited(result);

  const parsed = orderNumberSchema.safeParse(decodeURIComponent(raw));
  if (!parsed.success) {
    return badRequest(parsed.error.issues[0]?.message ?? 'That is not a valid order number.');
  }

  const missing = notFound('No order with that number is available to this account.');

  try {
    const session = await getSession();
    if (!session) return missing;

    const order = await findOrderByNumber(parsed.data);
    if (!order) return missing;

    if (order.userId !== session.id && !(await isAdmin())) return missing;

    return jsonResponse({ order });
  } catch (error) {
    logRouteError('orders/[orderNumber]', error, { orderNumber: parsed.data });
    return serverError('The order could not be loaded just now. Try again shortly.');
  }
}
