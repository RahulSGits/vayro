import type { NextRequest } from 'next/server';
import { contactSchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { sendContactMessage } from '@/lib/email';
import { badRequest, failure, jsonResponse, logRouteError, rateLimited, readJsonBody } from '../_lib/http';

/* ==========================================================================
   POST /api/contact

   Validates an enquiry and hands it to `src/lib/email.ts`, which routes it to
   `ADMIN_EMAIL` with Reply-To set to the sender.

   ── On honesty ───────────────────────────────────────────────────────────
   With no `RESEND_API_KEY` the message is rendered and logged as a structured
   preview rather than delivered. That is reported as `delivered: false` with a
   reason, not dressed up as a send — the studio would otherwise never know an
   enquiry evaporated. A provider that is configured and *fails* is a 502: the
   sender must know to try another channel.
   ========================================================================== */

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('contact', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  const parsed = parseInput(contactSchema, body.value);
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const { name, email, topic, subject, message, orderNumber, company } = parsed.data;

  // Honeypot. Accepted and discarded, exactly as the newsletter route does.
  if (company && company.trim().length > 0) {
    return jsonResponse({ ok: true, delivered: false }, 200, headers);
  }

  const outcome = await sendContactMessage({
    fromName: name,
    fromEmail: email,
    topic,
    subject,
    message,
    orderNumber: orderNumber ?? null,
  });

  if (outcome.sent) {
    return jsonResponse(
      {
        ok: true,
        delivered: true,
        message: 'Message sent. We answer within two working days.',
      },
      201,
      headers,
    );
  }

  if (outcome.reason === 'not-configured') {
    return jsonResponse(
      {
        ok: true,
        delivered: false,
        reason: 'not-configured',
        message:
          'Message received. Email delivery is not configured in this environment, so it was logged for review rather than sent.',
      },
      200,
      headers,
    );
  }

  logRouteError('contact', outcome.detail ?? outcome.reason, { topic });

  return failure(
    502,
    'delivery_failed',
    'We could not deliver that message. Try again shortly, or write to us directly.',
    { headers },
  );
}
