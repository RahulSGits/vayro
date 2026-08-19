import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { formatPrice, pluralise } from '@/lib/utils';
import {
  DESPATCH_DAYS,
  SHIPPING_FLAT,
  SHIPPING_FREE_THRESHOLD,
} from '@/app/api/_lib/pricing';
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
  title: 'Terms of sale',
  description:
    'The terms on which VAYRO sells: orders and acceptance, prices in INR, delivery and risk, cancellation, faults, liability and governing law.',
  path: '/terms',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'parties', title: 'Who you are contracting with' },
  { id: 'orders', title: 'Orders and acceptance' },
  { id: 'prices', title: 'Prices and payment' },
  { id: 'delivery', title: 'Delivery and risk' },
  { id: 'cancellation', title: 'Cancellation and returns' },
  { id: 'accuracy', title: 'Product information' },
  { id: 'faults', title: 'Faults and your legal rights' },
  { id: 'accounts', title: 'Accounts and acceptable use' },
  { id: 'liability', title: 'Liability' },
  { id: 'law', title: 'Governing law and changes' },
];

export default function TermsPage() {
  return (
    <>
      <DocHeader
        eyebrow="Legal"
        title="Terms of sale"
        lead="The terms on which VAYRO sells to you. Nothing here removes a right the law gives you as a consumer — where a clause and the law disagree, the law wins and the clause does not apply."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="parties" title="Who you are contracting with">
          <DocP>
            VAYRO designs and sells outerwear and travel equipment. When you place an order on this
            site, your contract is with VAYRO. You can reach us at{' '}
            <a
              href={`mailto:${CONTACT.general}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.general}
            </a>{' '}
            about anything in this document.
          </DocP>
          <DocP>
            These terms apply to consumer purchases. If you are buying to resell, or on behalf of a
            business, write to us first — the terms are different and the ones below will not apply.
          </DocP>
        </DocSection>

        <DocSection id="orders" title="Orders and acceptance">
          <DocLead>
            A placed order is an offer. The contract exists once we send the dispatch email.
          </DocLead>
          <DocList
            ordered
            items={[
              'You place an order and we take payment authorisation. This is not yet acceptance.',
              'We confirm receipt by email. This is a record of what you asked for, not an acceptance of it.',
              'We accept the order when the goods are dispatched, and we tell you so in the dispatch email.',
              'If we cannot accept — the piece is out of stock, the price was displayed incorrectly, or we cannot ship to the address — we cancel, refund in full, and explain why.',
            ]}
          />
          <DocP>
            Stock figures on the site are live but not reserved: adding a piece to a basket does not
            hold it. In the rare case that two orders take the last unit, the one that completed
            payment first is the one we fulfil.
          </DocP>
        </DocSection>

        <DocSection id="prices" title="Prices and payment">
          <DocDefinitions
            rows={[
              {
                term: 'Currency',
                detail: 'All prices are in Indian rupees (INR) and include applicable tax for delivery within India.',
              },
              {
                term: 'Outside India',
                detail:
                  'Import duty, local tax and carrier handling fees are levied on arrival and are payable by the recipient. They are not included in the price and we take no margin on them.',
              },
              {
                term: 'Shipping',
                detail: `Standard shipping is ${formatPrice(SHIPPING_FLAT)}, waived once the merchandise total after discount reaches ${formatPrice(SHIPPING_FREE_THRESHOLD)}. Faster services are charged at cost and are never waived.`,
              },
              {
                term: 'Payment',
                detail:
                  'Card payments are collected by our payment provider. Card details are entered into their fields and never reach our servers. We take payment authorisation at checkout and capture it on dispatch.',
              },
              {
                term: 'Pricing errors',
                detail:
                  'If a price is obviously wrong and you could reasonably have recognised it as an error, we are not obliged to sell at it. We will contact you, offer the correct price, and refund in full if you decline.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="delivery" title="Delivery and risk">
          <DocP>
            Orders are dispatched within {pluralise(DESPATCH_DAYS, 'working day')} of payment
            clearing. Delivery windows quoted at checkout and on the{' '}
            <Link
              href="/shipping"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              shipping page
            </Link>{' '}
            are counted in working days from dispatch, and are estimates, not guarantees.
          </DocP>
          <DocList
            items={[
              'Risk in the goods passes to you on delivery — not on dispatch. A parcel lost or damaged in transit is our problem to resolve with the carrier.',
              'Ownership passes when we have received payment in full.',
              'If a delivery fails because the address was wrong or nobody was available across the carrier’s attempts, the parcel returns to us and we refund the goods less the carriage we were actually billed.',
              'A delay caused by something outside our reasonable control — weather, strike action, customs — suspends the estimate for as long as it lasts. We will tell you rather than let you wonder.',
            ]}
          />
        </DocSection>

        <DocSection id="cancellation" title="Cancellation and returns">
          <DocP>
            You may cancel an order before dispatch by writing to us, and we will refund it in full.
            After delivery, our returns policy gives you thirty days to change your mind — longer
            than the statutory cooling-off period in most of the places we ship to, and on the same
            terms whether the piece was full price or from a short run.
          </DocP>
          <DocP>
            The condition requirements, the refund route and who pays return carriage are set out in
            full under{' '}
            <Link
              href="/returns"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              returns and exchanges
            </Link>
            , which forms part of these terms.
          </DocP>
        </DocSection>

        <DocSection id="accuracy" title="Product information">
          <DocP>
            Specifications, weights and packed dimensions on this site are measured on production
            pieces and published as measured. Weight can vary by a few grams between sizes and
            between production runs; that variance is normal and is not a defect.
          </DocP>
          <DocNote title="On weather resistance">
            <p>
              We describe our shells as weather resistant, not waterproof, and that distinction is
              deliberate. Taped seams and a rated membrane do not make a garment waterproof when the
              front zip is not a waterproof zip. Treat the wording on the product page as the claim
              we stand behind, and disregard any looser description you find elsewhere.
            </p>
          </DocNote>
          <DocP>
            Colour on a screen is not colour in the hand. Every screen renders differently, and a
            colourway that looks slightly different in person is a return under the normal policy,
            not a fault.
          </DocP>
        </DocSection>

        <DocSection id="faults" title="Faults and your legal rights">
          <DocP>
            Goods must match their description, be of satisfactory quality and be fit for purpose.
            Those rights come from consumer law, and nothing in these terms limits them.
          </DocP>
          <DocP>
            On top of that, we cover manufacturing faults for two years from delivery — a seam that
            opens, a zip that fails, tape that lifts, hardware that breaks under normal use. We will
            repair, replace or refund, in that order of preference. Wear is not a fault: a DWR
            finish is consumable and abrasion at a pack strap is the fabric doing its job. The{' '}
            <Link
              href="/care"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              care guide
            </Link>{' '}
            covers both.
          </DocP>
        </DocSection>

        <DocSection id="accounts" title="Accounts and acceptable use">
          <DocList
            items={[
              'Keep your account credentials to yourself. You are responsible for what happens under your account until you tell us it has been compromised.',
              'Give accurate details. An order placed with a false name or address may be cancelled.',
              'Do not scrape, resell or systematically copy the catalogue, the photography or the copy on this site. All of it is ours or licensed to us.',
              'Do not attempt to interfere with the site, its security or anyone else’s use of it.',
              'Reviews must describe a genuine experience. We remove anything fabricated, and we never write reviews ourselves or pay anyone to.',
            ]}
          />
        </DocSection>

        <DocSection id="liability" title="Liability">
          <DocP>
            We are responsible for loss you suffer that is a foreseeable result of us breaking these
            terms or failing to use reasonable care. We are not responsible for loss that was not
            foreseeable, or for business losses — lost profit, lost opportunity, lost data — because
            this is a consumer shop.
          </DocP>
          <DocP>
            Nothing here excludes or limits liability for death or personal injury caused by our
            negligence, for fraud, or for anything else that cannot lawfully be excluded. Where a
            limit applies, our total liability for an order is capped at the amount you paid for it.
          </DocP>
        </DocSection>

        <DocSection id="law" title="Governing law and changes">
          <DocP>
            These terms are governed by the laws of India, and the courts of Bengaluru have
            jurisdiction. If you are a consumer resident elsewhere, you keep the benefit of any
            mandatory consumer protection in your own country — this clause does not take that away.
          </DocP>
          <DocP>
            We change these terms from time to time. The version that applies to your order is the
            one published when you placed it, and we keep the date of the last change at the top of
            this page. If a clause is found unenforceable, the rest continues to apply.
          </DocP>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/terms" />
    </>
  );
}
