import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { getProducts } from '@/lib/repo/products';
import { specValue } from '@/components/product/product-utils';
import { CONTACT } from '../_components/documents';
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
  type DocSectionRef,
} from '../_components/Doc';

export const metadata: Metadata = buildMetadata({
  title: 'Care & repair',
  description:
    'How to wash, reproof, store and repair VAYRO equipment — the instructions printed on the label, plus the reasoning behind them.',
  path: '/care',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'principles', title: 'Four things that matter' },
  { id: 'by-piece', title: 'Instructions by piece' },
  { id: 'reproofing', title: 'Reproofing the finish' },
  { id: 'storage', title: 'Storage' },
  { id: 'repair', title: 'Repair' },
];

export default async function CarePage() {
  const products = await getProducts();
  const withCare = products.filter((product) => product.care.length > 0);
  const hero = products.find((product) => product.slug === 'meridian-carry-shell') ?? products[0];
  const reproofing = hero ? specValue(hero, 'Reproofing') : null;
  const wash = hero ? specValue(hero, 'Wash') : null;

  return (
    <>
      <DocHeader
        eyebrow="Support"
        title="Care & repair"
        lead="A technical shell is a consumable finish stretched over a durable fabric. Look after the finish and the fabric will outlast several of everything else you own."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="principles" title="Four things that matter">
          <DocLead>
            Wash it more often than you think, colder than you think, and never with softener.
          </DocLead>
          <DocList
            ordered
            items={[
              'Dirt kills water repellency faster than washing does. A shell that has stopped beading is usually a dirty shell, not a worn-out one.',
              'Use a technical detergent, not a household one. Ordinary detergents leave surfactants behind, and surfactants are what make water spread rather than bead.',
              'Fabric softener coats the fibres and blocks the DWR completely. There is no recovering from it in one wash.',
              'Heat is what reactivates the finish — a cool tumble or a warm iron through a cloth. Read the label for the piece in question before you apply either.',
            ]}
          />
          {wash ? (
            <DocNote title="What the label on the Meridian says">
              <p>{wash}</p>
            </DocNote>
          ) : null}
        </DocSection>

        <DocSection id="by-piece" title="Instructions by piece">
          <DocP>
            These are the instructions printed on each garment’s own label, reproduced verbatim.
            Where a piece contradicts the general advice above, the piece is right.
          </DocP>

          <div className="flex flex-col gap-10">
            {withCare.map((product) => (
              <div key={product.id} className="border-t border-[var(--border)] pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <h3 className="t-h3">{product.name}</h3>
                  <Link
                    href={`/product/${product.slug}`}
                    data-cursor="link"
                    className="t-label-sm text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--fg)]"
                  >
                    Specification
                  </Link>
                </div>

                <ul className="mt-5 flex max-w-[var(--max-text)] flex-col gap-3">
                  {product.care.map((instruction) => (
                    <li
                      key={instruction}
                      className="t-pretty flex gap-4 text-[var(--fg-muted)]"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 block h-px w-4 shrink-0 bg-[var(--border-strong)]"
                      />
                      <span>{instruction}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DocSection>

        <DocSection id="reproofing" title="Reproofing the finish">
          <DocP>
            The DWR on our shells is PFC-free, which is the right decision environmentally and the
            reason the finish needs attention sooner than the fluorocarbon coatings it replaced. It
            is a consumable. Treat it like one.
          </DocP>
          <DocDefinitions
            rows={[
              {
                term: 'When to reproof',
                detail:
                  reproofing ??
                  'When water stops beading on the shoulders and the fabric starts to wet out, even after a clean wash.',
              },
              {
                term: 'What to use',
                detail:
                  'A wash-in or spray-on PFC-free DWR treatment. Spray-on lasts less time but does not touch the inside of the garment, which matters if the lining is brushed.',
              },
              {
                term: 'How',
                detail:
                  'Wash first. Apply to a clean, damp garment. Then apply gentle heat exactly as the treatment instructs — heat is what cures the finish, and skipping it wastes the bottle.',
              },
              {
                term: 'What it will not fix',
                detail:
                  'A membrane that has delaminated, or tape that has lifted. Those are construction failures, not finish failures — tell us instead.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="storage" title="Storage">
          <DocP>
            Packing a shell into its own hood is a travel state, not a storage state. Between trips,
            hang it or lay it flat, dry, and out of direct sun.
          </DocP>
          <DocList
            items={[
              'Fully dry before it goes away. Damp compressed nylon grows exactly what you would expect.',
              'Zips open. A garment stored under tension at the slider distorts the tape over months.',
              'Out of sunlight. UV degrades a shell fabric faster than any amount of wearing it.',
              'Not in a compression sack for months on end. The membrane prefers to sit relaxed.',
            ]}
          />
        </DocSection>

        <DocSection id="repair" title="Repair">
          <DocP>
            A small tear in a ripstop is a five-minute job with a self-adhesive repair patch and is
            genuinely permanent — the grid stops the tear travelling, which is the whole point of
            the weave. Larger damage, a failed zip or lifted seam tape should come back to us.
          </DocP>
          <DocP>
            Manufacturing faults are covered for two years from delivery, described in full under{' '}
            <Link
              href="/returns"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              returns and exchanges
            </Link>
            . Damage from use is not a fault, but we would still rather repair it than see the
            garment replaced. Send photographs and your order reference to{' '}
            <a
              href={`mailto:${CONTACT.general}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.general}
            </a>{' '}
            and we will quote for the work before doing any of it.
          </DocP>
          <DocNote title="Why we would rather mend it">
            <p>
              The most sustainable jacket is the one already in your wardrobe. A repair costs less
              than a replacement, keeps a shell out of landfill, and keeps us honest about how well
              the thing was made in the first place.
            </p>
          </DocNote>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/care" />
    </>
  );
}
