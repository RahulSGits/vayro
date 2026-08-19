import { requireAdmin } from '@/lib/auth';
import { PageHeader, ProductForm } from '@/components/admin';
import { adminContext, getTaxonomy } from '../../_data/queries';

export const metadata = { title: 'New product' };

export default async function NewProductPage() {
  await requireAdmin();
  const [{ demo }, { categories, collections }] = await Promise.all([adminContext(), getTaxonomy()]);

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Catalogue"
        title="New product"
        description="A product needs at least one variant and one image before it can be saved. Start as a draft — publishing is a separate, deliberate act."
        back={{ href: '/admin/products', label: 'Products' }}
      />

      <ProductForm product={null} categories={categories} collections={collections} demo={demo} />
    </div>
  );
}
