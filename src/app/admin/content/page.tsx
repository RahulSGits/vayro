import { requireAdmin } from '@/lib/auth';
import {
  FeaturedProducts, HomepageForm, JournalManager, PageHeader, StatStrip,
} from '@/components/admin';
import { getSettings, listJournalPosts, listProducts } from '../_data/queries';

export const metadata = { title: 'Content' };

export default async function AdminContentPage() {
  await requireAdmin();

  const [posts, products, settings] = await Promise.all([
    listJournalPosts(),
    listProducts(),
    getSettings(),
  ]);

  const published = posts.filter((post) => post.publishedAt).length;
  const featured = products.filter((product) => product.featured).length;

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Catalogue"
        title="Content"
        description="The words and the selection: journal entries, the featured set, and the copy that opens the homepage."
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'Journal posts', value: String(posts.length) },
          { label: 'Published', value: String(published) },
          { label: 'Drafts', value: String(posts.length - published), tone: posts.length - published > 0 ? 'warning' : 'default' },
          { label: 'Featured products', value: String(featured) },
        ]}
      />

      <div className="mt-4 flex flex-col gap-4">
        <HomepageForm settings={settings.homepage} />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          <JournalManager posts={posts} />
          <FeaturedProducts products={products} />
        </div>
      </div>
    </div>
  );
}
