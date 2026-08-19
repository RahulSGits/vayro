import type { NextRequest } from 'next/server';
import { analyticsBatchSchema, analyticsEventSchema, parseInput, type AnalyticsEventInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { getSession } from '@/lib/auth';
import { badRequest, jsonResponse, logRouteError, rateLimited, readJsonBody, serverError } from '../_lib/http';
import { requestDb } from '../_lib/db';

/* ==========================================================================
   POST /api/analytics  ->  202 Accepted

   First-party persistence into `analytics_events`, which the admin analytics
   screen reads. Independent of PostHog/GA: `track()` in `@/lib/analytics` is a
   client module that talks to those directly, so an event can be sent to both
   without either depending on the other.

   ── The closed union is the security property ────────────────────────────
   `name` is validated against `ANALYTICS_EVENT_NAMES`, and `props` accepts
   only scalars, capped at 24 keys of 300 characters. An open `name` field on a
   public insert endpoint is an open write channel into a table the admin
   dashboard renders — which is how a storefront ends up displaying someone
   else's text.

   Accepts one event or a batch of up to twenty, so a page unload can flush in
   a single `sendBeacon`.
   ========================================================================== */

/** Never let a client claim an identity — the session is the only source. */
function rowsFor(events: AnalyticsEventInput[], userId: string | null) {
  return events.map((event) => ({
    name: event.name,
    props: event.props,
    user_id: userId,
    session_id: event.sessionId,
  }));
}

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('analytics', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  // Branch on the shape before parsing. A `z.union` would report a failed
  // batch as a bare "Invalid input"; picking the schema first keeps the
  // per-field message ("Unknown event name.") that makes this debuggable.
  const isBatch =
    typeof body.value === 'object' && body.value !== null && 'events' in body.value;

  const parsed = isBatch
    ? parseInput(analyticsBatchSchema, body.value)
    : parseInput(analyticsEventSchema, body.value);

  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const events: AnalyticsEventInput[] = 'events' in parsed.data ? parsed.data.events : [parsed.data];

  const db = await requestDb();

  if (!db) {
    return jsonResponse(
      { ok: true, received: events.length, persisted: false, demo: true },
      202,
      headers,
    );
  }

  try {
    const session = await getSession();
    const { error } = await db.from('analytics_events').insert(rowsFor(events, session?.id ?? null));

    if (error) {
      logRouteError('analytics', error.message, { code: error.code, count: events.length });
      return serverError('The event could not be recorded.', headers);
    }
  } catch (error) {
    logRouteError('analytics', error, { count: events.length });
    return serverError('The event could not be recorded.', headers);
  }

  return jsonResponse({ ok: true, received: events.length, persisted: true }, 202, headers);
}
