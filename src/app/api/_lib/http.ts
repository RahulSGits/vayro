import 'server-only';
import { NextResponse } from 'next/server';
import { rateLimitHeaders, type RateLimitResult } from '@/lib/rate-limit';

/* ==========================================================================
   Response conventions for every VAYRO route.

   ── The error envelope ───────────────────────────────────────────────────
   Failures are always:

     { error, message, code, fields? }

   `error` and `message` carry the same human-readable sentence. That is not
   redundancy for its own sake: `src/components/checkout/order.ts` reads
   `error ?? message` and `src/components/forms/NewsletterForm.tsx` reads
   `message`, and both render the value straight to the customer. `code` is
   the stable machine-readable slug — the only field a client should ever
   branch on. `fields` maps a form field path to its first message.

   ── What never leaves this process ───────────────────────────────────────
   Stack traces, provider errors, connection strings and key material. Routes
   log the detail with `logRouteError()` and send the sentence.
   ========================================================================== */

export type ApiHeaders = Record<string, string>;

/** Bodies larger than this are refused before they are read into memory. */
const MAX_BODY_BYTES = 128 * 1024;

/** Successful JSON. Defaults to `no-store` — override for cacheable reads. */
export function jsonResponse<T>(body: T, status = 200, headers: ApiHeaders = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}

/** A cacheable GET: fresh at the edge for a minute, stale-served for five. */
export const CACHEABLE_READ: ApiHeaders = {
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export function failure(
  status: number,
  code: string,
  message: string,
  extra: { fields?: Record<string, string>; headers?: ApiHeaders } = {},
): NextResponse {
  return jsonResponse(
    {
      error: message,
      message,
      code,
      ...(extra.fields && Object.keys(extra.fields).length > 0 ? { fields: extra.fields } : {}),
    },
    status,
    extra.headers,
  );
}

export function badRequest(message: string, fields?: Record<string, string>, headers?: ApiHeaders) {
  return failure(400, 'invalid_request', message, { fields, headers });
}

export function notFound(message: string, headers?: ApiHeaders) {
  return failure(404, 'not_found', message, { headers });
}

export function conflict(code: string, message: string, headers?: ApiHeaders) {
  return failure(409, code, message, { headers });
}

/** 503 — the request was valid, the integration it needs is not configured. */
export function unavailable(message: string, code = 'not_configured', headers?: ApiHeaders) {
  return failure(503, code, message, { headers });
}

export function serverError(message = 'Something went wrong on our side. Try again shortly.', headers?: ApiHeaders) {
  return failure(500, 'server_error', message, { headers });
}

/**
 * 429, with `Retry-After` and the draft-7 `RateLimit-*` advisories derived
 * from the result itself rather than passed in. A caller that forgets to
 * forward the headers from `guard()` still sends a well-formed refusal — a
 * 429 without `Retry-After` tells a client nothing except to retry blindly.
 */
export function rateLimited(result: RateLimitResult, headers: ApiHeaders = {}) {
  const seconds = Math.max(1, result.retryAfter);
  return failure(
    429,
    'rate_limited',
    `Too many requests. Try again in ${seconds === 1 ? 'a second' : `${seconds} seconds`}.`,
    { headers: { ...rateLimitHeaders(result), ...headers } },
  );
}

/* --------------------------------------------------------------- reading -- */

export type BodyOutcome =
  | { ok: true; value: unknown }
  | { ok: false; response: NextResponse };

/**
 * Reads and parses a JSON body without ever throwing into the route. Refuses
 * anything oversized or malformed with a message a developer can act on.
 */
export async function readJsonBody(request: Request, headers: ApiHeaders = {}): Promise<BodyOutcome> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: failure(413, 'payload_too_large', 'That request body is larger than this endpoint accepts.', { headers }),
    };
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: badRequest('The request body could not be read.', undefined, headers) };
  }

  if (raw.length > MAX_BODY_BYTES) {
    return {
      ok: false,
      response: failure(413, 'payload_too_large', 'That request body is larger than this endpoint accepts.', { headers }),
    };
  }
  if (raw.trim().length === 0) {
    return { ok: false, response: badRequest('The request body was empty.', undefined, headers) };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, response: badRequest('The request body was not valid JSON.', undefined, headers) };
  }
}

/** Query string as a plain object, ready for a zod schema. */
export function searchParamsToObject(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of params) if (value !== '') out[key] = value;
  return out;
}

/* --------------------------------------------------------------- logging -- */

/**
 * One log shape for every route failure. Messages only — a stack trace in a
 * production log is fine, a provider payload with a key in it is not.
 */
export function logRouteError(scope: string, error: unknown, context: Record<string, unknown> = {}) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[vayro:api:${scope}]`, detail, context);
}
