import 'server-only';

/* ==========================================================================
   Rate limiting — a real sliding-window limiter, in memory.

   The algorithm is a sliding *log*: every accepted hit records its timestamp,
   and a request is admitted only when fewer than `limit` timestamps fall
   inside the trailing `windowMs`. That gives an exact window with no burst at
   the boundary, which a fixed-window counter cannot do.

   ── Scope and honesty ────────────────────────────────────────────────────
   In-memory state is per-process. On a single Node server that is the whole
   truth; on a multi-instance deployment each instance enforces its own share
   of the budget. That is a deliberate floor, not a ceiling: it stops naive
   abuse and accidental loops without adding a network dependency to routes
   that must keep working when every integration is absent.

   ── Swapping in Upstash / Redis ──────────────────────────────────────────
   `RateLimitStore` is the only seam. Implement it once, call
   `setRateLimitStore()` from server bootstrap (e.g. `instrumentation.ts`),
   and every route inherits the shared limiter without changing:

     import { Redis } from '@upstash/redis';
     import { Ratelimit } from '@upstash/ratelimit';
     import { setRateLimitStore } from '@/lib/rate-limit';

     const redis = Redis.fromEnv();
     const limiters = new Map<string, Ratelimit>();

     setRateLimitStore({
       async hit(key, policy) {
         const id = `${policy.limit}:${policy.windowMs}`;
         let limiter = limiters.get(id);
         if (!limiter) {
           limiter = new Ratelimit({
             redis,
             limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowMs} ms`),
             prefix: 'vayro',
           });
           limiters.set(id, limiter);
         }
         const r = await limiter.limit(key);
         return {
           ok: r.success,
           limit: r.limit,
           remaining: r.remaining,
           reset: r.reset,
           retryAfter: Math.max(0, Math.ceil((r.reset - Date.now()) / 1000)),
         };
       },
     });
   ========================================================================== */

export interface RateLimitPolicy {
  /** Requests admitted per window. */
  limit: number;
  /** Trailing window in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  /** Slots left in the current window after this hit. */
  remaining: number;
  /** Epoch milliseconds at which a slot frees up. */
  reset: number;
  /** Seconds to wait before retrying. 0 when the request was admitted. */
  retryAfter: number;
}

export interface RateLimitStore {
  hit(key: string, policy: RateLimitPolicy, now: number): Promise<RateLimitResult>;
}

/* --------------------------------------------------------------- policies -- */

/**
 * One place to read every limit from. Deliberately generous for reads and
 * tight for anything that writes, sends mail or moves money.
 */
export const LIMITS = {
  /** Search runs on every keystroke burst behind a 180 ms debounce. */
  search: { limit: 40, windowMs: 60_000 },
  newsletter: { limit: 5, windowMs: 10 * 60_000 },
  contact: { limit: 3, windowMs: 10 * 60_000 },
  checkout: { limit: 20, windowMs: 10 * 60_000 },
  orders: { limit: 10, windowMs: 10 * 60_000 },
  orderLookup: { limit: 60, windowMs: 60_000 },
  products: { limit: 120, windowMs: 60_000 },
  analytics: { limit: 240, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

/* ----------------------------------------------------------- memory store -- */

/** Keys tracked before a full sweep is forced, regardless of the clock. */
const MAX_TRACKED_KEYS = 20_000;
const SWEEP_INTERVAL_MS = 60_000;

class MemoryRateLimitStore implements RateLimitStore {
  /** key -> ascending timestamps of admitted hits inside the window. */
  private readonly hits = new Map<string, number[]>();
  private lastSweep = Date.now();

  async hit(key: string, policy: RateLimitPolicy, now: number): Promise<RateLimitResult> {
    this.maybeSweep(now);

    const windowStart = now - policy.windowMs;
    const previous = this.hits.get(key);
    // Timestamps are appended in order, so the live slice is a suffix.
    const live = previous ? dropExpired(previous, windowStart) : [];

    if (live.length >= policy.limit) {
      this.hits.set(key, live);
      const reset = live[0] + policy.windowMs;
      return {
        ok: false,
        limit: policy.limit,
        remaining: 0,
        reset,
        retryAfter: Math.max(1, Math.ceil((reset - now) / 1000)),
      };
    }

    live.push(now);
    this.hits.set(key, live);

    return {
      ok: true,
      limit: policy.limit,
      remaining: policy.limit - live.length,
      reset: live[0] + policy.windowMs,
      retryAfter: 0,
    };
  }

  /** Drops keys whose newest hit is older than the longest window in use. */
  private maybeSweep(now: number) {
    if (now - this.lastSweep < SWEEP_INTERVAL_MS && this.hits.size < MAX_TRACKED_KEYS) return;
    this.lastSweep = now;
    const horizon = now - LONGEST_WINDOW_MS;
    for (const [key, timestamps] of this.hits) {
      if (timestamps.length === 0 || timestamps[timestamps.length - 1] <= horizon) {
        this.hits.delete(key);
      }
    }
  }
}

const LONGEST_WINDOW_MS = Math.max(...Object.values(LIMITS).map((policy) => policy.windowMs));

function dropExpired(timestamps: number[], windowStart: number): number[] {
  let index = 0;
  while (index < timestamps.length && timestamps[index] <= windowStart) index += 1;
  return index === 0 ? timestamps : timestamps.slice(index);
}

/**
 * Held on `globalThis` so the window survives module re-evaluation during dev
 * hot reloads — otherwise every save would hand an attacker a fresh budget.
 */
const globalScope = globalThis as typeof globalThis & {
  __vayroRateLimitStore?: RateLimitStore;
};

globalScope.__vayroRateLimitStore ??= new MemoryRateLimitStore();

let store: RateLimitStore = globalScope.__vayroRateLimitStore;

/** Replaces the limiter backend. See the Upstash sketch at the top of the file. */
export function setRateLimitStore(next: RateLimitStore) {
  store = next;
  globalScope.__vayroRateLimitStore = next;
}

/* ----------------------------------------------------------------- public -- */

/** Records a hit against `key` and reports whether it may proceed. */
export function rateLimit(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  return store.hit(key, policy, Date.now());
}

/**
 * A stable identifier for the caller. Proxy headers are the only signal a
 * serverless runtime has; the first entry of `x-forwarded-for` is the client
 * as recorded by the edge that terminated TLS. Never trusted for anything but
 * bucketing — it is spoofable, which is why limits are a floor, not a fence.
 */
export function clientAddress(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get('cf-connecting-ip') ??
    headers.get('x-real-ip') ??
    headers.get('x-vercel-forwarded-for') ??
    'unknown'
  );
}

/** `scope:address` — one budget per route, never a shared global bucket. */
export function rateLimitKey(scope: string, request: Request, extra?: string): string {
  const address = clientAddress(request);
  return extra ? `${scope}:${address}:${extra}` : `${scope}:${address}`;
}

/** Standard advisory headers (draft-7 names) for any response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'RateLimit-Limit': String(result.limit),
    'RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'RateLimit-Reset': String(Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))),
  };
  if (!result.ok) headers['Retry-After'] = String(result.retryAfter);
  return headers;
}

/**
 * Convenience for route handlers: limit by scope and return the result plus
 * the headers to merge into whichever response is sent.
 */
export async function guard(
  scope: keyof typeof LIMITS,
  request: Request,
  extra?: string,
): Promise<{ result: RateLimitResult; headers: Record<string, string> }> {
  const result = await rateLimit(rateLimitKey(scope, request, extra), LIMITS[scope]);
  return { result, headers: rateLimitHeaders(result) };
}
