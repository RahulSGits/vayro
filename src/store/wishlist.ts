'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { track } from '@/lib/analytics';

type WishlistState = {
  ids: string[];
  /** Synced from Supabase on sign-in; local list is the offline mirror. */
  hydratedFromServer: boolean;
  toggle: (productId: string) => void;
  has: (productId: string) => boolean;
  setAll: (ids: string[]) => void;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydratedFromServer: false,
      toggle: (productId) => {
        const has = get().ids.includes(productId);
        track(has ? 'wishlist_remove' : 'wishlist_add', { productId });
        set((s) => ({
          ids: has ? s.ids.filter((i) => i !== productId) : [...s.ids, productId],
        }));
      },
      has: (productId) => get().ids.includes(productId),
      setAll: (ids) => set({ ids, hydratedFromServer: true }),
      clear: () => set({ ids: [] }),
    }),
    { name: 'vayro.wishlist', storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
