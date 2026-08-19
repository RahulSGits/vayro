import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getHeroProduct, getProducts } from '@/lib/repo/products';
import { buildMetadata, absoluteUrl, SITE } from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import { specValue } from '@/components/product/product-utils';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealText } from '@/components/ui/Reveal';
import { ContourField } from '@/components/brand';
import type { Product } from '@/types';
import { StoryChapter } from './_components/StoryChapter';
import { ParallaxPlate } from './_components/ParallaxPlate';
import { PinnedStatement } from './_components/PinnedStatement';
import { StatBand, type Stat } from './_components/StatBand';

/* ==========================================================================
   /story — how VAYRO got here.

   The page is a single argument told in eight moves: the problem, the two
   industries that half-solve it, the question neither would answer, the
   garment that answers it, what it is made of, who makes it, and what is next.

   Every number on this page is lifted from a product's own specification
   table. Nothing is estimated for effect.
   ========================================================================== */

export const metadata: Metadata = buildMetadata({
  title: 'Story',
  description:
    'Performance clothing works and looks like equipment. Fashion looks right and travels badly. VAYRO exists to make one thing that does both — and the Meridian Carry Shell is the answer.',
  path: '/story',
  image: '/media/field-ridgeline.jpg',
  imageAlt: 'A ridgeline under moving cloud',
  imageSize: { width: 1600, height: 900 },
  keywords: ['VAYRO story', 'packable jacket', 'travel outerwear', 'design philosophy'],
});

/* ----------------------------------------------------------- the figures -- */

/**
 * Pulls the band's figures out of the catalogue. Two of them are embedded in
 * longer spec strings — the shell's denier and the wind figure — so they are
 * extracted rather than re-typed, and a spec that stops publishing a number
 * simply drops out of the band instead of going stale.
 */
function buildStats(product: Product): Stat[] {
  const weight = specValue(product, 'Weight (size M)');
  const volume = specValue(product, 'Packed volume');
  const packedSize = specValue(product, 'Packed size');
  const shell = specValue(product, 'Shell');
  const wind = specValue(product, 'Wind resistance');

  const denier = shell?.match(/\b(\d+D)\b/)?.[1] ?? null;
  const windSpeed = wind?.match(/(\d+\s*km\/h)/)?.[1] ?? null;

  const stats: (Stat | null)[] = [
    weight ? { figure: weight, label: 'Worn weight', note: 'Size M, as it leaves the studio.' } : null,
    volume ? { figure: volume, label: 'Packed volume', note: 'Folded into its own hood cavity.' } : null,
    denier ? { figure: denier, label: 'Shell yarn', note: 'Recycled ripstop nylon, 42 gsm.' } : null,
    packedSize
      ? {
          figure: packedSize,
          label: 'Packed size',
          note: 'No stuff sack. The garment is the sack.',
          wide: true,
        }
      : null,
    windSpeed ? { figure: windSpeed, label: 'Wind tested', note: 'Sustained, at the seam.' } : null,
  ];

  return stats.filter((stat): stat is Stat => stat !== null);
}

/**
 * Written out rather than set as a digit — the sentence is prose, not a spec,
 * and a numeral in the middle of it reads as a placeholder.
 */
const COUNT_WORDS = ['No pieces', 'One piece', 'Two pieces', 'Three pieces', 'Four pieces',
  'Five pieces', 'Six pieces', 'Seven pieces', 'Eight pieces', 'Nine pieces', 'Ten pieces'];

function spellCount(n: number): string {
  return COUNT_WORDS[n] ?? `${n} pieces`;
}

/** The macro plates set opposite the materials chapter. */
const MACROS = [
  { src: '/media/material-ripstop.webp', alt: 'Ripstop shell fabric at magnification', caption: '20D ripstop' },
  { src: '/media/material-shell.webp', alt: 'Shell face fabric at magnification', caption: 'Shell face' },
  { src: '/media/material-twill.webp', alt: 'Twill structure at magnification', caption: 'Twill' },
  { src: '/media/material-liner.webp', alt: 'Liner taffeta at magnification', caption: 'Hood liner' },
] as const;

/* ------------------------------------------------------------------ page -- */

