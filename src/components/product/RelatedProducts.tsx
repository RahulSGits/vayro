import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';

/* ==========================================================================
   RelatedProducts — the closing row of a PDP or collection page.
   ========================================================================== */

type Props = {
  products: Product[];
  title?: string;
  /** Optional link out to a wider view. */
  href?: string;
  hrefLabel?: string;
  className?: string;
};

export function RelatedProducts({
  products,
  title = 'You may also like',
  href,
  hrefLabel = 'View all',
  className,
}: Props) {
  if (products.length === 0) return null;

  return (
    <section className={cn('', className)} aria-labelledby="related-heading">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--fg)] pb-5">
        <h2 id="related-heading" className="t-h1">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            data-cursor="link"
            className="t-label text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-[6px] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            {hrefLabel}
          </Link>
        ) : null}
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-3">
        {products.map((product) => (
          <li key={product.id} className={products.length === 3 ? '' : 'lg:col-span-1'}>
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </section>
  );
}
