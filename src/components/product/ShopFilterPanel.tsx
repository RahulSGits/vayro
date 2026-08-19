import Link from 'next/link';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, Collection, Currency } from '@/types';
import {
  SORTS,
  activeFilterCount,
  buildHref,
  clearedHref,
  priceBands,
  type ShopState,
} from './shop-params';

/* ==========================================================================
   ShopFilterPanel — the filter rail.

   Every control is a link. Filters therefore survive a hard refresh, can be
   shared, are crawlable, and work with JavaScript off. Selecting an active
   facet links to its own removal, so one control does both directions.
   ========================================================================== */

export type Facets = {
  colorways: { name: string; hex: string }[];
  sizes: string[];
  priceRange: { min: number; max: number };
};

type Props = {
  basePath: string;
  state: ShopState;
  facets: Facets;
  categories: Category[];
  collections: Collection[];
  currency?: Currency;
  /** Collection landing pages already imply their collection. */
  hideCollections?: boolean;
  className?: string;
};

export function ShopFilterPanel({
  basePath,
  state,
  facets,
  categories,
  collections,
  currency = 'INR',
  hideCollections = false,
  className,
}: Props) {
  const bands = priceBands(facets.priceRange, currency);
  const active = activeFilterCount(state, hideCollections ? ['collection'] : []);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline justify-between gap-4 pb-5">
        <h2 className="t-label text-[var(--fg-muted)]">Filter</h2>
        {active > 0 ? (
          <Link
            href={clearedHref(basePath, state)}
            scroll={false}
            data-cursor="link"
            className="t-label-sm text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Clear {active}
          </Link>
        ) : null}
      </div>

      <FilterGroup title="Category">
        {categories.map((category) => (
          <FilterLink
            key={category.slug}
            href={buildHref(basePath, state, {
              category: state.category === category.slug ? null : category.slug,
            })}
            selected={state.category === category.slug}
          >
            {category.name}
          </FilterLink>
        ))}
      </FilterGroup>

      {!hideCollections && collections.length > 0 ? (
        <FilterGroup title="Collection">
          {collections.map((collection) => (
            <FilterLink
              key={collection.slug}
              href={buildHref(basePath, state, {
                collection: state.collection === collection.slug ? null : collection.slug,
              })}
              selected={state.collection === collection.slug}
            >
              {collection.name}
            </FilterLink>
          ))}
        </FilterGroup>
      ) : null}

      {facets.colorways.length > 0 ? (
        <FilterGroup title="Colourway">
          {facets.colorways.map((colorway) => {
            const selected = state.colorway === colorway.name;
            return (
              <li key={colorway.name}>
                <Link
                  href={buildHref(basePath, state, { colorway: selected ? null : colorway.name })}
                  scroll={false}
                  aria-current={selected ? 'true' : undefined}
                  data-cursor="link"
                  className={cn(
                    'group flex items-center gap-3 py-1.5 text-left',
                    'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                    selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'h-3.5 w-3.5 shrink-0 border transition-colors duration-[var(--d-fast)]',
                      selected ? 'border-[var(--fg)] ring-1 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)]' : 'border-[var(--border-strong)]',
                    )}
                    style={{ background: colorway.hex }}
                  />
                  <span className="t-body-sm">{colorway.name}</span>
                </Link>
              </li>
            );
          })}
        </FilterGroup>
      ) : null}

      {facets.sizes.length > 0 ? (
        <FilterGroup title="Size" as="div">
          <div className="flex flex-wrap gap-1.5 pt-1">
            {facets.sizes.map((size) => {
              const selected = state.size === size;
              return (
                <Link
                  key={size}
                  href={buildHref(basePath, state, { size: selected ? null : size })}
                  scroll={false}
                  aria-current={selected ? 'true' : undefined}
                  data-cursor="link"
                  className={cn(
                    't-label-sm inline-flex h-9 min-w-9 items-center justify-center px-3',
                    'border transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                    selected
                      ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                      : 'border-[var(--border-strong)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]',
                  )}
                >
                  {size}
                </Link>
              );
            })}
          </div>
        </FilterGroup>
      ) : null}

      {bands.length > 0 ? (
        <FilterGroup title="Price">
          {bands.map((band) => {
            const selected = state.min === band.min && state.max === band.max;
            return (
              <FilterLink
                key={band.label}
                href={buildHref(basePath, state, {
                  min: selected ? null : band.min,
                  max: selected ? null : band.max,
                })}
                selected={selected}
              >
                {band.label}
              </FilterLink>
            );
          })}
        </FilterGroup>
      ) : null}

      <FilterGroup title="Availability">
        <FilterLink
          href={buildHref(basePath, state, { inStock: !state.inStock })}
          selected={state.inStock}
        >
          In stock only
        </FilterLink>
      </FilterGroup>

      <FilterGroup title="Sort" last>
        {SORTS.map((sort) => (
          <FilterLink
            key={sort.value}
            href={buildHref(basePath, state, { sort: sort.value })}
            selected={state.sort === sort.value}
          >
            {sort.label}
          </FilterLink>
        ))}
      </FilterGroup>
    </div>
  );
}

/* ------------------------------------------------------------ primitives -- */

function FilterGroup({
  title,
  children,
  as = 'ul',
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  as?: 'ul' | 'div';
  last?: boolean;
}) {
  const List = as;
  return (
    <section className={cn('border-t border-[var(--border)] py-5', last && 'border-b')}>
      <h3 className="t-label-sm mb-3 text-[var(--fg-subtle)]">{title}</h3>
      <List>{children}</List>
    </section>
  );
}

function FilterLink({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        aria-current={selected ? 'true' : undefined}
        data-cursor="link"
        className={cn(
          'flex items-center justify-between gap-3 py-1.5',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
          selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
        )}
      >
        <span className="t-body-sm">{children}</span>
        {selected ? <Check size={13} strokeWidth={1.5} aria-hidden className="shrink-0" /> : null}
      </Link>
    </li>
  );
}
