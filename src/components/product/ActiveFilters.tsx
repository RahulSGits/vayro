import Link from 'next/link';
import { X } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import type { Category, Collection, Currency } from '@/types';
import { buildHref, clearedHref, type ShopState } from './shop-params';

/* ==========================================================================
   ActiveFilters — the removable summary above the grid.

   Each chip links to the URL without that facet, so removal is a navigation
   rather than a script. Mirrors exactly what the rail has selected.
   ========================================================================== */

type Chip = { key: string; label: string; href: string };

type Props = {
  basePath: string;
  state: ShopState;
  categories: Category[];
  collections: Collection[];
  currency?: Currency;
  hideCollections?: boolean;
  className?: string;
};

export function ActiveFilters({
  basePath,
  state,
  categories,
  collections,
  currency = 'INR',
  hideCollections = false,
  className,
}: Props) {
  const chips: Chip[] = [];

  if (state.category) {
    const match = categories.find((category) => category.slug === state.category);
    chips.push({
      key: 'category',
      label: match?.name ?? state.category,
      href: buildHref(basePath, state, { category: null }),
    });
  }

  if (state.collection && !hideCollections) {
    const match = collections.find((collection) => collection.slug === state.collection);
    chips.push({
      key: 'collection',
      label: match?.name ?? state.collection,
      href: buildHref(basePath, state, { collection: null }),
    });
  }

  if (state.colorway) {
    chips.push({
      key: 'colorway',
      label: state.colorway,
      href: buildHref(basePath, state, { colorway: null }),
    });
  }

  if (state.size) {
    chips.push({
      key: 'size',
      label: `Size ${state.size}`,
      href: buildHref(basePath, state, { size: null }),
    });
  }

  if (state.min !== null || state.max !== null) {
    const min = state.min !== null ? formatPrice(state.min, currency) : null;
    const max = state.max !== null ? formatPrice(state.max, currency) : null;
    chips.push({
      key: 'price',
      label: min && max ? `${min} – ${max}` : min ? `${min} and above` : `Up to ${max}`,
      href: buildHref(basePath, state, { min: null, max: null }),
    });
  }

  if (state.inStock) {
    chips.push({
      key: 'stock',
      label: 'In stock',
      href: buildHref(basePath, state, { inStock: false }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <h2 className="sr-only">Active filters</h2>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          scroll={false}
          data-cursor="link"
          className={cn(
            't-label-sm inline-flex h-8 items-center gap-2 border border-[var(--border-strong)] px-3',
            'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
            'hover:border-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)]',
          )}
        >
          {chip.label}
          <X size={11} strokeWidth={1.5} aria-hidden />
          <span className="sr-only">Remove filter</span>
        </Link>
      ))}
      {chips.length > 1 ? (
        <Link
          href={clearedHref(basePath, state)}
          scroll={false}
          data-cursor="link"
          className="t-label-sm ml-1 text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Clear all
        </Link>
      ) : null}
    </div>
  );
}
