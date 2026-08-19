import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import {
  ActionButtonForm, DeleteProductForm, MetaList, PageHeader, Panel, ProductForm, ProductStatusPill,
} from '@/components/admin';
import { adminContext, getProductById, getTaxonomy } from '../../_data/queries';
import { setProductStatus } from '../../actions';

export async function generateMetadata({ params }: PageProps<'/admin/products/[id]'>) {
  const { id } = await params;
  const product = await getProductById(id);
  return { title: product ? product.name : 'Product' };
}

export default async function EditProductPage({ params }: PageProps<'/admin/products/[id]'>) {
  await requireAdmin();
  const { id } = await params;

  const [{ demo }, product, { categories, collections }] = await Promise.all([
    adminContext(),
    getProductById(id),
    getTaxonomy(),
  ]);

  if (!product) notFound();

  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Catalogue"
        title={product.name}
        description={product.subtitle ?? undefined}
        back={{ href: '/admin/products', label: 'Products' }}
        actions={
          <>
            <ProductStatusPill status={product.status} className="mr-2" />
            <ActionButtonForm
              action={setProductStatus}
              fields={{ id: product.id, status: product.status === 'published' ? 'draft' : 'published' }}
              variant={product.status === 'published' ? 'secondary' : 'primary'}
              size="sm"
            >
              {product.status === 'published' ? 'Unpublish' : 'Publish'}
            </ActionButtonForm>
            {product.status !== 'archived' ? (
              <ActionButtonForm
                action={setProductStatus}
                fields={{ id: product.id, status: 'archived' }}
                variant="ghost"
                size="sm"
                confirm={`Archive ${product.name}? It stays in the records but leaves the storefront.`}
              >
                Archive
              </ActionButtonForm>
            ) : null}
          </>
        }
      />

      <div className="mt-8">
        <Panel title="Record">
          <MetaList
            columns={3}
            items={[
              { label: 'Identifier', value: product.id, mono: true },
              { label: 'Slug', value: `/${product.slug}`, mono: true },
              { label: 'Created', value: formatDate(product.createdAt) },
              { label: 'Last updated', value: formatDate(product.updatedAt) },
              { label: 'Variants', value: `${product.variants.length} · ${totalStock} units`, mono: true },
              {
                label: 'Collections',
                value: product.collectionSlugs.length ? product.collectionSlugs.join(', ') : '—',
              },
            ]}
          />
        </Panel>
      </div>

      <ProductForm product={product} categories={categories} collections={collections} demo={demo} />

      <div className="mt-14">
        <Panel title="Delete" className="border-[color-mix(in_oklab,var(--danger)_35%,var(--border))]">
          <DeleteProductForm product={{ id: product.id, name: product.name }} />
        </Panel>
      </div>
    </div>
  );
}
