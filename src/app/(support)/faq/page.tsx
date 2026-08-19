import type { Metadata } from 'next';
import { buildMetadata, absoluteUrl } from '@/lib/seo';
import { getHeroProduct } from '@/lib/repo/products';
import { formatPrice, pluralise } from '@/lib/utils';
import { specValue } from '@/components/product/product-utils';
import { Accordion, AccordionItem } from '@/components/ui/Accordion';
import {
  DESPATCH_DAYS,
  SHIPPING_FLAT,
  SHIPPING_FREE_THRESHOLD,
} from '@/app/api/_lib/pricing';
import { CONTACT } from '../_components/documents';
import { DocFooter, DocHeader, DocP } from '../_components/Doc';

export const metadata: Metadata = buildMetadata({
  title: 'FAQ',
  description:
    'The questions VAYRO is actually asked — about the carry system, weather resistance, sizing, delivery, returns and payment.',
  path: '/faq',
});

type Entry = { q: string; a: string[] };
type Group = { title: string; id: string; entries: Entry[] };

export default async function FaqPage() {
  const hero = await getHeroProduct();

  const weight = specValue(hero, 'Weight (size M)') ?? 'the figure on the product page';
  const volume = specValue(hero, 'Packed volume') ?? 'a compact carry unit';
  const packedSize = specValue(hero, 'Packed size');
  const water = specValue(hero, 'Water resistance') ?? 'DWR finish, PFC-free. Not waterproof.';

  const groups: Group[] = [
    {
      title: 'The product',
      id: 'product',
      entries: [
        {
          q: 'How does the carry system actually work?',
          a: [
            `The collar inverts and the hood lining — oversized on purpose — opens as a cavity. The shell compresses into it and the zip closes around it. Internal webbing, bar-tacked to the yoke rather than the shell, takes the load and becomes a handle in one configuration and a shoulder strap in the other.`,
            `Packed, the ${hero.name} is ${volume}${packedSize ? ` and measures ${packedSize}` : ''}. There is no stuff sack, because a stuff sack is a thing you lose.`,
          ],
        },
        {
          q: 'Is it waterproof?',
          a: [
            `No, and we do not use the word. ${water}`,
            'It has taped seams and a membrane that would let most brands make the claim, but the front zip is not a waterproof zip, and a garment is only as waterproof as its least waterproof opening. It handles wind and passing rain. It is not what you want in sustained heavy rainfall.',
          ],
        },
        {
          q: 'How heavy is it?',
          a: [
            `${weight} in size M. The shell is a 20D recycled ripstop nylon at 42 gsm; the weight moves by roughly ten grams per size in either direction.`,
          ],
        },
        {
          q: 'Can I wear it in a city without looking like I am about to climb something?',
          a: [
            'That is the entire brief. No colour blocking, no sponsor-scale logo, no harness-shaped silhouette. The second function is engineered in rather than advertised — worn, it reads as a clean articulated outer layer, and nothing about it announces the packing system.',
          ],
        },
      ],
    },
    {
      title: 'Sizing and fit',
      id: 'sizing',
      entries: [
        {
          q: 'How does it fit?',
          a: [
            'True to the body measurements published in the size guide, with layering ease through the chest so a mid layer sits underneath without bunching at the shoulder. The hem is cut to clear a hip belt.',
          ],
        },
        {
          q: 'I am between two sizes.',
          a: [
            'Take the larger. A shell that is slightly generous packs to the same volume; one that is slightly tight restricts the shoulder exactly where you notice it. If you are at the top of a chest range and the bottom of a waist range, size on the chest — the hem drawcord takes the difference.',
          ],
        },
        {
          q: 'Will you tell me which size to buy?',
          a: [
            `Send your chest and sleeve measurements and how you intend to layer to ${CONTACT.general} and we will give you a straight answer. If we get it wrong, the exchange is on us.`,
          ],
        },
      ],
    },
    {
      title: 'Ordering and delivery',
      id: 'delivery',
      entries: [
        {
          q: 'When will my order ship?',
          a: [
            `Within ${pluralise(DESPATCH_DAYS, 'working day')} of payment clearing. You get a dispatch email with a tracking number when the carrier scans the parcel, not when the label is printed.`,
          ],
        },
        {
          q: 'What does shipping cost?',
          a: [
            `Standard shipping is ${formatPrice(SHIPPING_FLAT)} and is free once the merchandise total, after any discount, reaches ${formatPrice(SHIPPING_FREE_THRESHOLD)}. Express and Priority are charged at cost and are never waived.`,
          ],
        },
        {
          q: 'Do you ship outside India?',
          a: [
            'To nine other destinations at present. Prices are set in Indian rupees and include tax for delivery within India only — elsewhere, import duty and local tax are levied on arrival and are payable by the recipient. The full list is on the shipping page.',
          ],
        },
        {
          q: 'How do I pay?',
          a: [
            'Card, handled by our payment provider. Card details are entered directly into the provider’s own fields and never reach our servers, so there is nothing on our side for anyone to steal.',
          ],
        },
      ],
    },
    {
      title: 'Returns and care',
      id: 'returns',
      entries: [
        {
          q: 'What is the returns window?',
          a: [
            'Thirty days from the delivery scan, unworn and with tags attached. Return carriage is yours on a change of mind and ours on a fault or an error we made. One size or colourway exchange per order is carriage-free both ways.',
          ],
        },
        {
          q: 'Trying it on — does that count as worn?',
          a: [
            'No. Put it on, move your arms, pack it down and unpack it. What we cannot take back is a garment that has been out in the field, washed, altered, or has lost its tags, because we will not sell that to somebody else as new.',
          ],
        },
        {
          q: 'Water has stopped beading on the shoulders. Is it finished?',
          a: [
            'Almost certainly not. A shell that stops beading is usually a dirty shell. Wash it with a technical detergent, apply gentle heat as the label instructs, and the finish generally returns. If it does not, reproof it — the DWR is PFC-free and is a consumable.',
          ],
        },
        {
          q: 'Do you repair things?',
          a: [
            `Yes. Manufacturing faults are covered for two years from delivery. Damage from use is not covered, but we would still rather mend it than see it replaced — send photographs and your order reference to ${CONTACT.general} and we will quote before doing any work.`,
          ],
        },
      ],
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${absoluteUrl('/faq')}#faq`,
    url: absoluteUrl('/faq'),
    mainEntity: groups.flatMap((group) =>
      group.entries.map((entry) => ({
        '@type': 'Question',
        name: entry.q,
        acceptedAnswer: { '@type': 'Answer', text: entry.a.join(' ') },
      })),
    ),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, '\\u003c') }}
      />

      <DocHeader
        eyebrow="Support"
        title="Frequently asked"
        lead={`The questions that actually arrive, answered at the length they deserve. If yours is not here, the studio replies to email within ${CONTACT.responseTarget}.`}
        updated="2026-06-24"
      />

      <div className="mt-16 flex flex-col gap-14">
        {groups.map((group) => (
          <section
            key={group.id}
            id={group.id}
            aria-labelledby={`${group.id}-heading`}
            className="scroll-mt-[calc(var(--header-h)+2rem)]"
          >
            <h2
              id={`${group.id}-heading`}
              className="t-label border-b border-[var(--fg)] pb-4 text-[var(--fg-subtle)]"
            >
              {group.title}
            </h2>

            <Accordion type="multiple" className="mt-2 border-t-0">
              {group.entries.map((entry) => (
                <AccordionItem key={entry.q} value={entry.q} title={entry.q}>
                  <div className="flex flex-col gap-4">
                    {entry.a.map((paragraph) => (
                      <DocP key={paragraph.slice(0, 32)}>{paragraph}</DocP>
                    ))}
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}
      </div>

      <DocFooter exclude="/faq" />
    </>
  );
}
