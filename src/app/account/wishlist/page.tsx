import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getProducts } from '@/lib/repo/products';
import { PageHeading } from '@/components/account/AccountShell';
import { WishlistGrid } from '@/components/account/WishlistGrid';

export const metadata: Metadata = {
  title: 'Wishlist',
  description: 'Pieces you have saved.',
};

export default async function WishlistPage() {
  await requireUser();
  // The saved ids live in the browser store; the catalogue comes from the
  // server so the grid never has to fetch product data itself.
  const products = await getProducts();

  return (
    <div className="flex flex-col gap-14">
      <PageHeading
        eyebrow="Wishlist"
        title="Saved"
        lede="Kept on this device. Move a piece to the bag when the decision is made."
      />

      <WishlistGrid products={products} />
    </div>
  );
}
