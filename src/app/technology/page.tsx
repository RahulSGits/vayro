import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getHeroProduct, getProducts } from '@/lib/repo/products';
import { cn, formatPrice } from '@/lib/utils';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { ContourField } from '@/components/brand';
import { HotspotFigure } from '@/components/product/HotspotFigure';
import { specValue } from '@/components/product/product-utils';
import type { Product } from '@/types';

export const metadata: Metadata = {
  title: 'Technology',
  description:
    'How the VAYRO carry system works — the collar inverts, the shell compresses into the hood cavity, and the internal webbing becomes the strap. Materials, construction and measured specifications.',
  alternates: { canonical: '/technology' },
  openGraph: {
    title: 'Technology — VAYRO',
    description: 'One layer. Every destination. How the carry system works.',
    url: '/technology',
    images: [{ url: '/media/field-transit.jpg', width: 1600, height: 900, alt: 'VAYRO in transit' }],
  },
};

/** The four states of the carry system, in the order they happen. */
const TRANSFORMATION = [
  {
    title: 'Worn',
    body: 'An articulated outer layer. Pre-shaped elbow, gusseted underarm, hem cut to clear a hip belt. Nothing about it announces the second function.',
  },
  {
    title: 'Inverted',
    body: 'The collar folds back on itself and the hood lining — oversized on purpose — opens as a cavity. This is the only step that needs both hands.',
  },
  {
    title: 'Compressed',
    body: 'The shell feeds into the cavity and the zip closes around it. No stuff sack, because a stuff sack is a thing you lose.',
  },
  {
    title: 'Carried',
    body: 'The internal webbing, bar-tacked to the yoke rather than the shell, takes the load. Handle in one configuration, shoulder strap in the other.',
  },
] as const;

