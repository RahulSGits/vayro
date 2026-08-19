import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { JournalPost } from '@/types';
import { cn, formatDate } from '@/lib/utils';

/* ==========================================================================
   ArticleCard — one journal entry, at three scales.

   'lead'    the index's opening article: plate on one side, argument opposite.
   'default' the grid unit.
   'compact' a text-only row, for rails where a plate would be noise.

   One tab stop per card: the title carries the link and its pseudo-element
   covers the tile, so the plate is not a second stop to the same destination.
   ========================================================================== */

export type ArticleCardVariant = 'lead' | 'default' | 'compact';

export type ArticleCardProps = {
  post: JournalPost;
  variant?: ArticleCardVariant;
  /** Set on the entry above the fold so its plate is not lazy-loaded. */
  priority?: boolean;
  /** Overrides the eyebrow — 'Previous', 'Next', 'Related'. Defaults to the category. */
  eyebrow?: string;
  className?: string;
};

/** Shared underline-on-hover treatment for the title. */
const TITLE_SWEEP =
  'bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_100%] bg-no-repeat pb-0.5 ' +
  'transition-[background-size] duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:bg-[length:100%_1px]';

function Meta({ post, className }: { post: JournalPost; className?: string }) {
  return (
    <p className={cn('t-spec flex items-center gap-3 text-[var(--fg-subtle)]', className)}>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden className="block h-px w-4 bg-[var(--border-strong)]" />
      <span>{post.readingMinutes} min read</span>
    </p>
  );
}

export function ArticleCard({
  post,
  variant = 'default',
  priority = false,
  eyebrow,
  className,
}: ArticleCardProps) {
  const href = `/journal/${post.slug}`;
  const label = eyebrow ?? post.category;

  if (variant === 'compact') {
    return (
      <article className={cn('group relative', className)}>
        <p className="t-label-sm text-[var(--fg-subtle)]">{label}</p>
        <h3 className="t-h3 t-balance mt-3">
          <Link
            href={href}
            data-cursor="link"
            className="before:absolute before:inset-0 before:content-['']"
          >
            <span className={TITLE_SWEEP}>{post.title}</span>
          </Link>
        </h3>
        <Meta post={post} className="mt-4" />
      </article>
    );
  }

  if (variant === 'lead') {
    return (
      <article className={cn('group grid-12 relative items-center gap-y-8', className)}>
        {/* The title link's pseudo-element covers the whole article, so the
            plate is clickable without becoming a second tab stop. */}
        <div className="col-span-4 lg:col-span-7">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-sunken)]">
            {post.heroImage ? (
              <Image
                src={post.heroImage}
                alt=""
                fill
                priority={priority}
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-fold)] group-hover:scale-[1.03]"
              />
            ) : null}
          </div>
        </div>

        <div className="col-span-4 lg:col-span-5 lg:pl-[var(--gutter)]">
          <p className="t-label text-[var(--fg-subtle)]">{label}</p>

          <h2 className="t-display-md t-balance mt-5">
            <Link
              href={href}
              data-cursor="link"
              className="before:absolute before:inset-0 before:content-['']"
            >
              <span className={TITLE_SWEEP}>{post.title}</span>
            </Link>
          </h2>

          <p className="t-body-lg t-pretty mt-6 max-w-[42ch] text-[var(--fg-muted)]">
            {post.excerpt}
          </p>

          <div className="mt-8 flex items-center gap-5 border-t border-[var(--border)] pt-5">
            <Meta post={post} />
            <ArrowRight
              size={15}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
              className="ml-auto text-[var(--fg-subtle)] transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
            />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={cn('group relative flex h-full flex-col', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-sunken)]">
        {post.heroImage ? (
          <Image
            src={post.heroImage}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 100vw"
            className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-fold)] group-hover:scale-[1.04]"
          />
        ) : null}
      </div>

      <p className="t-label-sm mt-5 text-[var(--fg-subtle)]">{label}</p>

      <h3 className="t-h3 t-balance mt-3">
        <Link
          href={href}
          data-cursor="link"
          className="before:absolute before:inset-0 before:content-['']"
        >
          <span className={TITLE_SWEEP}>{post.title}</span>
        </Link>
      </h3>

      <p className="t-body-sm t-pretty mt-3 max-w-[42ch] text-[var(--fg-muted)]">{post.excerpt}</p>

      <Meta post={post} className="mt-auto pt-5" />
    </article>
  );
}
