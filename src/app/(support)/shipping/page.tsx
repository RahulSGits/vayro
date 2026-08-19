import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { formatPrice, pluralise } from '@/lib/utils';
import {
  DESPATCH_DAYS,
  SHIPPING_FLAT,
  SHIPPING_FREE_THRESHOLD,
  SHIPPING_METHODS,
} from '@/app/api/_lib/pricing';
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
  title: 'Shipping',
  description:
    'Dispatch windows, delivery services, rates and destinations for VAYRO orders. Free standard shipping above ₹5,000; tracked as standard.',
  path: '/shipping',
});

/**
 * Mirrors `COUNTRIES` in `src/components/checkout/schema.ts`, which is a client
 * module (transitively, through the cart store) and cannot be read from a
 * server component. Change one, change both — this page must never advertise a
 * destination the checkout will refuse.
 */
const DESTINATIONS = [
  'India',
  'United Arab Emirates',
  'Singapore',
  'United Kingdom',
  'Germany',
  'France',
  'United States',
  'Canada',
  'Australia',
  'Japan',
];

const SECTIONS: DocSectionRef[] = [
  { id: 'dispatch', title: 'When your order leaves' },
  { id: 'services', title: 'Services and rates' },
  { id: 'destinations', title: 'Where we ship' },
  { id: 'tracking', title: 'Tracking' },
  { id: 'duties', title: 'Duties and import charges' },
  { id: 'problems', title: 'When something goes wrong' },
];

export default function ShippingPage() {
  const standard = SHIPPING_METHODS.find((method) => method.id === 'standard');

  const rows = SHIPPING_METHODS.map((method) => ({
    service: method.name,
    lead:
      method.leadTime[0] === method.leadTime[1]
        ? pluralise(method.leadTime[0], 'working day')
        : `${method.leadTime[0]}–${method.leadTime[1]} working days`,
    rate: formatPrice(method.rate),
    waived: method.waivedAboveThreshold ? `Free above ${formatPrice(SHIPPING_FREE_THRESHOLD)}` : '—',
  }));

  return (
    <>
      <DocHeader
        eyebrow="Support"
        title="Shipping"
        lead="Everything leaves the studio tracked. What follows is when it leaves, what it costs, how long it takes and what happens when a courier gets it wrong."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="dispatch" title="When your order leaves">
          <DocLead>
            Orders are picked, checked and dispatched within {pluralise(DESPATCH_DAYS, 'working day')} of
            payment clearing.
          </DocLead>
          <DocP>
            Orders placed on a Friday evening or over a weekend enter the queue on the next working
            day. Public holidays in Karnataka move the window by the length of the holiday and
            nothing more. You will get a dispatch email with a tracking number the moment the
            carrier scans the parcel — not when the label is printed, which is the usual trick.
          </DocP>
          <DocNote title="Delivery estimates are estimates">
            <p>
              The delivery windows below are counted in working days <em>from dispatch</em>, not
              from the moment you order. A courier delay is not something we can promise away, so
              we quote the range the carrier actually keeps rather than the one that sells better.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="services" title="Services and rates">
          <DocP>
            Rates are per order, not per item, and are shown in full at checkout before payment.
            Priority is available to metropolitan addresses in India only, because it is the only
            place a next-working-day promise can be kept.
          </DocP>

          <DocTable
            caption="VAYRO shipping services, delivery windows and rates"
            columns={[
              { key: 'service', label: 'Service' },
              { key: 'lead', label: 'From dispatch' },
              { key: 'rate', label: 'Rate', align: 'right' },
              { key: 'waived', label: 'Threshold', align: 'right' },
            ]}
            rows={rows}
            rowHeaderKey="service"
            minWidth="36rem"
          />

          {standard ? (
            <DocP>
              Standard shipping is {formatPrice(SHIPPING_FLAT)} and is waived entirely once the
              merchandise total, after any discount, reaches{' '}
              {formatPrice(SHIPPING_FREE_THRESHOLD)}. Express and Priority are never waived — they
              cost the carrier more, so they cost you more.
            </DocP>
          ) : null}
        </DocSection>

        <DocSection id="destinations" title="Where we ship">
          <DocP>
            Ten destinations at present. The list grows when we can support a return leg from a
            country properly, not when we can merely put a parcel on a plane to it.
          </DocP>
          <ul className="flex max-w-[var(--max-text)] flex-wrap gap-2">
            {DESTINATIONS.map((country) => (
              <li
                key={country}
                className="t-label-sm border border-[var(--border-strong)] px-3.5 py-2 text-[var(--fg-muted)]"
              >
                {country}
              </li>
            ))}
          </ul>
          <DocP>
            If your country is not here, the checkout will say so rather than take the order and
            cancel it later. Write to us and we will tell you honestly whether it is close.
          </DocP>
        </DocSection>

        <DocSection id="tracking" title="Tracking">
          <DocP>
            Every parcel ships tracked, with a signature required on delivery. Two emails: one when
            the order is confirmed, one when it is scanned by the carrier.
          </DocP>
          <DocList
            items={[
              <>
                Signed in? Your tracking number and its current status sit on the order itself,
                under{' '}
                <Link
                  href="/account/orders"
                  className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                >
                  your orders
                </Link>
                .
              </>,
              'Ordered as a guest? The dispatch email carries the same number and links straight to the carrier.',
              'A tracking number can take a few hours to appear on the carrier’s own site after the first scan. That gap is normal and is not a lost parcel.',
            ]}
          />
        </DocSection>

        <DocSection id="duties" title="Duties and import charges">
          <DocP>
            Catalogue prices are set in Indian rupees and are inclusive of tax for delivery within
            India. For every other destination, the price you pay us excludes local import duty,
            VAT, GST and any handling fee the carrier charges to collect them.
          </DocP>
          <DocDefinitions
            rows={[
              {
                term: 'Delivered in India',
                detail: 'Price shown is the price paid. Tax is already in it. Nothing is collected on the doorstep.',
              },
              {
                term: 'Delivered elsewhere',
                detail:
                  'Import charges are levied by the destination country on arrival and are payable by the recipient. They are not ours to quote, and we do not take a margin on them.',
              },
              {
                term: 'Refused parcels',
                detail:
                  'A parcel refused at the door because of import charges comes back to us. We refund the goods, less the outbound and return carriage we were actually billed.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="problems" title="When something goes wrong">
          <DocP>
            Parcels go missing, addresses get mistyped, and couriers occasionally mark something
            delivered that is sitting in a depot. None of that is your problem to solve alone.
          </DocP>
          <DocList
            ordered
            items={[
              'Marked delivered but not in your hands? Give it one working day — premature scans usually resolve themselves — then tell us.',
              'No movement on tracking for three working days? Tell us. We open the carrier investigation, not you.',
              'Wrong or incomplete address? Contact us before dispatch and we will correct it. After dispatch we can usually intercept, but not always.',
              'Damaged in transit? Photograph the outer packaging before you unpack it, and send us the photographs with your order reference.',
            ]}
          />
          <DocP>
            Anything we got wrong, we fix at our cost. That is not a policy so much as the minimum
            for staying in business.
          </DocP>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/shipping" />
    </>
  );
}
