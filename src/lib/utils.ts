import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Currency } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_BY_CURRENCY: Record<Currency, string> = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB',
};

/** Formats minor units (paise/cents) as a display price. */
export function formatPrice(
  minorUnits: number,
  currency: Currency = 'INR',
  { compact = false }: { compact?: boolean } = {},
) {
  const value = minorUnits / 100;
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(value);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', ...opts,
  }).format(new Date(iso));
}

export function slugify(input: string) {
  return input.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Deterministic order number — no randomness in render paths. */
export function orderNumber(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `VY-${String(h % 100000).padStart(5, '0')}`;
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

/** Maps a value from one range to another, clamped. */
export function mapRange(n: number, a1: number, a2: number, b1: number, b2: number) {
  if (a2 === a1) return b1;
  return clamp(b1 + ((n - a1) * (b2 - b1)) / (a2 - a1), Math.min(b1, b2), Math.max(b1, b2));
}

export function pluralise(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export const isBrowser = typeof window !== 'undefined';