export default async function TechnologyPage() {
  const [hero, products] = await Promise.all([getHeroProduct(), getProducts()]);

  const flat = hero.images.find((image) => image.kind === 'technical') ?? hero.images[0];
  const macros = materialMacros(products);
  const comparison = products.filter((product) => product.status === 'published').slice(0, 4);

  return (
    <div>
      {/* ------------------------------------------------------------ hero */}
      <header data-surface="inverse" className="relative isolate overflow-hidden">
        <Image
          src="/media/field-transit.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ink)_36%,transparent)_0%,color-mix(in_oklab,var(--ink)_82%,transparent)_100%)]"
        />
        <ContourField opacity={0.08} scale={160} className="-z-10 text-[var(--fg)]" />

        <div className="shell flex min-h-[76vh] flex-col justify-end pt-[calc(var(--header-h)+5rem)] pb-20">
          <p className="t-label text-[var(--fg-subtle)]">Technology</p>
          <h1 className="t-display-lg t-balance mt-6 max-w-[16ch]">
            The layer that carries itself.
          </h1>
          <div className="grid-12 mt-10">
            <p className="t-body-lg t-pretty col-span-4 max-w-[var(--max-text)] text-[var(--fg-muted)] lg:col-span-5">
              A jacket is carried more often than it is worn. The carry system starts from that
              fact and works backwards — which is why the hood is oversized, the webbing is anchored
              to the yoke, and the collar inverts.
            </p>
          </div>
        </div>
      </header>

      {/* -------------------------------------------------- transformation */}
      <section className="shell section" aria-labelledby="transformation-heading">
        <div className="grid-12 items-end border-b border-[var(--fg)] pb-6">
          <div className="col-span-4 lg:col-span-8">
            <p className="t-label text-[var(--fg-subtle)]">01 — The transformation</p>
            <h2 id="transformation-heading" className="t-h1 t-balance mt-4">
              Four states, one garment.
            </h2>
          </div>
          <div className="col-span-4 lg:col-span-4">
            <p className="t-spec mt-4 text-[var(--fg-subtle)] lg:mt-0 lg:text-right">
              {specValue(hero, 'Packed volume') ?? '—'} packed
            </p>
          </div>
        </div>

        <div className="grid-12 mt-14 items-start">
          <Reveal variant="fadeUp" className="col-span-4 lg:col-span-5">
            <ol>
              {TRANSFORMATION.map((step, index) => (
                <li key={step.title} className="border-b border-[var(--border)] py-7 first:pt-0">
                  <div className="flex items-baseline gap-5">
                    <span className="t-spec shrink-0 text-[var(--fg-subtle)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="t-h2">{step.title}</h3>
                      <p className="t-pretty mt-3 max-w-[var(--max-text)] text-[var(--fg-muted)]">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal
            variant="imageReveal"
            className="col-span-4 mt-10 lg:col-span-6 lg:col-start-7 lg:mt-0 lg:sticky lg:top-[calc(var(--header-h)+2rem)]"
          >
            <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--bg-sunken)]">
              <Image
                src="/media/field-ascent.webp"
                alt="The Meridian Carry Shell worn on a ridgeline"
                fill
                sizes="(min-width: 1024px) 48vw, 100vw"
                className="object-cover"
              />
            </div>
            <p className="t-caption mt-3 text-[var(--fg-subtle)]">
              Worn state — {hero.name}, {specValue(hero, 'Weight (size M)') ?? 'weight in the spec table'}.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- hotspots */}
      {hero.hotspots.length > 0 && flat ? (
        <section data-surface="inverse" className="section" aria-labelledby="detail-heading">
          <div className="shell">
            <div className="grid-12 items-end border-b border-[var(--border)] pb-6">
              <div className="col-span-4 lg:col-span-8">
                <p className="t-label text-[var(--fg-subtle)]">02 — Construction</p>
                <h2 id="detail-heading" className="t-h1 t-balance mt-4">
                  Where the engineering actually is.
                </h2>
              </div>
              <div className="col-span-4 lg:col-span-4">
                <p className="t-body-sm t-pretty mt-4 text-[var(--fg-muted)] lg:mt-0">
                  Five decisions that make the second state possible. Select a marker to read each
                  one.
                </p>
              </div>
            </div>

            <HotspotFigure
              image={{ url: flat.url, alt: flat.alt }}
              hotspots={hero.hotspots}
              className="mt-14"
            />
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- materials */}
      {macros.length > 0 ? (
        <section className="shell section" aria-labelledby="materials-heading">
          <div className="grid-12 items-end border-b border-[var(--fg)] pb-6">
            <div className="col-span-4 lg:col-span-8">
              <p className="t-label text-[var(--fg-subtle)]">03 — Materials</p>
              <h2 id="materials-heading" className="t-h1 t-balance mt-4">
                Fabric, at magnification.
              </h2>
            </div>
            <div className="col-span-4 lg:col-span-4">
              <p className="t-body-sm t-pretty mt-4 text-[var(--fg-muted)] lg:mt-0">
                Denier is the most quoted number in technical apparel and the most misread. Weave
                density and finish do more of the work.
              </p>
            </div>
          </div>

          <ul className="mt-14 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-4">
            {macros.map((macro, index) => (
              <li key={macro.id} className={cn(index % 2 === 1 && 'lg:mt-16')}>
                <Reveal variant="fadeUp" delay={(index % 4) * 0.06}>
                  <div className="relative aspect-square w-full overflow-hidden bg-[var(--bg-sunken)]">
                    <Image
                      src={macro.image}
                      alt={macro.alt}
                      fill
                      sizes="(min-width: 1024px) 22vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                  <h3 className="t-label mt-5 border-t border-[var(--border)] pt-4">
                    {macro.productName}
                  </h3>
                  <p className="t-spec mt-2 text-[var(--fg-muted)]">{macro.spec}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------ comparison */}
      <section className="shell section-tight" aria-labelledby="comparison-heading">
        <div className="border-b border-[var(--fg)] pb-6">
          <p className="t-label text-[var(--fg-subtle)]">04 — Measured</p>
          <h2 id="comparison-heading" className="t-h1 t-balance mt-4">
            The numbers, side by side.
          </h2>
        </div>

        <div className="-mx-[var(--gutter)] mt-10 overflow-x-auto px-[var(--gutter)]">
          <table className="w-full min-w-[44rem] border-collapse">
            <caption className="sr-only">
              Weight, packed volume, shell fabric and price across the VAYRO range
            </caption>
            <thead>
              <tr className="border-b border-[var(--border-strong)]">
                <th scope="col" className="t-label-sm py-4 pr-6 text-left text-[var(--fg-subtle)]">
                  Piece
                </th>
                <th scope="col" className="t-label-sm py-4 pr-6 text-left text-[var(--fg-subtle)]">
                  Weight
                </th>
                <th scope="col" className="t-label-sm py-4 pr-6 text-left text-[var(--fg-subtle)]">
                  Packed
                </th>
                <th scope="col" className="t-label-sm py-4 pr-6 text-left text-[var(--fg-subtle)]">
                  Shell
                </th>
                <th scope="col" className="t-label-sm py-4 text-right text-[var(--fg-subtle)]">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((product) => (
                <tr key={product.id} className="border-b border-[var(--border)]">
                  <th scope="row" className="py-5 pr-6 text-left">
                    <Link
                      href={`/product/${product.slug}`}
                      data-cursor="link"
                      className="t-h3 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg-muted)]"
                    >
                      {product.name}
                    </Link>
                  </th>
                  <td className="t-spec py-5 pr-6 text-[var(--fg-muted)]">
                    {specValue(product, 'Weight (size M)') ?? specValue(product, 'Weight') ?? '—'}
                  </td>
                  <td className="t-spec py-5 pr-6 text-[var(--fg-muted)]">
                    {specValue(product, 'Packed volume') ??
                      specValue(product, 'Folded') ??
                      specValue(product, 'Volume') ??
                      '—'}
                  </td>
                  <td className="t-spec py-5 pr-6 text-[var(--fg-muted)]">
                    {specValue(product, 'Shell') ?? specValue(product, 'Face') ?? '—'}
                  </td>
                  <td className="t-spec py-5 text-right">
                    {formatPrice(product.price, product.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="t-caption mt-5 text-[var(--fg-subtle)]">
          Figures are taken from the specification tables on each product page. Where a piece does
          not publish a measurement, the cell is left empty rather than estimated.
        </p>
      </section>

      {/* -------------------------------------------------------- honesty */}
      <section className="shell section-tight" aria-labelledby="claims-heading">
        <div className="grid-12 items-start">
          <div className="col-span-4 lg:col-span-4">
            <h2 id="claims-heading" className="t-h1 t-balance">
              What we do not claim.
            </h2>
          </div>
          <div className="col-span-4 lg:col-span-7 lg:col-start-6">
            <p className="t-body-lg t-pretty text-[var(--fg-muted)]">
              {specValue(hero, 'Water resistance') ??
                'The shell carries a PFC-free DWR finish and taped seams.'}{' '}
              The front zip is not a waterproof zip, and a garment is only as waterproof as its
              least waterproof opening. We call it weather resistant because that is the accurate
              description — it handles wind and passing rain, and it is not what you want in
              sustained heavy rainfall.
            </p>
            <p className="t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)]">
              Overclaiming is easy and it costs you the second purchase.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section data-surface="inverse" className="relative isolate overflow-hidden">
        <ContourField opacity={0.07} scale={140} className="text-[var(--fg)]" />
        <div className="shell section">
          <div className="grid-12 items-end">
            <div className="col-span-4 lg:col-span-7">
              <p className="t-label text-[var(--fg-subtle)]">{hero.subtitle ?? 'The carry system'}</p>
              <h2 className="t-display-md t-balance mt-5">{hero.name}</h2>
              <p className="t-body-lg t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)]">
                {hero.description}
              </p>
            </div>

            <div className="col-span-4 mt-10 lg:col-span-4 lg:col-start-9 lg:mt-0">
              <p className="t-price-lg">{formatPrice(hero.price, hero.currency)}</p>
              <div className="mt-6 flex flex-col gap-3">
                <ButtonLink href={`/product/${hero.slug}`} size="lg" block>
                  View the {hero.name}
                </ButtonLink>
                <ButtonLink href="/shop" variant="secondary" size="lg" block>
                  Shop the range
                </ButtonLink>
              </div>
              <Link
                href="/collections/the-carry-system"
                data-cursor="link"
                className="t-label mt-8 inline-flex items-center gap-3 border-b border-[var(--fg)] pb-2 transition-opacity duration-[var(--d-fast)] hover:opacity-70"
              >
                The Carry System collection
                <ArrowRight size={14} strokeWidth={1.25} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- helpers -- */

type Macro = { id: string; image: string; alt: string; productName: string; spec: string };

/**
 * Pairs each product's macro plate with the material it actually documents.
 * Nothing is captioned that the catalogue does not state.
 */
function materialMacros(products: Product[]): Macro[] {
  return products
    .map((product) => {
      const image = product.images.find((entry) => entry.kind === 'detail');
      const spec =
        product.specs.find((entry) => entry.group === 'materials' && entry.label === 'Shell') ??
        product.specs.find((entry) => entry.group === 'materials');
      if (!image || !spec) return null;
      return {
        id: `${product.id}-${image.id}`,
        image: image.url,
        alt: image.alt,
        productName: product.name,
        spec: `${spec.label} — ${spec.value}`,
      } satisfies Macro;
    })
    .filter((macro): macro is Macro => macro !== null);
}
