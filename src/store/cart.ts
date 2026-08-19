'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLine, Product, ProductVariant } from '@/types';
import { track } from '@/lib/analytics';

type CartState = {
  lines: CartLine[];
  open: boolean;
  discountCode: string | null;
  discountPercent: number;
  /** Set by the add-to-cart flight animation so the drawer can await it. */
  lastAddedId: string | null;

  add: (product: Product, variant: ProductVariant, quantity?: number) => void;
  remove: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
  applyDiscount: (code: string) => { ok: boolean; message: string };
  clearDiscount: () => void;
};

/** Demo promotions. Replace with server-validated codes before launch. */
const DEMO_CODES: Record<string, number> = { FIRSTLAYER: 10, FIELDTEST: 15 };

export const SHIPPING_FREE_THRESHOLD = 500000; // ₹5,000 in paise
export const SHIPPING_FLAT = 19900;            // ₹199

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      open: false,
      discountCode: null,
      discountPercent: 0,
      lastAddedId: null,

      add: (product, variant, quantity = 1) => {
        const id = `${product.id}:${variant.id}`;
        const existing = get().lines.find((l) => l.id === id);
        const max = Math.max(variant.stock, 0);
        if (max === 0) return;

        const nextQty = Math.min((existing?.quantity ?? 0) + quantity, max);
        const line: CartLine = {
          id,
          productId: product.id,
          variantId: variant.id,
          slug: product.slug,
          name: product.name,
          colorway: variant.colorway,
          colorHex: variant.colorHex,
          size: variant.size,
          unitPrice: variant.priceOverride ?? product.price,
          currency: product.currency,
          quantity: nextQty,
          image: product.images.find((i) => i.colorway === variant.colorway)?.url
            ?? product.images[0]?.url ?? '',
          maxQuantity: max,
        };

        set((s) => ({
          lines: existing ? s.lines.map((l) => (l.id === id ? line : l)) : [...s.lines, line],
          lastAddedId: id,
        }));

        track('add_to_cart', {
          productId: product.id, variantId: variant.id, quantity,
          value: line.unitPrice * quantity, currency: product.currency,
        });
      },

      remove: (lineId) => {
        const line = get().lines.find((l) => l.id === lineId);
        if (line) track('remove_from_cart', { productId: line.productId, variantId: line.variantId });
        set((s) => ({ lines: s.lines.filter((l) => l.id !== lineId) }));
      },

      setQuantity: (lineId, quantity) =>
        set((s) => ({
          lines: quantity <= 0
            ? s.lines.filter((l) => l.id !== lineId)
            : s.lines.map((l) =>
                l.id === lineId ? { ...l, quantity: Math.min(quantity, l.maxQuantity) } : l),
        })),

      clear: () => set({ lines: [], discountCode: null, discountPercent: 0 }),
      setOpen: (open) => set({ open }),

      applyDiscount: (code) => {
        const key = code.trim().toUpperCase();
        const percent = DEMO_CODES[key];
        if (!percent) return { ok: false, message: 'That code is not recognised.' };
        set({ discountCode: key, discountPercent: percent });
        return { ok: true, message: `${percent}% applied.` };
      },
      clearDiscount: () => set({ discountCode: null, discountPercent: 0 }),
    }),
    {
      name: 'vayro.cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, discountCode: s.discountCode, discountPercent: s.discountPercent }),
      version: 1,
    },
  ),
);

/* ------------------------------------------------------------- selectors -- */

export const selectCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const selectSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

export function cartTotals(lines: CartLine[], discountPercent: number) {
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const discount = Math.round((subtotal * discountPercent) / 100);
  const afterDiscount = subtotal - discount;
  const shipping = lines.length === 0 || afterDiscount >= SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_FLAT;
  const tax = 0; // computed at checkout from the destination
  return { subtotal, discount, shipping, tax, total: afterDiscount + shipping + tax };
}
