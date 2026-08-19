import 'server-only';
import type { createClient } from '@/lib/supabase/server';

/* ==========================================================================
   Typed writes against the placeholder schema.

   `Database` in `@/lib/supabase/types` is a hand-written stub: every table is
   an index signature rather than a named definition. PostgREST's generics
   resolve an insert/update payload by looking the table name up in that map,
   and an index signature collapses the payload type to `never` — so a
   perfectly valid `update({ full_name })` fails to compile.

   Rather than reach for `any`, writes go through this narrow structural view
   of the builder. When `supabase gen types` replaces the stub, deleting this
   file and calling `sb.from(...)` directly restores full column-level typing.
   ========================================================================== */

type Client = NonNullable<Awaited<ReturnType<typeof createClient>>>;

type Payload = Record<string, unknown>;

type WriteResult = { error: { message: string } | null };

interface FilteredWrite extends PromiseLike<WriteResult> {
  eq(column: string, value: string): FilteredWrite;
}

interface TableWriter {
  insert(values: Payload): PromiseLike<WriteResult>;
  update(values: Payload): FilteredWrite;
  delete(): FilteredWrite;
}

/** A write handle for one table. Reads keep using `sb.from(...)` directly. */
export function writeTable(client: Client, table: string): TableWriter {
  return client.from(table) as unknown as TableWriter;
}
