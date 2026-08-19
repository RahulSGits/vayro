import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getJournalPost, getJournalPosts } from '@/lib/repo/products';
import { journalPosts as seedJournal } from '@/data/catalog';
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, buildMetadata, jsonLdScript } from '@/lib/seo';
import { formatDate } from '@/lib/utils';
import type { JournalPost } from '@/types';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { ArticleBody, ArticleCard, ShareRow, pullQuoteFrom, type ArticleFigure } from '@/components/journal';

/* ==========================================================================
   /journal/[slug] — the article.

   One measured column, one plate inside it, one lift-out quote. The reading
   furniture (author, date, reading time, share, what to read next) brackets
   the text rather than interrupting it.
   ========================================================================== */

type Params = Promise<{ slug: string }>;

/**
 * From the seed catalogue: the read model is request-scoped and cannot be
 * consulted at build time. Entries published later render on demand.
 */
export function generateStaticParams() {
  return seedJournal.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getJournalPost(slug);
  if (!post) return { title: 'Entry not found', robots: { index: false, follow: false } };

  return buildMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/journal/${post.slug}`,
    image: post.heroImage,
    imageAlt: post.title,
    imageSize: { width: 1600, height: 900 },
    type: 'article',
    publishedTime: post.publishedAt,
    authors: [post.author],
    section: post.category,
    keywords: [post.category, 'VAYRO journal'],
  });
}

/* ------------------------------------------------------------- in-article -- */

/**
 * The mid-article plate. Entries carry one hero image, so the second plate is
 * chosen by subject rather than invented per post — and never repeats the
 * hero, which would read as a loading bug.
 */
const FIGURES: Record<string, ArticleFigure> = {
  'Product Innovation': {
    src: '/media/field-transit.webp',
    alt: 'The Meridian Carry Shell packed into its hood and carried through transit',
    caption: 'Packed state — the shell compressed into the hood cavity, carried on the webbing.',
  },
  'Material Science': {
    src: '/media/material-shell.webp',
    alt: 'Shell fabric photographed at magnification',
    caption: 'Shell fabric at magnification. The reinforcing grid is the part the denier figure implies.',
  },
  Travel: {
    src: '/media/field-transit.webp',
    alt: 'A traveller crossing a terminal with the shell packed',
    caption: 'Transit — the half of the day most outerwear is not designed for.',
  },
  'Outdoor Culture': {
    src: '/media/field-treeline.webp',
    alt: 'The treeline at the edge of a climb in flat light',
    caption: 'Treeline, shoulder season. One shell, one mid, nothing else carried.',
  },
};

const FALLBACK_FIGURE: ArticleFigure = {
  src: '/media/field-ridgeline.webp',
  alt: 'A ridgeline under moving cloud',
  caption: 'Field conditions the catalogue is written for.',
};

function figureFor(post: JournalPost): ArticleFigure {
  const chosen = FIGURES[post.category] ?? FALLBACK_FIGURE;
  if (chosen.src !== post.heroImage) return chosen;
  return chosen.src === FALLBACK_FIGURE.src
    ? FIGURES['Product Innovation']
    : FALLBACK_FIGURE;
}

/* -------------------------------------------------------------------- page -- */

export default async function JournalEntryPage({ params }: { params: Params }) {
  const { slug } = await params;

  const [post, all] = await Promise.all([getJournalPost(slug), getJournalPosts()]);
  if (!post) notFound();

  const ordered = [...all].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const index = ordered.findIndex((entry) => entry.id === post.id);

  // Newest first, so the entry *before* this one in reading order is the newer.
  const newer = index > 0 ? ordered[index - 1] : null;
  const older = index >= 0 && index < ordered.length - 1 ? ordered[index + 1] : null;

  const related = ordered
    .filter((entry) => entry.id !== post.id && entry.category === post.category)
    .concat(ordered.filter((entry) => entry.id !== post.id && entry.category !== post.category))
    .slice(0, 3);

  const url = absoluteUrl(`/journal/${post.slug}`);
  const figure = figureFor(post);
  const pullQuote = pullQuoteFrom(post.body);

  return (
    <article className="pb-[var(--section-tight)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            articleJsonLd(post),
            breadcrumbJsonLd([
              { name: 'Home', path: '/' },
              { name: 'Journal', path: '/journal' },
              { name: post.title, path: `/journal/${post.slug}` },
            ]),
          ]),
        }}
      />

      {/* ------------------------------------------------------- breadcrumb */}
      <nav aria-label="Breadcrumb" className="shell pt-6 pb-8">
        <ol className="t-caption flex flex-wrap items-center gap-2 text-[var(--fg-subtle)]">
          <li>
            <Link href="/" data-cursor="link" className="hover:text-[var(--fg)]">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/journal" data-cursor="link" className="hover:text-[var(--fg)]">
              Journal
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="text-[var(--fg)]">
            {post.title}
          </li>
        </ol>
      </nav>

      {/* ----------------------------------------------------------- header */}
      <header className="shell">
        <div className="grid-12">
          <div className="col-span-4 lg:col-span-9">
            <p className="t-label text-[var(--fg-subtle)]">{post.category}</p>
            <h1 className="t-display-md t-balance mt-6 max-w-[18ch]">{post.title}</h1>
            <p className="t-body-lg t-pretty mt-7 max-w-[var(--max-text)] text-[var(--fg-muted)]">
              {post.excerpt}
            </p>
          </div>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-6 border-y border-[var(--border)] py-6 sm:grid-cols-4">
          <div>
            <dt className="t-label-sm text-[var(--fg-subtle)]">Written by</dt>
            <dd className="t-spec mt-2 text-[var(--fg)]">{post.author}</dd>
          </div>
          <div>
            <dt className="t-label-sm text-[var(--fg-subtle)]">Published</dt>
            <dd className="t-spec mt-2 text-[var(--fg)]">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
            </dd>
          </div>
          <div>
            <dt className="t-label-sm text-[var(--fg-subtle)]">Reading time</dt>
            <dd className="t-spec mt-2 text-[var(--fg)]">{post.readingMinutes} min</dd>
          </div>
          <div>
            <dt className="t-label-sm text-[var(--fg-subtle)]">Filed under</dt>
            <dd className="t-spec mt-2 text-[var(--fg)]">
              <Link
                href={`/journal?category=${encodeURIComponent(post.category)}`}
                data-cursor="link"
                className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
              >
                {post.category}
              </Link>
            </dd>
          </div>
        </dl>
      </header>

      {/* ------------------------------------------------------------ plate */}
      {post.heroImage ? (
        <Reveal variant="imageReveal" className="shell mt-12 overflow-hidden">
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--bg-sunken)]">
            <Image
              src={post.heroImage}
              alt={post.title}
              fill
              priority
              sizes="(min-width: 1536px) 88rem, 100vw"
              className="object-cover"
            />
          </div>
        </Reveal>
      ) : null}

      {/* ------------------------------------------------------------- body */}
      <div className="shell mt-16 md:mt-20">
        <div className="grid-12">
          <div className="col-span-4 lg:col-span-8 lg:col-start-3">
            <ArticleBody body={post.body} figure={figure} pullQuote={pullQuote} />

            <div className="mx-auto mt-16 w-full max-w-[var(--max-text)] border-t border-[var(--border)] pt-8">
              <ShareRow title={post.title} url={url} excerpt={post.excerpt} />
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- prev/next */}
      {newer || older ? (
        <nav
          aria-label="More entries"
          className="shell section-tight mt-[var(--section-tight)] border-t border-[var(--fg)]"
        >
          <div className="grid grid-cols-1 gap-px bg-[var(--border)] md:grid-cols-2">
            {older ? (
              <Link
                href={`/journal/${older.slug}`}
                data-cursor="link"
                className="group flex flex-col gap-3 bg-[var(--bg)] py-10 md:pr-10"
              >
                <span className="t-label-sm flex items-center gap-3 text-[var(--fg-subtle)]">
                  <ArrowLeft
                    size={13}
                    strokeWidth={1.25}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    aria-hidden
                    className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:-translate-x-1"
                  />
                  Previous
                </span>
                <span className="t-h3 t-balance max-w-[26ch]">{older.title}</span>
              </Link>
            ) : (
              <span aria-hidden className="hidden bg-[var(--bg)] md:block" />
            )}

            {newer ? (
              <Link
                href={`/journal/${newer.slug}`}
                data-cursor="link"
                className="group flex flex-col items-start gap-3 bg-[var(--bg)] py-10 md:items-end md:pl-10 md:text-right"
              >
                <span className="t-label-sm flex items-center gap-3 text-[var(--fg-subtle)]">
                  Next
                  <ArrowRight
                    size={13}
                    strokeWidth={1.25}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    aria-hidden
                    className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
                  />
                </span>
                <span className="t-h3 t-balance max-w-[26ch]">{newer.title}</span>
              </Link>
            ) : (
              <span aria-hidden className="hidden bg-[var(--bg)] md:block" />
            )}
          </div>
        </nav>
      ) : null}

      {/* ---------------------------------------------------------- related */}
      {related.length > 0 ? (
        <section aria-labelledby="related-entries" className="shell section-tight">
          <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--border)] pb-6">
            <h2 id="related-entries" className="t-h1 t-balance">
              Read next.
            </h2>
            <ButtonLink href="/journal" variant="secondary" size="md" data-cursor="link">
              All entries
            </ButtonLink>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-12 md:grid-cols-3">
            {related.map((entry) => (
              <li key={entry.id} className="h-full">
                <ArticleCard post={entry} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
