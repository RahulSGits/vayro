'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft, Search as SearchIcon } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { t } from '@/lib/motion';
import { track } from '@/lib/analytics';
import { z as zIndex } from '@/lib/design-tokens';
import type { Currency } from '@/types';
import { Portal, useEscapeKey, useFocusTrap, useScrollLock } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/States';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   SearchOverlay — instant search, ⌘K, arrow-key driven.

   The API route is owned elsewhere, so the payload is normalised defensively:
   arrays, `{ results }`, or per-type buckets all resolve to the same shape,
   and any failure degrades to an empty state rather than an error screen.
   ========================================================================== */

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;
const RECENT_KEY = 'vayro.recent-searches';
const MAX_RECENT = 5;

const SUGGESTIONS = ['Meridian', 'Packable shells', 'Travel'] as const;

type ResultType = 'product' | 'collection' | 'journal' | 'page';

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
  href: string;
  image?: string;
  price?: number;
  currency?: Currency;
};

const GROUP_LABEL: Record<ResultType, string> = {
  product: 'Products',
  collection: 'Collections',
  journal: 'Journal',
  page: 'Pages',
};

const GROUP_ORDER: ResultType[] = ['product', 'collection', 'journal', 'page'];

const HREF_PREFIX: Record<ResultType, string> = {
  product: '/products',
  collection: '/collections',
  journal: '/journal',
  page: '',
};

/* ------------------------------------------------------------ normalising */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function resolveType(raw: Record<string, unknown>, bucket: string | undefined): ResultType {
  const declared = asString(raw.type) ?? asString(raw.kind) ?? bucket;
  switch (declared) {
    case 'product':
    case 'products':
      return 'product';
    case 'collection':
    case 'collections':
      return 'collection';
    case 'journal':
    case 'posts':
    case 'post':
      return 'journal';
    default:
      return raw.price !== undefined ? 'product' : 'page';
  }
}

function resolveImage(raw: Record<string, unknown>): string | undefined {
  const direct =
    asString(raw.image) ?? asString(raw.heroImage) ?? asString(raw.hero_image) ?? asString(raw.thumbnail);
  if (direct) return direct;
  const images = raw.images;
  if (Array.isArray(images)) {
    const first = asRecord(images[0]);
    return asString(first?.url) ?? asString(images[0]);
  }
  return undefined;
}

function toResult(value: unknown, bucket: string | undefined, index: number): SearchResult | null {
  const raw = asRecord(value);
  if (!raw) return null;

  const title = asString(raw.title) ?? asString(raw.name) ?? asString(raw.label);
  if (!title) return null;

  const type = resolveType(raw, bucket);
  const slug = asString(raw.slug);
  const href = asString(raw.href) ?? asString(raw.url) ?? (slug ? `${HREF_PREFIX[type]}/${slug}` : undefined);
  if (!href) return null;

  const currency = asString(raw.currency);

  return {
    id: asString(raw.id) ?? `${type}-${slug ?? index}`,
    type,
    title,
    subtitle:
      asString(raw.subtitle) ?? asString(raw.excerpt) ?? asString(raw.tagline) ?? asString(raw.category),
    href,
    image: resolveImage(raw),
    price: typeof raw.price === 'number' ? raw.price : undefined,
    currency:
      currency === 'INR' || currency === 'USD' || currency === 'EUR' || currency === 'GBP'
        ? currency
        : undefined,
  };
}

/** Accepts every shape a search route might plausibly return. */
function normalise(payload: unknown): SearchResult[] {
  if (Array.isArray(payload)) {
    return payload
      .map((entry, i) => toResult(entry, undefined, i))
      .filter((result): result is SearchResult => result !== null);
  }
  const root = asRecord(payload);
  if (!root) return [];

  const out: SearchResult[] = [];
  for (const key of ['results', 'products', 'collections', 'journal', 'posts', 'pages', 'items', 'hits']) {
    const bucket = root[key];
    if (!Array.isArray(bucket)) continue;
    bucket.forEach((entry, i) => {
      const result = toResult(entry, key, i);
      if (result) out.push(result);
    });
  }
  return out;
}

/* -------------------------------------------------------------- recents -- */

