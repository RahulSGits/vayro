/**
 * Row coercion helpers.
 *
 * `Database` in `@/lib/supabase/types` is a deliberately loose stub until the
 * project is linked and types are generated, so every PostgREST row arrives as
 * `Record<string, Json>`. These helpers turn that into the strict domain model
 * in `@/types` without a single `any`, and without throwing on a malformed row —
 * an admin screen that renders a slightly incomplete record is far better than
 * one that 500s.
 */

export type Row = Record<string, unknown>;

export function asRow(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}

export function asRows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map(asRow) : [];
}

/** PostgREST returns embedded to-one relations as an object, or an array of one. */
export function asOne(value: unknown): Row {
  if (Array.isArray(value)) return asRow(value[0]);
  return asRow(value);
}

export function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function nullableStr(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function nullableNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = num(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export function strArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

export function iso(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (value instanceof Date) return value.toISOString();
  return fallback;
}

/** Narrows an unknown to one of a fixed set of literals. */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}