export default async function StoryPage() {
  const [hero, products] = await Promise.all([getHeroProduct(), getProducts()]);
  const stats = buildStats(hero);
  const range = products.filter((product) => product.status === 'published').length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${absoluteUrl('/story')}#about`,
    name: 'The VAYRO story',
    url: absoluteUrl('/story'),
    description:
      'Why VAYRO exists: one garment that answers both performance and appearance, engineered from the carried state backwards.',
    inLanguage: SITE.language,
    primaryImageOfPage: { '@type': 'ImageObject', url: absoluteUrl('/media/field-ridgeline.jpg') },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* ------------------------------------------------------------ hero */}
      <header data-surface="inverse" className="relative isolate overflow-hidden">
        <Image
          src="/media/field-ridgeline.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ink)_30%,transparent)_0%,color-mix(in_oklab,var(--ink)_84%,transparent)_100%)]"
        />
        <ContourField opacity={0.07} scale={170} className="-z-10 text-[var(--fg)]" />

        <div className="shell flex min-h-[86svh] flex-col justify-end pt-[calc(var(--header-h)+6rem)] pb-20">
          <p className="t-label text-[var(--fg-subtle)]">Story</p>

          <RevealText
            as="h1"
            text={['WE STARTED WITH', 'A CONTRADICTION.']}
            delay={0.05}
            className="t-display-lg t-balance mt-6"
          />

          <div className="grid-12 mt-12">
            <Reveal variant="fadeUp" delay={0.16} className="col-span-4 lg:col-span-6">
              <p className="t-body-lg t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                Performance clothing works and looks like equipment. Fashion looks right and
                travels badly. VAYRO exists because nobody was willing to make one thing that did
                both.
              </p>
            </Reveal>
            <Reveal
              variant="fadeUp"
              delay={0.24}
              className="col-span-4 mt-8 lg:col-span-3 lg:col-start-10 lg:mt-0 lg:text-right"
            >
              <p className="t-spec text-[var(--fg-subtle)]">
                Eight moves,
                <br />
                one argument.
              </p>
            </Reveal>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------- 01 the problem */}
      <StoryChapter
        index="01"
        label="The problem"
        title={['EVERYONE IS', 'CARRYING TOO MUCH.']}
        body={[
          'Watch anyone move through a terminal at the end of a long day and the picture is always the same: a shell knotted at the waist, a coat over an arm that has held it for four hours, a second bag that exists only because the first one filled.',
          'Weight is not really the problem. Decisions are. Every extra piece is another thing to keep track of, put down, and leave behind in a hotel room. People do not over-pack because they are careless. They over-pack because almost nothing they own works in more than one situation.',
          'So they carry a layer for the cold start, a layer for the warm middle, and something presentable for the evening — and then they carry all three through the hours in between.',
        ]}
        aside={
          <ParallaxPlate
            src="/media/field-transit.webp"
            alt="A traveller crossing a terminal with a packed shell on the shoulder"
            sizes="(min-width: 1024px) 50vw, 100vw"
            aspect="aspect-[4/5]"
            index="01"
            caption="Transit — the half of the day outerwear is rarely designed for."
          />
        }
      />

      {/* ------------------------------------------------- full-bleed plate */}
      <ParallaxPlate
        src="/media/field-highpass.webp"
        alt="A high mountain pass under moving cloud"
        sizes="100vw"
        aspect="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"
        depth={50}
      />

      {/* ------------------------------------------------ 02/03 two answers */}
      <section aria-label="The two answers" className="shell section">
        <div className="border-b border-[var(--fg)] pb-6">
          <Reveal variant="fadeIn">
            <p className="flex items-center gap-4">
              <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
                02
              </span>
              <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
              <span className="t-label-sm text-[var(--fg-muted)]">Two industries</span>
            </p>
          </Reveal>
          <RevealText
            as="h2"
            text={['BOTH HALVES', 'HAVE AN ANSWER.', 'NEITHER HAS BOTH.']}
            delay={0.06}
            className="t-display-md t-balance mt-7"
          />
        </div>

        <div className="grid-12 mt-16 gap-y-16">
          <Reveal variant="fadeUp" className="col-span-4 lg:col-span-5">
            <p className="t-label text-[var(--fg-subtle)]">The outdoor answer</p>
            <h3 className="t-h1 t-balance mt-5 max-w-[14ch]">Built to perform. Drawn by nobody.</h3>
            <div className="mt-7 flex flex-col gap-5">
              <p className="t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                Technical outerwear solves the weather and then stops. The engineering is honest —
                seams taped, membrane rated, hood sized to clear a helmet — and the garment is
                drawn as though nobody wearing it will ever walk into a room.
              </p>
              <p className="t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                Colour blocking that dates inside a season. A logo scaled for a sponsor board. A
                silhouette cut around a climbing harness, sold overwhelmingly to people who have
                never worn one. The category decided long ago that performance and appearance are a
                trade, and quietly chose its side.
              </p>
            </div>
          </Reveal>

          <div
            aria-hidden
            className="hidden lg:col-span-2 lg:col-start-6 lg:block lg:w-px lg:justify-self-center lg:self-stretch lg:bg-[var(--border)]"
          />

          <Reveal variant="fadeUp" delay={0.08} className="col-span-4 lg:col-span-5 lg:col-start-8">
            <p className="t-label text-[var(--fg-subtle)]">The fashion answer</p>
            <h3 className="t-h1 t-balance mt-5 max-w-[14ch]">Beautiful. Then it rains.</h3>
            <div className="mt-7 flex flex-col gap-5">
              <p className="t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                The other half gets the line right and gives up everything else. A coat that
                photographs beautifully and holds water. A good jacket in a good cloth with no
                hood, no compression, and a lining that will not survive a week of being folded
                into a bag.
              </p>
              <p className="t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
                It is clothing designed for the ten metres between a door and a car. Wear it for a
                day that starts cold, warms up, and ends outdoors, and you will spend most of that
                day carrying it.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------- the question */}
      <PinnedStatement
        eyebrow="03 — The question"
        lines={['WHY CAN’T', 'PERFORMANCE', 'AND FASHION', 'EXIST IN THE', 'SAME PRODUCT?']}
        footnote="Nobody we asked answered with anything about the product. Every answer was about the industry — different factories, different buyers, different shows, different words for the same fabric. None of that is a reason. It is a habit."
      />

      {/* ---------------------------------------------------- 04 the answer */}
      <StoryChapter
        index="04"
        label="The answer"
        title={['SO WE DREW', 'THE ANSWER.']}
        reverse
        body={[
          `The ${hero.name} is one garment that takes both halves of the question seriously, and it gets there by starting from the wrong end — not from how a jacket looks worn, but from what it owes you the moment you take it off.`,
          'The collar inverts. The hood lining, oversized on purpose, opens as a cavity. The shell compresses into it, the zip closes around it, and the internal webbing — bar-tacked to the yoke rather than the shell — becomes a handle, then a shoulder strap. There is no stuff sack, because a stuff sack is a thing you lose.',
          'Worn, none of that is visible. It is a clean, articulated outer layer with a pre-shaped elbow, a gusseted underarm and a hem cut to clear a hip belt. The second function is engineered in, not bolted on.',
        ]}
        aside={
          <ParallaxPlate
            src="/media/studio-dark.webp"
            alt={`${hero.name} photographed in the studio`}
            sizes="(min-width: 1024px) 50vw, 100vw"
            aspect="aspect-[3/4]"
            index="02"
            caption={`${hero.name} — worn state, studio.`}
          />
        }
      />

      {/* ------------------------------------------------------- the figures */}
      <StatBand
        stats={stats}
        eyebrow="05 — Measured"
        caption="Every figure is taken from the specification table on the product page. Where a piece does not publish a measurement, it is not listed here."
      />

      {/* ------------------------------------------------------ 06 materials */}
      <StoryChapter
        index="06"
        label="Materials"
        title={['THE FABRIC', 'DECIDES EVERYTHING.']}
        body={[
          'A packable shell lives or dies on its cloth. Ours is a 20D recycled ripstop nylon at 42 gsm — fine enough to compress to two litres, gridded closely enough that a tear has to cross a thicker yarn before it can travel.',
          'Behind it sits an air-permeable membrane and a PFC-free DWR finish. In front of it, nothing decorative. The hardware is anodised alloy because a moulded pull whitens at the stress point, rattles against the slider, and reads as cheap the moment you touch it — and a jacket that clicks with every step is a jacket you stop wearing.',
          'We do not call it waterproof. It has taped seams and a membrane that would let us use the word, but the front zip is not a waterproof zip, and a garment is only as waterproof as its least waterproof opening. Weather resistant is the accurate description. Overclaiming is easy, and it costs you the second purchase.',
        ]}
        aside={
          <ul className="grid grid-cols-2 gap-[var(--gutter)]">
            {MACROS.map((macro, position) => (
              <li key={macro.src}>
                <Reveal variant="imageReveal" delay={position * 0.07}>
                  <div className="relative aspect-square w-full overflow-hidden bg-[var(--bg-sunken)]">
                    <Image
                      src={macro.src}
                      alt={macro.alt}
                      fill
                      sizes="(min-width: 1024px) 24vw, 45vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
                <p className="t-spec mt-3 border-t border-[var(--border)] pt-3 text-[var(--fg-subtle)]">
                  {macro.caption}
                </p>
              </li>
            ))}
          </ul>
        }
      />

      {/* --------------------------------------------------------- 07 studio */}
      <section data-surface="inverse" className="relative isolate overflow-hidden">
        <ContourField opacity={0.06} scale={150} className="-z-10 text-[var(--fg)]" />
        <StoryChapter
          index="07"
          label="The studio"
          title={['A SMALL ROOM', 'AND A LOT', 'OF SAMPLES.']}
          reverse
          body={[
            'VAYRO is a small studio. The Meridian went through more prototypes than it has panels, and most of them were killed by the same test: fold it, carry it for a day, and watch for the moment you want to put it down.',
            'We draw the hardware, specify the tape width, and write the care label ourselves. What reaches the catalogue is what survived the folding.',
            `${spellCount(range)}, not forty. We would rather make a short range properly than a long one quickly — and every piece has to earn its place in a bag that is already full.`,
          ]}
          aside={
            <div className="flex flex-col gap-[var(--gutter)] sm:flex-row lg:flex-col">
              <figure className="flex-1">
                <Reveal variant="imageReveal">
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-sunken)]">
                    <Image
                      src="/brand/applications/hardware-zipper-pull.jpg"
                      alt="An anodised alloy zip pull marked with the VAYRO symbol"
                      fill
                      sizes="(min-width: 1024px) 48vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
                <figcaption className="t-spec mt-3 border-t border-[var(--border)] pt-3 text-[var(--fg-subtle)]">
                  Hardware — anodised alloy pull, laser marked.
                </figcaption>
              </figure>

              <figure className="flex-1">
                <Reveal variant="imageReveal" delay={0.08}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-sunken)]">
                    <Image
                      src="/brand/applications/label-woven-neck.jpg"
                      alt="A woven neck label sewn into a shell collar"
                      fill
                      sizes="(min-width: 1024px) 48vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </Reveal>
                <figcaption className="t-spec mt-3 border-t border-[var(--border)] pt-3 text-[var(--fg-subtle)]">
                  Woven neck label — size, origin, care reference.
                </figcaption>
              </figure>
            </div>
          }
        />
      </section>

      {/* ------------------------------------------------- full-bleed plate */}
      <ParallaxPlate
        src="/media/field-dusk.webp"
        alt="Flat light over a valley at dusk"
        sizes="100vw"
        aspect="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]"
        depth={46}
      />

      {/* ----------------------------------------------------- 08 what next */}
      <StoryChapter
        index="08"
        label="What comes next"
        title={['THE RANGE GROWS', 'OUTWARD FROM', 'THE SHELL.']}
        centred
        body={[
          'A grid-fleece mid cut to sit under the Meridian without bunching at the shoulder. A daypack that collapses into its own base panel and stows inside the jacket it was designed to travel with. A cap that packs in a fist.',
          'Every new piece answers the same question the Meridian answered, and it has to justify the space it takes. If it cannot do two jobs, it does not get made.',
          'One layer. Every destination. The rest is still being drawn.',
        ]}
      />

      {/* ------------------------------------------------------------- CTA */}
      <section data-surface="inverse" className="relative isolate overflow-hidden">
        <ContourField opacity={0.07} scale={140} className="-z-10 text-[var(--fg)]" />
        <div className="shell section">
          <div className="grid-12 items-end">
            <div className="col-span-4 lg:col-span-7">
              <p className="t-label text-[var(--fg-subtle)]">
                {hero.subtitle ?? SITE.tagline}
              </p>
              <RevealText
                as="h2"
                text={['THE ANSWER IS', 'A PRODUCT,', 'NOT A SLOGAN.']}
                delay={0.05}
                className="t-display-md t-balance mt-6"
              />
              <p className="t-body-lg t-pretty mt-7 max-w-[var(--max-text)] text-[var(--fg-muted)]">
                {hero.description}
              </p>
            </div>

            <div className="col-span-4 mt-12 lg:col-span-4 lg:col-start-9 lg:mt-0">
              <p className="t-price-lg">{formatPrice(hero.price, hero.currency)}</p>
              <div className="mt-6 flex flex-col gap-3">
                <ButtonLink href={`/product/${hero.slug}`} size="lg" block data-cursor="link">
                  Experience the jacket
                </ButtonLink>
                <ButtonLink
                  href="/technology"
                  variant="secondary"
                  size="lg"
                  block
                  data-cursor="link"
                >
                  How the carry system works
                </ButtonLink>
              </div>
              <Link
                href="/journal"
                data-cursor="link"
                className="t-label mt-8 inline-flex items-center gap-3 border-b border-[var(--fg)] pb-2 transition-opacity duration-[var(--d-fast)] hover:opacity-70"
              >
                Read the journal
                <ArrowRight size={14} strokeWidth={1.25} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
