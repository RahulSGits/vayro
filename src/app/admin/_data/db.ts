import 'server-only';
import { cache } from 'react';
import { createAdminClient, createClient } from '@/lib/supabase/server';

/* ==========================================================================
   Database façade for the admin.

   `Database` in `@/lib/supabase/types` is an intentional stub — a hand-written
   placeholder until `supabase gen types` can run against a linked project. Its
   index-signature tables give PostgREST's generics nothing to resolve, so
   inserts and updates come back typed `never`.

   Rather than scatter casts through every mutation, the client is narrowed
   once here to the exact surface the admin uses. Reads still come back as
   `unknown` and go through the coercion helpers in `./coerce`, so nothing is
   trusted on the way in. When generated types land, this file is the only
   place that has to change.
   ========================================================================== */

export type DbError = { message: string; code?: string } | null;

export type DbResult = {
  data: unknown;
  error: DbError;
  count?: number | null;
};

export interface DbFilter extends PromiseLike<DbResult> {
  eq(column: string, value: string | number | boolean | null): DbFilter;
  neq(column: string, value: string | number | boolean | null): DbFilter;
  in(column: string, values: readonly (string | number)[]): DbFilter;
  gte(column: string, value: string | number): DbFilter;
  lte(column: string, value: string | number): DbFilter;
  not(column: string, operator: string, value: string | number | null): DbFilter;
  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }): DbFilter;
  limit(count: number): DbFilter;
  select(query?: string): DbFilter;
  single(): PromiseLike<DbResult>;
  maybeSingle(): PromiseLike<DbResult>;
}

type Values = Record<string, unknown>;

export interface DbTable {
  select(query?: string, options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): DbFilter;
  insert(values: Values | Values[]): DbFilter;
  update(values: Values): DbFilter;
  upsert(values: Values | Values[], options?: { onConflict?: string }): DbFilter;
  delete(): DbFilter;
}

export interface AdminDb {
  from(table: string): DbTable;
}

/**
 * Service role first — `requireAdmin()` has already authorised the caller, and
 * the service client can read across every table without a session round trip.
 * Falls back to the request-scoped RLS client, where the schema's admin
 * policies grant the same reach. Null in demo mode.
 */
export const adminDb = cache(async (): Promise<AdminDb | null> => {
  const service = createAdminClient();
  if (service) return service as unknown as AdminDb;
  const rls = await createClient();
  return rls ? (rls as unknown as AdminDb) : null;
});
