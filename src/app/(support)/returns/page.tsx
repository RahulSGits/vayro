import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { ButtonLink } from '@/components/ui/Button';
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
  title: 'Returns & exchanges',
  description:
    'Thirty days from delivery, unworn and with tags attached. One size exchange per order at our cost. How to start a return, and what a refund covers.',
  path: '/returns',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'short', title: 'The short version' },
  { id: 'condition', title: 'What we can take back' },
  { id: 'starting', title: 'Starting a return' },
  { id: 'refunds', title: 'Refunds' },
  { id: 'exchanges', title: 'Exchanges' },
  { id: 'faults', title: 'Faults and mistakes' },
];

export default function ReturnsPage() {
  return (
    <>
      <DocHeader
        eyebrow="Support"
        title="Returns & exchanges"
        lead="Thirty days from delivery, unworn, with the tags attached. One size exchange per order at our cost. No restocking fee, and no argument about whether you tried it on."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="short" title="The short version">
          <DocLead>
            If the piece is not right, send it back within thirty days of delivery and we will
            refund it.
          </DocLead>
          <DocDefinitions
            rows={[
              { term: 'Window', detail: '30 days from the delivery scan, not from the order date.' },
              { term: 'Condition', detail: 'Unworn, unwashed, tags attached, in a state we could sell.' },
              { term: 'Return carriage', detail: 'Paid by you on a change of mind. Paid by us on a fault or an error of ours.' },
              { term: 'Exchange', detail: 'One size or colourway swap per order, carriage on us both ways.' },
              { term: 'Refund route', detail: 'Back to the original payment method. We cannot send it anywhere else.' },
            ]}
          />
        </DocSection>

        <DocSection id="condition" title="What we can take back">
          <DocP>
            Trying a jacket on is not wearing it. Put it on, move your arms, check the sleeve
            length, pack it down and unpack it again — none of that stops us taking it back. What
            does is wear: a garment that has been out in the field, washed, altered, or has lost its
            tags cannot be resold, and we will not pretend otherwise by selling it to somebody else
            as new.
          </DocP>
          <DocList
            items={[
              'Unworn, with the tags still attached, in its original packaging where possible.',
              'Free of scent — perfume, smoke and detergent all transfer to a shell fabric and do not come out.',
              'Complete: pulls, spare cord locks and any hardware that came in the box.',
              'Within thirty days of the delivery scan on your tracking.',
            ]}
          />
          <DocNote title="Sale and final-run pieces">
            <p>
              Short-run colourways are returnable on exactly the same terms as everything else. We
              do not use a limited drop as an excuse to make a sale final.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="starting" title="Starting a return">
          <DocP>
            There is no portal to log into and no form that generates a case number nobody reads.
            Write to us with the order reference and what you would like to happen.
          </DocP>
          <DocList
            ordered
            items={[
              <>
                Email <a href={`mailto:${CONTACT.general}`} className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]">{CONTACT.general}</a> with your
                order reference — it looks like VY-01047 — and say whether you want a refund or an exchange.
              </>,
              'We reply with a return address and, for exchanges and faults, a prepaid label.',
              'Pack the piece with its tags. The original box is ideal; any box that protects it is fine.',
              'Send it, and keep the proof of postage until the refund lands. It is your only evidence if the parcel goes astray.',
            ]}
          />
          <div className="flex flex-wrap gap-4">
            <ButtonLink href="/contact" size="md">
              Start a return
            </ButtonLink>
            <ButtonLink href="/account/orders" variant="secondary" size="md">
              Find your order
            </ButtonLink>
          </div>
        </DocSection>

        <DocSection id="refunds" title="Refunds">
          <DocP>
            We inspect a return on the day it arrives and issue the refund the same day, to the
            card or method that paid for it. After that the timing belongs to your bank: most
            refunds appear within three to five working days, some take a full statement cycle.
          </DocP>
          <DocDefinitions
            rows={[
              { term: 'Goods', detail: 'Refunded in full, at the price you paid, including any discount that applied.' },
              {
                term: 'Outbound shipping',
                detail:
                  'Refunded when the whole order goes back, or when the return is our fault. Not refunded when part of an order is kept.',
              },
              {
                term: 'Return carriage',
                detail: 'Yours on a change of mind. Ours on a fault, a wrong item, or an error we made.',
              },
              {
                term: 'Free-shipping threshold',
                detail:
                  'If a partial return drops the order below the free-shipping threshold, we do not claw the shipping back. That would be sharp practice.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="exchanges" title="Exchanges">
          <DocP>
            A wrong size is not a wrong purchase. One exchange per order — a different size, or a
            different colourway at the same price — is carriage-free in both directions. We hold
            the replacement while the original is in transit so the size does not sell out
            underneath you.
          </DocP>
          <DocP>
            Second and subsequent exchanges on the same order are treated as a return followed by a
            fresh order, because at that point we are running a fitting room by post. Before you
            commit, the{' '}
            <Link
              href="/size-guide"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              size guide
            </Link>{' '}
            gives body measurements in centimetres for every size we cut.
          </DocP>
        </DocSection>

        <DocSection id="faults" title="Faults and mistakes">
          <DocP>
            A manufacturing fault is ours for two years from delivery: a seam that opens, a zip that
            fails, tape that lifts, hardware that breaks under normal use. Send photographs and the
            order reference and we will repair it, replace it, or refund it — in that order of
            preference, because a repaired jacket is a jacket that stays out of a landfill.
          </DocP>
          <DocP>
            Wear is not a fault. A DWR finish is consumable and needs reproofing; abrasion from a
            pack strap is the fabric doing its job. The{' '}
            <Link
              href="/care"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              care guide
            </Link>{' '}
            covers both, and getting them right adds years to a shell.
          </DocP>
          <DocNote title="If we sent the wrong thing">
            <p>
              Tell us and keep the parcel sealed if you can. We send the correct piece immediately
              and collect the other at our cost — you should not be out of pocket or out of a
              jacket because of our picking error.
            </p>
          </DocNote>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/returns" />
    </>
  );
}
