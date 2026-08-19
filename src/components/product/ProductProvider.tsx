'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { Product, ProductImage, ProductVariant } from '@/types';
import { useCart } from '@/store/cart';
import { useToast } from '@/components/ui/Toast';
import {
  defaultColorway,
  defaultSize,
  findVariant,
  galleryImages,
  variantsFor,
} from './product-utils';

/* ==========================================================================
   ProductProvider — the PDP's shared selection state.

   The gallery column and the buy column are separate client islands either
   side of server-rendered editorial content, so the colourway, size and
   quantity live here rather than in either one. Everything below the fold
   stays on the server.
   ========================================================================== */

type ProductContextValue = {
  product: Product;
  colorway: string;
  setColorway: (colorway: string) => void;
  size: string | null;
  setSize: (size: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  /** Variants of the selected colourway, in size order. */
  sizeVariants: ProductVariant[];
  /** The exact variant the current selection resolves to, if any. */
  variant: ProductVariant | null;
  /** Gallery filtered to the selected colourway. */
  images: ProductImage[];
  activeImage: number;
  setActiveImage: (index: number) => void;
  /** Why the buy button is disabled, or null when it is not. */
  blockedReason: string | null;
  addToCart: () => void;
  buyNow: () => void;
};

const ProductContext = createContext<ProductContextValue | null>(null);

export function useProductState(component: string): ProductContextValue {
  const context = useContext(ProductContext);
  if (!context) throw new Error(`<${component}> must be used inside <ProductProvider>.`);
  return context;
}

export function ProductProvider({
  product,
  children,
}: {
  product: Product;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const add = useCart((state) => state.add);
  const setCartOpen = useCart((state) => state.setOpen);

  const [colorway, setColorwayState] = useState(() => defaultColorway(product));
  const [size, setSize] = useState<string | null>(() => defaultSize(product, defaultColorway(product)));
  const [quantity, setQuantityState] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  const sizeVariants = useMemo(() => variantsFor(product, colorway), [product, colorway]);
  const images = useMemo(() => galleryImages(product, colorway), [product, colorway]);
  const variant = useMemo(
    () => (size ? findVariant(product, colorway, size) : null),
    [product, colorway, size],
  );

  const setColorway = useCallback(
    (next: string) => {
      setColorwayState(next);
      // A new colourway is a new gallery — start it at its own lead plate.
      setActiveImage(0);
      // Single-size products (caps, packs) should never need a second click.
      const only = defaultSize(product, next);
      if (only) setSize(only);
    },
    [product],
  );

  const setQuantity = useCallback(
    (next: number) => {
      const ceiling = Math.max(variant?.stock ?? 1, 1);
      setQuantityState(Math.min(Math.max(next, 1), Math.min(ceiling, 10)));
    },
    [variant],
  );

  const blockedReason = useMemo(() => {
    if (sizeVariants.length === 0) return 'This colourway is unavailable.';
    if (!size) return 'Select a size';
    if (!variant) return 'That size is not made in this colourway.';
    if (!variant.available || variant.stock <= 0) return `Size ${size} is sold out in ${colorway}.`;
    return null;
  }, [sizeVariants, size, variant, colorway]);

  const commit = useCallback((): ProductVariant | null => {
    if (blockedReason || !variant) return null;
    add(product, variant, quantity);
    return variant;
  }, [add, blockedReason, product, quantity, variant]);

  const addToCart = useCallback(() => {
    const added = commit();
    if (!added) return;
    setCartOpen(true);
  }, [commit, setCartOpen]);

  const buyNow = useCallback(() => {
    const added = commit();
    if (!added) return;
    toast({
      title: 'Taking you to checkout',
      description: `${product.name} — ${added.colorway}, ${added.size}`,
      duration: 2400,
    });
    router.push('/checkout');
  }, [commit, product.name, router, toast]);

  const value = useMemo<ProductContextValue>(
    () => ({
      product,
      colorway,
      setColorway,
      size,
      setSize,
      quantity,
      setQuantity,
      sizeVariants,
      variant,
      images,
      activeImage,
      setActiveImage,
      blockedReason,
      addToCart,
      buyNow,
    }),
    [
      product, colorway, setColorway, size, quantity, setQuantity, sizeVariants,
      variant, images, activeImage, blockedReason, addToCart, buyNow,
    ],
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
}
