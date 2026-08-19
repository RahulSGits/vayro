import { formatPrice } from '@/lib/utils';
import type { ShopFilters } from '@/lib/repo/products';
import type { Currency } from '@/types';

/* ==========================================================================
   Shop URL contract.

   Every filter lives in the query string so a filtered view is shareable,
   bookmarkable and crawlable. Filter controls are links built from these
   helpers, which means the whole rail works with JavaScript switched off.
   ========================================================================== */

export type ShopSearchParams = Record<string, string | string[] | undefined>;

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price, low to high' },
  { value: 'price-desc', label: 'Price, high to low' },
  { value: 'name', label: 'A–Z' },
] as const;

export type SortValue = (typeof SORTS)[number]['value'];

const SORT_VALUES = SORTS.map((sort) => sort.value) as readonly string[];

/** The parsed, normalised state of the shop URL. */
export type ShopState = {
  category: string | null;
  collection: string | null;
  colorway: string | null;
  size: string | null;
  min: number | null;
  max: number | null;
  inStock: boolean;
  sort: SortValue;
  q: string | null;
};

function one(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

function money(value: string | string[] | undefined): number | null {
  const raw = one(value);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function parseShopParams(params: ShopSearchParams): ShopState {
  const sort = one(params.sort);
  const min = money(params.min);
  const max = money(params.max);
  return {
    category: one(params.category),
    collection: one(params.collection),
    colorway: one(params.colorway),
    size: one(params.size),
    // A reversed range is a typed URL, not an empty shop — fix it silently.
    min: min !== null && max !== null ? Math.min(min, max) : min,
    max: min !== null && max !== null ? Math.max(min, max) : max,
    inStock: one(params.stock) === '1',
    sort: sort && SORT_VALUES.includes(sort) ? (sort as SortValue) : 'featured',
    q: one(params.q),
  };
}

/** Maps the URL state onto the repository's filter contract. */
export function toRepoFilters(state: ShopState, overrides: Partial<ShopFilters> = {}): ShopFilters {
  return {
    category: state.category ?? undefined,
    collection: state.collection ?? undefined,
    colorway: state.colorway ?? undefined,
    size: state.size ?? undefined,
    minPrice: state.min ?? undefined,
    maxPrice: state.max ?? undefined,
    inStock: state.inStock || undefined,
    sort: state.sort,
    q: state.q ?? undefined,
    ...overrides,
  };
}

/** Filters that a user can clear — sort and the search term are not "filters". */
export function activeFilterCount(state: ShopState, exclude: (keyof ShopState)[] = []): number {
  const keys: (keyof ShopState)[] = ['category', 'collection', 'colorway', 'size', 'min', 'max', 'inStock'];
  return keys
    .filter((key) => !exclude.includes(key))
    .filter((key) => {
      const value = state[key];
      return key === 'inStock' ? value === true : value !== null;
    }).length;
}

type Patch = Partial<Record<'category' | 'collection' | 'colorway' | 'size' | 'sort' | 'q', string | null>> & {
  min?: number | null;
  max?: number | null;
  inStock?: boolean;
};

/**
 * Builds a href from the current state plus a patch. `null` clears a key, so a
 * selected facet can link to its own removal — one control, both directions.
 */
export function buildHref(basePath: string, state: ShopState, patch: Patch = {}): string {
  const next: ShopState = {
    ...state,
    ...(patch.category !== undefined ? { category: patch.category } : null),
    ...(patch.collection !== undefined ? { collection: patch.collection } : null),
    ...(patch.colorway !== undefined ? { colorway: patch.colorway } : null),
    ...(patch.size !== undefined ? { size: patch.size } : null),
    ...(patch.min !== undefined ? { min: patch.min } : null),
    ...(patch.max !== undefined ? { max: patch.max } : null),
    ...(patch.inStock !== undefined ? { inStock: patch.inStock } : null),
    ...(patch.sort !== undefined ? { sort: (patch.sort ?? 'featured') as SortValue } : null),
    ...(patch.q !== undefined ? { q: patch.q } : null),
  };

  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.category) query.set('category', next.category);
  if (next.collection) query.set('collection', next.collection);
  if (next.colorway) query.set('colorway', next.colorway);
  if (next.size) query.set('size', next.size);
  if (next.min !== null) query.set('min', String(next.min));
  if (next.max !== null) query.set('max', String(next.max));
  if (next.inStock) query.set('stock', '1');
  if (next.sort !== 'featured') query.set('sort', next.sort);

  const search = query.toString();
  return search ? `${basePath}?${search}` : basePath;
}

/** Clears every facet but keeps the sort order and any search term. */
export function clearedHref(basePath: string, state: ShopState): string {
  return buildHref(basePath, state, {
    category: null,
    collection: null,
    colorway: null,
    size: null,
    min: null,
    max: null,
    inStock: false,
  });
}

/** Stable identity for the current URL state — used to reset transient UI. */
export function stateKey(basePath: string, state: ShopState): string {
  return buildHref(basePath, state);
}

/* ------------------------------------------------------------ price bands */

export type PriceBand = { label: string; min: number | null; max: number | null };

/** Derives readable bands from the live catalogue's range — never hard-coded. */
export function priceBands(range: { min: number; max: number }, currency: Currency = 'INR'): PriceBand[] {
  const { min, max } = range;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return [];
  const step = Math.round((max - min) / 3 / 10000) * 10000 || Math.round((max - min) / 3);
  const first = min + step;
  const second = min + step * 2;
  const money = (value: number) => formatPrice(value, currency);
  // Boundaries stay on round numbers so the chip label reads as a price, not
  // as a price minus one paisa.
  return [
    { label: `Up to ${money(first)}`, min: null, max: first },
    { label: `${money(first)} – ${money(second)}`, min: first, max: second },
    { label: `${money(second)} and above`, min: second, max: null },
  ];
}
