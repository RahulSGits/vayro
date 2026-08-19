import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getProducts } from '@/lib/repo/products';
import { SIZE_CHART, hasSizeChart, specValue } from '@/components/product/product-utils';
import {
  DocBody,
  DocContents,
  DocDefinitions,
  DocFooter,
  DocHeader,
  DocLead,
  DocList,
  DocNote,
  DocP,
  DocSection,
  DocTable,
  type DocSectionRef,
} from '../_components/Doc';

export const metadata: Metadata = buildMetadata({
  title: 'Size guide',
  description:
    'Body measurements in centimetres for XS to XXL — chest, waist, back length and sleeve — plus how to measure yourself and how the Meridian is cut.',
  path: '/size-guide',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'chart', title: 'Body measurements' },
  { id: 'measuring', title: 'How to measure' },
  { id: 'cut', title: 'How the pieces are cut' },
  { id: 'between', title: 'Between two sizes' },
  { id: 'one-size', title: 'One-size pieces' },
];

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default async function SizeGuidePage() {
  const products = await getProducts();
  const sized = products.filter((product) => hasSizeChart(product));
  const oneSize = products.filter((product) => !hasSizeChart(product));

  const rows = SIZE_ORDER.map((size) => SIZE_CHART[size])
    .filter(Boolean)
    .map((row) => ({
      size: row.size,
      chest: row.chest,
      waist: row.waist,
      sleeve: row.sleeve,
      length: row.length,
    }));

  return (
    <>
      <DocHeader
        eyebrow="Support"
        title="Size guide"
        lead="These are body measurements, in centimetres — the body each size is cut for, not the width of the finished garment. Garment weight and packed dimensions live on the product page, where you can check them against the piece itself."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="chart" title="Body measurements">
          <DocLead>Measure yourself, then read across. Every figure is in centimetres.</DocLead>

          <DocTable
            caption="VAYRO body measurements in centimetres: chest, waist, sleeve and back length for sizes XS to XXL"
            columns={[
              { key: 'size', label: 'Size' },
              { key: 'chest', label: 'Chest (cm)' },
              { key: 'waist', label: 'Waist (cm)' },
              { key: 'sleeve', label: 'Sleeve (cm)' },
              { key: 'length', label: 'Back length (cm)' },
            ]}
            rows={rows}
            rowHeaderKey="size"
            minWidth="38rem"
          />

          <DocP>
            Chest and waist are ranges because a body is not a single number. Sleeve and back length
            are the garment’s own finished dimensions for that size — the figures you would get by
            laying the piece flat and running a tape down the centre back, and from the shoulder
            seam to the cuff.
          </DocP>
        </DocSection>

        <DocSection id="measuring" title="How to measure">
          <DocP>
            Use a soft tape, wear what you would normally wear under a shell, and keep the tape
            level. Somebody else holding it is worth two of you guessing.
          </DocP>
          <DocList
            ordered
            items={[
              'Chest — around the fullest part, under the arms, tape level front and back. Breathe out normally; do not puff up.',
              'Waist — around the narrowest point of the torso, usually just above the navel. Do not pull it tight.',
              'Sleeve — from the point of the shoulder, over a slightly bent elbow, to the wrist bone.',
              'Back length — from the bone at the base of the neck, straight down the spine, to where you want the hem to sit.',
            ]}
          />
          <DocNote title="Measure over a mid layer if you layer">
            <p>
              The shell is cut to go over a grid fleece. If that is how you will wear it, take your
              chest measurement with the mid layer on and size from that figure — it is usually
              two to three centimetres more.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="cut" title="How the pieces are cut">
          <DocP>
            Our outer layers are cut with layering ease through the chest and a pre-shaped elbow, so
            the sleeve stays put when you reach up rather than dragging the hem with it. The hem
            itself sits high enough to clear a hip belt. None of that reads as loose when the piece
            is worn on its own.
          </DocP>

          {sized.length > 0 ? (
            <DocDefinitions
              rows={sized.map((product) => ({
                term: product.name,
                detail: (
                  <>
                    {product.subtitle ? `${product.subtitle} ` : ''}
                    Sizes {SIZE_ORDER.filter((size) =>
                      product.variants.some((variant) => variant.size === size),
                    ).join(', ')}
                    {specValue(product, 'Weight (size M)') || specValue(product, 'Weight')
                      ? ` — ${specValue(product, 'Weight (size M)') ?? specValue(product, 'Weight')} in size M.`
                      : '.'}{' '}
                    <Link
                      href={`/product/${product.slug}`}
                      className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                    >
                      Full specification
                    </Link>
                  </>
                ),
              }))}
            />
          ) : null}
        </DocSection>

        <DocSection id="between" title="Between two sizes">
          <DocP>
            Take the larger. Two reasons, both practical: the outer layers are drawn to go over a
            mid, and a shell that is slightly generous still packs to the same volume, while one
            that is slightly tight restricts the shoulder exactly where you notice it.
          </DocP>
          <DocP>
            If you are at the very top of a chest range and the very bottom of a waist range, size
            on the chest. The hem drawcord takes the difference; nothing takes up a tight chest.
          </DocP>
          <DocNote title="Still unsure">
            <p>
              Send us your chest and sleeve measurements and how you intend to layer, and we will
              tell you which size we would put you in. If we get it wrong, the exchange is on us —
              see{' '}
              <Link
                href="/returns"
                className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
              >
                returns and exchanges
              </Link>
              .
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="one-size" title="One-size pieces">
          <DocP>
            Some equipment is made in a single size, where the fit is handled by an adjuster rather
            than by a pattern. Dimensions and weight for these are on the product page.
          </DocP>
          {oneSize.length > 0 ? (
            <DocList
              items={oneSize.map((product) => (
                <span key={product.id}>
                  <Link
                    href={`/product/${product.slug}`}
                    className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                  >
                    {product.name}
                  </Link>
                  {product.subtitle ? ` — ${product.subtitle}` : null}
                </span>
              ))}
            />
          ) : (
            <DocP>Every piece in the current range is cut to size.</DocP>
          )}
        </DocSection>
      </DocBody>

      <DocFooter exclude="/size-guide" />
    </>
  );
}