function readRecent(): string[] {
  try {
    const stored = window.localStorage.getItem(RECENT_KEY);
    const parsed = stored ? (JSON.parse(stored) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ shell */

/**
 * Owns the ⌘K binding and the presence transition. All search state lives in
 * the panel below, which only exists while the overlay is open — so every
 * opening starts clean without a reset effect.
 */
export function SearchOverlay({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      onOpenChange(!open);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <Portal>
      <AnimatePresence>
        {/* Keyed so AnimatePresence can release the panel when it exits. */}
        {open ? <SearchPanel key="search-panel" onClose={() => onOpenChange(false)} /> : null}
      </AnimatePresence>
    </Portal>
  );
}

/* ------------------------------------------------------------------ panel */

type Status = 'idle' | 'loading' | 'ready' | 'unavailable';

function SearchPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [active, setActive] = useState(0);
  // Mounted client-side only (inside Portal), so reading storage here is safe.
  const [recent, setRecent] = useState<string[]>(readRecent);

  useScrollLock(true);
  useFocusTrap(panelRef, true);
  useEscapeKey(true, onClose);

  const remember = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed.length < MIN_QUERY) return;
    setRecent((current) => {
      const next = [trimmed, ...current.filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase())].slice(
        0,
        MAX_RECENT,
      );
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        /* private mode — the session still works, it just will not remember */
      }
      return next;
    });
  }, []);

  /* ------------------------------------------------------- debounced fetch */
  const trimmed = query.trim();
  useEffect(() => {
    if (trimmed.length < MIN_QUERY) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });

        if (!response.ok) {
          // The route may not be provisioned yet — show nothing, not an error wall.
          setResults([]);
          setStatus('unavailable');
          return;
        }

        const payload: unknown = await response.json();
        const list = normalise(payload);
        setResults(list);
        setActive(0);
        setStatus('ready');
        track('search', { query: trimmed, results: list.length });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        setResults([]);
        setStatus('unavailable');
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const groups = useMemo<{ grouped: { type: ResultType; items: SearchResult[] }[]; flat: SearchResult[] }>(() => {
    if (trimmed.length < MIN_QUERY) return { grouped: [], flat: [] };
    const flat: SearchResult[] = [];
    const grouped = GROUP_ORDER.map((type) => ({
      type,
      items: results.filter((entry) => entry.type === type),
    })).filter((group) => group.items.length > 0);
    grouped.forEach((group) => flat.push(...group.items));
    return { grouped, flat };
  }, [results, trimmed]);

  const go = useCallback(
    (href: string) => {
      remember(query);
      onClose();
      router.push(href);
    },
    [onClose, router, remember, query],
  );

  const onInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      const count = groups.flat.length;
      if (event.key === 'ArrowDown' && count) {
        event.preventDefault();
        setActive((index) => (index + 1) % count);
      } else if (event.key === 'ArrowUp' && count) {
        event.preventDefault();
        setActive((index) => (index - 1 + count) % count);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const target = groups.flat[active];
        if (target) go(target.href);
        else if (trimmed.length >= MIN_QUERY) go(`/shop?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [groups.flat, active, go, trimmed],
  );

  /* Keep the highlighted option inside the scroll port. */
  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, results]);

  const listboxId = 'vayro-search-listbox';
  const activeId = groups.flat[active] ? `search-option-${groups.flat[active].id}` : undefined;
  const searching = trimmed.length >= MIN_QUERY;
  const pending = searching && (status === 'loading' || status === 'idle');

  return (
    <div className="fixed inset-0" style={{ zIndex: zIndex.overlay }}>
      <motion.div
        aria-hidden
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: t.standard }}
        exit={{ opacity: 0, transition: t.fast }}
        className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[6px]"
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search VAYRO"
        tabIndex={-1}
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0, transition: t.standard }}
        exit={{ opacity: 0, y: -12, transition: t.fast }}
        className="absolute inset-x-0 top-0 max-h-full overflow-y-auto border-b border-[var(--border)] bg-[var(--bg)] outline-none"
      >
        <div className="shell py-6 md:py-8">
          {/* --------------------------------------------------------- input */}
          <div className="flex items-center gap-4 border-b border-[var(--border-strong)] pb-4 md:gap-6">
            <SearchIcon
              size={22}
              strokeWidth={1.1}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
              className="shrink-0 text-[var(--fg-subtle)]"
            />
            <input
              data-autofocus
              type="search"
              role="combobox"
              autoComplete="off"
              spellCheck={false}
              aria-expanded={groups.flat.length > 0}
              aria-controls={listboxId}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              aria-label="Search products, collections and journal"
              placeholder="Search the system"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              className="t-display-md w-full min-w-0 bg-transparent text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
            />
            {pending ? <Spinner size={16} className="shrink-0" /> : null}
            <button
              type="button"
              onClick={onClose}
              className="t-label-sm shrink-0 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
            >
              Esc
            </button>
          </div>

          {/* ------------------------------------------------------- results */}
          <div className="pt-6 pb-2">
            {!searching ? (
              <Prompts
                recent={recent}
                onPick={setQuery}
                onClearRecent={() => {
                  setRecent([]);
                  try {
                    window.localStorage.removeItem(RECENT_KEY);
                  } catch {
                    /* nothing to clear */
                  }
                }}
              />
            ) : groups.flat.length > 0 ? (
              <ul
                ref={listRef}
                id={listboxId}
                role="listbox"
                aria-label="Search results"
                className="max-h-[52vh] overflow-y-auto"
              >
                {groups.grouped.map((group) => (
                  <li key={group.type} role="presentation">
                    <p className="t-label-sm sticky top-0 z-10 bg-[var(--bg)] py-3 text-[var(--fg-subtle)]">
                      {GROUP_LABEL[group.type]}
                    </p>
                    <ul role="group" aria-label={GROUP_LABEL[group.type]}>
                      {group.items.map((item) => {
                        const index = groups.flat.indexOf(item);
                        return (
                          <ResultRow
                            key={item.id}
                            item={item}
                            selected={index === active}
                            onHover={() => setActive(index)}
                            onSelect={() => go(item.href)}
                          />
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : pending ? (
              <div className="py-16 text-center">
                <Spinner />
              </div>
            ) : (
              <EmptyState
                className="py-14"
                title={status === 'unavailable' ? 'Search is offline' : `Nothing for “${trimmed}”`}
                body={
                  status === 'unavailable'
                    ? 'We could not reach the index just now. Browse the full range instead.'
                    : 'Try a product name, a material, or a colourway.'
                }
              />
            )}
          </div>

          {/* --------------------------------------------------------- hints */}
          <div className="t-caption flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--border)] pt-4 text-[var(--fg-subtle)]">
            <Hint keys="↑ ↓" label="Navigate" />
            <Hint keys="↵" label="Open" />
            <Hint keys="Esc" label="Close" />
            {groups.flat.length > 0 ? (
              <span className="ml-auto hidden sm:inline">
                {groups.flat.length} result{groups.flat.length === 1 ? '' : 's'}
              </span>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------- sub-parts -- */

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <kbd className="t-spec border border-[var(--border)] px-1.5 py-0.5 leading-none text-[var(--fg-muted)]">
        {keys}
      </kbd>
      {label}
    </span>
  );
}

function Prompts({
  recent,
  onPick,
  onClearRecent,
}: {
  recent: string[];
  onPick: (value: string) => void;
  onClearRecent: () => void;
}) {
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div>
        <p className="t-label-sm mb-4 text-[var(--fg-subtle)]">Suggested</p>
        <ul className="flex flex-col gap-1">
          {SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => onPick(suggestion)}
                className="t-h3 group flex w-full items-center gap-3 py-1.5 text-left text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
              >
                <span>{suggestion}</span>
                <CornerDownLeft
                  size={13}
                  strokeWidth={1.25}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  aria-hidden
                  className="opacity-0 transition-opacity duration-[var(--d-fast)] group-hover:opacity-60"
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <p className="t-label-sm text-[var(--fg-subtle)]">Recent</p>
          {recent.length > 0 ? (
            <button
              type="button"
              onClick={onClearRecent}
              className="t-caption text-[var(--fg-subtle)] underline underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
            >
              Clear
            </button>
          ) : null}
        </div>
        {recent.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {recent.map((entry) => (
              <li key={entry}>
                <button
                  type="button"
                  onClick={() => onPick(entry)}
                  className="t-label-sm border border-[var(--border)] px-3 py-2 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
                >
                  {entry}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-body-sm text-[var(--fg-subtle)]">
            Nothing yet. Your last searches will collect here.
          </p>
        )}
      </div>
    </div>
  );
}

function ResultRow({
  item,
  selected,
  onHover,
  onSelect,
}: {
  item: SearchResult;
  selected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const local = item.image?.startsWith('/');

  return (
    <li
      id={`search-option-${item.id}`}
      role="option"
      aria-selected={selected}
      data-active={selected}
      data-cursor="link"
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-4 border-b border-[var(--border)] px-2 py-3',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        selected ? 'bg-[var(--bg-sunken)]' : 'bg-transparent',
      )}
    >
      <span className="relative flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden bg-[var(--bg-sunken)]">
        {local && item.image ? (
          <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
        ) : (
          <VayroMark size={16} className="text-[var(--fg-subtle)]" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[var(--fg)]">{item.title}</span>
        {item.subtitle ? (
          <span className="t-caption block truncate text-[var(--fg-subtle)]">{item.subtitle}</span>
        ) : null}
      </span>

      {typeof item.price === 'number' ? (
        <span className="t-price shrink-0 text-[var(--fg-muted)]">
          {formatPrice(item.price, item.currency ?? 'INR')}
        </span>
      ) : null}
    </li>
  );
}
