import type { MetadataRoute } from 'next';
import { getCollections, getJournalPosts, getProducts } from '@/lib/repo/products';
import { absoluteUrl } from '@/lib/seo';

/* ==========================================================================
   sitemap.xml

   Public, indexable surface only. Everything behind a session (/account,
   /admin), everything transactional (/cart, /checkout) and the auth screens
   are deliberately absent — robots.ts disallows them as well.

   Catalogue entries come from the repo layer, so the sitemap follows Supabase
   once it is provisioned and falls back to the seed catalogue before then. A
   read failure degrades to the static routes rather than to a 500: a partial
   sitemap is worth far more to a crawler than none.
   ========================================================================== */

type Entry = MetadataRoute.Sitemap[number];

/** Editorial and support pages, in the order the navigation presents them. */
const STATIC_ROUTES: { path: string; priority: number; changeFrequency: Entry['changeFrequency'] }[] = [
  { path: '/', priority: 1, changeFrequency: 'weekly' },
  { path: '/shop', priority: 0.9, changeFrequency: 'daily' },
  { path: '/collections', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/technology', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/story', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/journal', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/size-guide', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/shipping', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/returns', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/care', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/faq', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/legal/terms', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/privacy', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/cookies', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/legal/accessibility', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  try {
    const [products, collections, posts] = await Promise.all([
      getProducts(),
      getCollections(),
      getJournalPosts(),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: new Date(product.createdAt),
      changeFrequency: 'weekly',
      // The hero product leads the catalogue; everything else sits a step below.
      priority: product.featured ? 0.9 : 0.8,
    }));

    const collectionEntries: MetadataRoute.Sitemap = collections.map((collection) => ({
      url: absoluteUrl(`/collections/${collection.slug}`),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    const journalEntries: MetadataRoute.Sitemap = posts.map((post) => ({
      url: absoluteUrl(`/journal/${post.slug}`),
      lastModified: new Date(post.publishedAt),
      changeFrequency: 'yearly',
      priority: 0.6,
    }));

    return [...staticEntries, ...productEntries, ...collectionEntries, ...journalEntries];
  } catch (error) {
    console.error('[vayro:sitemap] catalogue read failed, serving static routes only', error);
    return staticEntries;
  }
}
