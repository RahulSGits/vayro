import { Star } from 'lucide-react';
import { cn, formatDate, pluralise } from '@/lib/utils';
import type { Review } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';

/* ==========================================================================
   ProductReviews.

   Demo entries are labelled as demo, excluded from any average, and never
   counted. An unreviewed product says so rather than inventing social proof.
   ========================================================================== */

export function ProductReviews({ reviews, className }: { reviews: Review[]; className?: string }) {
  const real = reviews.filter((review) => !review.isDemo);
  const demo = reviews.filter((review) => review.isDemo);
  const average = real.length
    ? real.reduce((sum, review) => sum + review.rating, 0) / real.length
    : null;

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--fg)] pb-5">
        <h2 className="t-h1">Reviews</h2>
        {average !== null ? (
          <div className="flex items-center gap-3">
            <Stars rating={Math.round(average)} />
            <p className="t-spec text-[var(--fg-muted)]">
              {average.toFixed(1)} · {pluralise(real.length, 'review')}
            </p>
          </div>
        ) : null}
      </div>

      {real.length === 0 && demo.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          body="This piece has not been reviewed. Reviews open once orders have shipped."
          className="py-16"
        />
      ) : null}

      {real.length > 0 ? (
        <ul className="mt-2">
          {real.map((review) => (
            <ReviewRow key={review.id} review={review} />
          ))}
        </ul>
      ) : null}

      {demo.length > 0 ? (
        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-3 border border-[var(--border-strong)] px-4 py-3">
            <Badge tone="warning">Demo data</Badge>
            <p className="t-body-sm text-[var(--fg-muted)]">
              The entries below ship with the sample dataset so the layout can be assessed. They are
              not customer reviews and are excluded from any rating.
            </p>
          </div>
          <ul className="mt-2" aria-label="Demo review samples">
            {demo.map((review) => (
              <ReviewRow key={review.id} review={review} demo />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ReviewRow({ review, demo = false }: { review: Review; demo?: boolean }) {
  return (
    <li className="border-b border-[var(--border)] py-7">
      <div className="grid gap-4 md:grid-cols-12 md:gap-[var(--gutter)]">
        <div className="md:col-span-3">
          <p className="t-label">{review.authorName}</p>
          <p className="t-caption mt-1 text-[var(--fg-subtle)]">{formatDate(review.createdAt)}</p>
          {review.verifiedPurchase ? (
            <p className="t-caption mt-2 text-[var(--positive)]">Verified purchase</p>
          ) : null}
          {demo ? <p className="t-caption mt-2 text-[var(--warning)]">Sample entry</p> : null}
        </div>
        <div className="md:col-span-9">
          <Stars rating={review.rating} />
          {review.title ? <h3 className="t-h3 mt-3">{review.title}</h3> : null}
          <p className="t-pretty mt-2 max-w-[var(--max-text)] text-[var(--fg-muted)]">{review.body}</p>
        </div>
      </div>
    </li>
  );
}

function Stars({ rating, className }: { rating: number; className?: string }) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <p className={cn('flex items-center gap-1', className)}>
      <span className="sr-only">{value} out of 5</span>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          size={13}
          strokeWidth={1.25}
          aria-hidden
          className={index < value ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]'}
          fill={index < value ? 'currentColor' : 'none'}
        />
      ))}
    </p>
  );
}
