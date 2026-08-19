import type { Metadata } from 'next';
import Link from 'next/link';
import { getJournalPosts } from '@/lib/repo/products';
import { buildMetadata, absoluteUrl, SITE } from '@/lib/seo';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { Reveal, RevealChild, RevealText } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/States';
import { ArticleCard, CategoryFilter, categoriesOf } from '@/components/journal';

/* ==========================================================================
   /journal — the index.

   The lead entry is the most recent one inside whatever the reader is looking
   at, so filtering never leaves a headline stranded above a grid it no longer
   belongs to. The filter is a search param, which keeps this page a server
   component and every filtered view linkable.
   ========================================================================== */

export const metadata: Metadata = buildMetadata({
  title: 'Journal',
  description:
    'Field notes from the VAYRO studio — material research, construction decisions, route notes and the reasoning behind the equipment.',
  path: '/journal',
  image: '/media/field-ridgeline.jpg',
  imageAlt: 'A ridgeline under moving cloud',
  imageSize: { width: 1600, height: 900 },
  keywords: ['VAYRO journal', 'material science', 'travel notes', 'technical apparel'],
});

type SearchParams = Promise<{ category?: string | string[] }>;

export default async function JournalPage({ searchParams }: { searchParams: SearchParams }) {
  // searchParams is a request-time API in Next 16 — await before reading it.
  const raw = await searchParams;
  const requested = Array.isArray(raw.category) ? raw.category[0] : raw.category;

  const posts = await getJournalPosts();
  const ordered = [...posts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const categories = categoriesOf(ordered);

  // An unknown category resolves to "everything" rather than an empty page.
  const active = categories.some((entry) => entry.name === requested) ? (requested ?? null) : null;
  const visible = active ? ordered.filter((post) => post.category === active) : ordered;

  const [lead, ...rest] = visible;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${absoluteUrl('/journal')}#collection`,
    name: 'VAYRO Journal',
    description:
      'Material research, construction decisions and route notes from the VAYRO studio.',
    url: absoluteUrl('/journal'),
    inLanguage: SITE.language,
    hasPart: ordered.slice(0, 12).map((post) => ({
      '@type': 'Article',
      headline: post.title,
      url: absoluteUrl(`/journal/${post.slug}`),
      datePublished: post.publishedAt,
      articleSection: post.category,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ---------------------------------------------------------- masthead */}
      <header className="shell section-tight border-b border-[var(--fg)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <p className="t-label text-[var(--fg-subtle)]">Journal</p>
            <RevealText
              as="h1"
              text={['FIELD NOTES.']}
              delay={0.04}
              className="t-display-lg t-balance mt-6"
            />
          </div>
          <div className="col-span-4 lg:col-span-4">
            <Reveal variant="fadeUp" delay={0.12}>
              <p className="t-body-lg t-pretty mt-8 max-w-[38ch] text-[var(--fg-muted)] lg:mt-0">
                Material research, construction decisions and route notes. Written when there is
                something worth writing down.
              </p>
            </Reveal>
          </div>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="shell section">
          <EmptyState
            title="Nothing published yet"
            body="The first field notes are being written. Check back shortly, or take the dispatch below."
          />
        </div>
      ) : (
        <>
          {/* ------------------------------------------------------ the lead */}
          {lead ? (
            <section aria-label="Latest entry" className="shell section-tight">
              <Reveal variant="fadeUp">
                <ArticleCard post={lead} variant="lead" priority eyebrow={lead.category} />
              </Reveal>
            </section>
          ) : null}

          {/* --------------------------------------------------------- index */}
          <section aria-labelledby="all-entries" className="shell section-tight">
            <div className="flex flex-col gap-8 border-t border-[var(--border)] pt-8 lg:flex-row lg:items-center lg:justify-between">
              <h2 id="all-entries" className="t-label text-[var(--fg-subtle)]">
                {active ? active : 'All entries'}
              </h2>
              <CategoryFilter
                categories={categories}
                active={active}
                basePath="/journal"
                total={ordered.length}
                className="lg:max-w-[46rem] lg:justify-end"
              />
            </div>

            {rest.length === 0 ? (
              <EmptyState
                className="mt-4"
                title={active ? 'One entry in this category' : 'One entry so far'}
                body={
                  active
                    ? 'Everything filed under this heading is above. Clear the filter to read the rest.'
                    : 'The archive is young. More is on the way.'
                }
                action={
                  active ? (
                    <Link
                      href="/journal"
                      scroll={false}
                      data-cursor="link"
                      className="t-label border-b border-[var(--fg)] pb-2"
                    >
                      All entries
                    </Link>
                  ) : null
                }
              />
            ) : (
              <Reveal
                variant="stagger"
                as="ul"
                className="mt-14 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-14 md:grid-cols-2 lg:grid-cols-3"
              >
                {rest.map((post) => (
                  <RevealChild as="li" key={post.id} className="h-full">
                    <ArticleCard post={post} />
                  </RevealChild>
                ))}
              </Reveal>
            )}
          </section>
        </>
      )}

      {/* ---------------------------------------------------------- dispatch */}
      <section
        data-surface="inverse"
        aria-labelledby="journal-dispatch"
        className="mt-[var(--section-tight)]"
      >
        <div className="shell section-tight">
          <div className="grid-12 items-end">
            <div className="col-span-4 lg:col-span-6">
              <p className="t-label-sm text-[var(--fg-subtle)]">Dispatch</p>
              <h2 id="journal-dispatch" className="t-display-md t-balance mt-5">
                New notes,
                <br />
                occasionally.
              </h2>
            </div>
            <div className="col-span-4 mt-10 lg:col-span-5 lg:col-start-8 lg:mt-0">
              <NewsletterForm source="journal-index" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
