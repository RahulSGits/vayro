import type { NextRequest } from 'next/server';
import { newsletterSchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { sendWelcome } from '@/lib/email';
import { badRequest, jsonResponse, logRouteError, rateLimited, readJsonBody, serverError } from '../_lib/http';
import { requestDb } from '../_lib/db';

/* ==========================================================================
   POST /api/newsletter

   Called by `src/components/forms/NewsletterForm.tsx`, which posts
   `{ email, source, consent: true }` and renders `message` from the body on
   any non-2xx. The form never claims a subscription it cannot verify, so this
   route must not return 200 for a submission it dropped — except for the
   honeypot, where silence is the point.

   `consent` is a literal `true` in the schema, and the RLS policy on
   `newsletter_subscribers` independently refuses the row without it. Two locks
   on the same door, deliberately.
   ========================================================================== */

/** Postgres unique-violation. A second signup is a no-op, not a failure. */
const UNIQUE_VIOLATION = '23505';

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('newsletter', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  const parsed = parseInput(newsletterSchema, body.value);
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const { email, source, company } = parsed.data;

  // The form renders `company` off-screen; a human never sees it. Accepted and
  // discarded — an automated submitter learns nothing from the response.
  if (company && company.trim().length > 0) {
    return jsonResponse({ ok: true, subscribed: true, persisted: false }, 200, headers);
  }

  const db = await requestDb();

  if (!db) {
    // Demo mode. The subscription is genuinely not stored anywhere, and the
    // payload says so rather than implying a list that does not exist.
    return jsonResponse(
      {
        ok: true,
        subscribed: true,
        persisted: false,
        demo: true,
        message: 'Demo mode — the address was accepted but not stored. Configure Supabase to persist subscribers.',
      },
      200,
      headers,
    );
  }

  try {
    const { error } = await db
      .from('newsletter_subscribers')
      .insert({ email, source, consent: true });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return jsonResponse(
          { ok: true, subscribed: true, persisted: true, alreadySubscribed: true },
          200,
          headers,
        );
      }
      logRouteError('newsletter', error.message, { code: error.code, source });
      return serverError('We could not save that just now. Try again shortly.', headers);
    }
  } catch (error) {
    logRouteError('newsletter', error, { source });
    return serverError('We could not save that just now. Try again shortly.', headers);
  }

  // Never allowed to fail the subscription: the row is already committed.
  const welcome = await sendWelcome({ to: email, source: 'newsletter' });

  return jsonResponse(
    { ok: true, subscribed: true, persisted: true, welcomeSent: welcome.sent },
    201,
    headers,
  );
}
