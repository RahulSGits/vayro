import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCollections, getProducts } from '@/lib/repo/products';
import { cn, pluralise } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'Four ways into the VAYRO system — new arrivals, the carry system, field-tested equipment and limited drops.',
  alternates: { canonical: '/collections' },
  openGraph: {
    title: 'Collections — VAYRO',
    description: 'Four ways into the system.',
    url: '/collections',
    images: [{ url: '/media/field-ascent.jpg', width: 1200, height: 1600, alt: 'VAYRO field' }],
  },
};

export default async function CollectionsPage() {
  const [collections, products] = await Promise.all([getCollections(), getProducts()]);

  const countFor = (slug: string) =>
    products.filter((product) => product.collectionSlugs.includes(slug)).length;

  return (
    <div>
      <header className="shell section-tight border-b border-[var(--border)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-7">
            <p className="t-label text-[var(--fg-subtle)]">Collections</p>
            <h1 className="t-display-md t-balance mt-5">Four ways in</h1>
          </div>
          <div className="col-span-4 lg:col-span-5 lg:pb-2">
            <p className="t-body-lg t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)] lg:mt-0">
              The range is one system. These are the routes through it — by what has just landed, by
              what folds into itself, by what has already been taken somewhere.
            </p>
          </div>
        </div>
      </header>

      {collections.length === 0 ? (
        <div className="shell section">
          <EmptyState
            title="No collections yet"
            body="The catalogue has no published collections. The full range is still browsable."
            action={<ButtonLink href="/shop">Go to the shop</ButtonLink>}
            className="border border-[var(--border)]"
          />
        </div>
      ) : (
        <div className="shell">
          {collections.map((collection, index) => {
            const flipped = index % 2 === 1;
            const count = countFor(collection.slug);
            return (
              <Reveal
                key={collection.id}
                variant="fadeUp"
                as="article"
                className="group section-tight relative isolate border-b border-[var(--border)]"
              >
                <div className="grid-12 items-center gap-y-8">
                  <div
                    className={cn(
                      'col-span-4 lg:col-span-7',
                      flipped ? 'lg:order-2 lg:col-start-6' : 'lg:order-1',
                    )}
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-sunken)]">
                      {collection.heroImage ? (
                        <Image
                          src={collection.heroImage}
                          alt=""
                          fill
                          priority={index === 0}
                          sizes="(min-width: 1024px) 58vw, 100vw"
                          className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-out)] group-hover:scale-[1.04]"
                        />
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={cn(
                      'col-span-4 lg:col-span-4',
                      flipped ? 'lg:order-1 lg:col-start-1' : 'lg:order-2 lg:col-start-9',
                    )}
                  >
                    <p className="t-spec text-[var(--fg-subtle)]">
                      {String(index + 1).padStart(2, '0')} — {pluralise(count, 'piece')}
                    </p>
                    <h2 className="t-h1 mt-4">
                      {/* One link for the whole row — the pseudo-element covers it. */}
                      <Link
                        href={`/collections/${collection.slug}`}
                        data-cursor="link"
                        className="transition-colors duration-[var(--d-fast)] before:absolute before:inset-0 before:content-[''] hover:text-[var(--fg-muted)]"
                      >
                        {collection.name}
                      </Link>
                    </h2>
                    {collection.tagline ? (
                      <p className="t-body-lg mt-3 text-[var(--fg)]">{collection.tagline}</p>
                    ) : null}
                    {collection.description ? (
                      <p className="t-pretty mt-4 max-w-[var(--max-text)] text-[var(--fg-muted)]">
                        {collection.description}
                      </p>
                    ) : null}
                    <span
                      aria-hidden
                      className="t-label mt-8 inline-flex items-center gap-3 border-b border-[var(--fg)] pb-2 transition-opacity duration-[var(--d-fast)] group-hover:opacity-70"
                    >
                      View collection
                      <ArrowRight size={14} strokeWidth={1.25} />
                    </span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}

      <section className="shell section">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <h2 className="t-h1 t-balance">Or take the whole range at once.</h2>
          </div>
          <div className="col-span-4 lg:col-span-4 lg:justify-self-end">
            <ButtonLink href="/shop" size="lg" className="mt-6 lg:mt-0">
              Shop everything
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
