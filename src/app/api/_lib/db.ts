import 'server-only';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/* ==========================================================================
   A narrow, typed view of PostgREST for the route handlers.

   `Database` in `@/lib/supabase/types` is a deliberate stub: its tables are an
   index signature, which collapses PostgREST's insert/update generics to
   `never`. `src/app/admin/_data/db.ts` and `src/app/account/write.ts` solve
   the same problem the same way — narrow the client once, structurally, and
   keep reads flowing through explicit coercion. When `supabase gen types`
   replaces the stub, these three files are the only ones that change.

   Reads come back as `unknown` on purpose. Nothing from the database is
   trusted into the domain model without being coerced first.
   ========================================================================== */

export type DbError = { message: string; code?: string } | null;

export interface DbResult {
  data: unknown;
  error: DbError;
  count?: number | null;
}

export interface DbQuery extends PromiseLike<DbResult> {
  eq(column: string, value: string | number | boolean | null): DbQuery;
  in(column: string, values: readonly (string | number)[]): DbQuery;
  order(column: string, options?: { ascending?: boolean }): DbQuery;
  limit(count: number): DbQuery;
  select(query?: string): DbQuery;
  single(): PromiseLike<DbResult>;
  maybeSingle(): PromiseLike<DbResult>;
}

type Values = Record<string, unknown>;

export interface DbTable {
  select(query?: string, options?: { count?: 'exact'; head?: boolean }): DbQuery;
  insert(values: Values | Values[]): DbQuery;
  update(values: Values): DbQuery;
  upsert(values: Values | Values[], options?: { onConflict?: string; ignoreDuplicates?: boolean }): DbQuery;
  delete(): DbQuery;
}

export interface Db {
  from(table: string): DbTable;
}

/**
 * Service-role handle. Bypasses RLS, so it is used only where the route has
 * already established the authority to act: writing an order the customer
 * just paid for, or applying a signature-verified Stripe webhook.
 *
 * Null when Supabase or the service-role key is absent — the demo path.
 */
export function serviceDb(): Db | null {
  const client = createAdminClient();
  return client ? (client as unknown as Db) : null;
}

/**
 * Request-scoped handle. Every statement runs under RLS as the caller, which
 * is what anonymous inserts (newsletter, analytics) and owner-scoped reads
 * must use. Null in demo mode.
 */
export async function requestDb(): Promise<Db | null> {
  const client = await createClient();
  return client ? (client as unknown as Db) : null;
}
