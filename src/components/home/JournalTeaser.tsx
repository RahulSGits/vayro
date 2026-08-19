import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { JournalPost } from '@/types';
import { SectionHead } from '@/components/home/SectionHead';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealChild } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/States';
import { formatDate, pluralise } from '@/lib/utils';

/* ==========================================================================
   JournalTeaser — the three most recent entries.
   ========================================================================== */

export function JournalTeaser({ posts }: { posts: JournalPost[] }) {
  return (
    <section aria-label="Journal" className="shell section">
      <SectionHead
        index="07"
        label="Journal"
        title={['FIELD NOTES.']}
        lead="Material research, route notes and the reasoning behind the equipment."
        action={
          <ButtonLink href="/journal" variant="secondary" size="lg" data-cursor="link">
            All entries
          </ButtonLink>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          className="mt-12 border-t border-[var(--border)]"
          title="Nothing published yet"
          body="The first field notes are being written. Check back shortly."
        />
      ) : (
        <Reveal
          variant="stagger"
          as="ul"
          className="mt-14 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-12 md:grid-cols-3 md:mt-20"
        >
          {posts.map((post) => (
            <RevealChild as="li" key={post.id}>
              <article>
                <Link href={`/journal/${post.slug}`} data-cursor="link" className="group block">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-sunken)]">
                    {post.heroImage ? (
                      <Image
                        src={post.heroImage}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 30vw, 100vw"
                        className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-fold)] group-hover:scale-[1.04]"
                      />
                    ) : null}
                  </div>

                  <p className="t-label-sm mt-5 text-[var(--fg-subtle)]">{post.category}</p>

                  <h3 className="t-h3 t-balance mt-3">
                    <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 transition-[background-size] duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:bg-[length:100%_1px]">
                      {post.title}
                    </span>
                  </h3>

                  <p className="t-body-sm t-pretty mt-3 max-w-[42ch] text-[var(--fg-muted)]">
                    {post.excerpt}
                  </p>

                  <p className="t-spec mt-5 flex items-center gap-3 text-[var(--fg-subtle)]">
                    <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
                    <span aria-hidden className="block h-px w-4 bg-[var(--border-strong)]" />
                    <span>{pluralise(post.readingMinutes, 'min read', 'min read')}</span>
                    <ArrowRight
                      size={13}
                      strokeWidth={1.25}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      aria-hidden
                      className="ml-auto transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
                    />
                  </p>
                </Link>
              </article>
            </RevealChild>
          ))}
        </Reveal>
      )}
    </section>
  );
}
