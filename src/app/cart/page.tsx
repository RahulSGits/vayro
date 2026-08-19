import type { Metadata } from 'next';
import { getFeaturedProducts } from '@/lib/repo/products';
import { CartView, type CartSuggestion } from './CartView';

export const metadata: Metadata = {
  title: 'Cart',
  description:
    'Review your bag before checkout. Free standard shipping above ₹5,000, returns within 30 days.',
  alternates: { canonical: '/cart' },
  // A personal, session-specific view — never a search result.
  robots: { index: false, follow: true },
};

/**
 * The bag itself lives in the browser, so the server's only job is to bring
 * along three real products for the empty state and the cross-sell rail.
 */
export default async function CartPage() {
  const featured = await getFeaturedProducts();

  const suggestions: CartSuggestion[] = featured.slice(0, 3).map((product) => {
    const image =
      product.images.find((entry) => entry.kind === 'technical') ?? product.images[0] ?? null;

    return {
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price,
      currency: product.currency,
      image: image?.url ?? null,
      alt: image?.alt ?? product.name,
    };
  });

  return <CartView suggestions={suggestions} />;
}
