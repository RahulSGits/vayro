import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
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
  title: 'Privacy',
  description:
    'What VAYRO collects, why, who processes it, how long it is kept and how to have it removed. Written to be read, not to be survived.',
  path: '/privacy',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'summary', title: 'The short version' },
  { id: 'collect', title: 'What we collect' },
  { id: 'why', title: 'Why we hold it' },
  { id: 'processors', title: 'Who processes it for us' },
  { id: 'browser', title: 'What stays in your browser' },
  { id: 'retention', title: 'How long we keep it' },
  { id: 'rights', title: 'Your rights' },
  { id: 'changes', title: 'Changes and contact' },
];

export default function PrivacyPage() {
  return (
    <>
      <DocHeader
        eyebrow="Legal"
        title="Privacy"
        lead="This describes what VAYRO holds about you, why we hold it, and how to make us stop. It is written in the same voice as the rest of the site, because a policy nobody can read protects nobody."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="summary" title="The short version">
          <DocLead>
            We collect what an order needs and what an account needs. We do not sell it, we do not
            trade it, and we do not build advertising profiles from it.
          </DocLead>
          <DocList
            items={[
              'We never see your card number. Payment details are entered into our payment provider’s own fields and are never transmitted to us.',
              'We never see your password. Authentication is handled by our platform provider, which stores a hash we cannot reverse.',
              'Marketing email is opt-in and stays opt-in. Unsubscribing takes one click and applies immediately.',
              'You can ask for a copy of everything we hold, or for all of it to be deleted, and we will do it.',
            ]}
          />
        </DocSection>

        <DocSection id="collect" title="What we collect">
          <DocDefinitions
            rows={[
              {
                term: 'Account',
                detail:
                  'Email address, and — if you supply them — your name and phone number. Your marketing preference. A password you set, which is stored as a hash by our platform provider and is never visible to us.',
              },
              {
                term: 'Orders',
                detail:
                  'The items, sizes and colourways ordered, the delivery and billing addresses you enter, the order status, and the carrier’s tracking reference.',
              },
              {
                term: 'Payment',
                detail:
                  'A payment reference from our payment provider, and the card brand and last four digits so a receipt is recognisable. Nothing that could be used to take a payment.',
              },
              {
                term: 'Newsletter',
                detail: 'Your email address, the page you subscribed from, and the fact that you consented.',
              },
              {
                term: 'Messages',
                detail:
                  'What you send through the contact form or by email: your name, address, subject, order reference and the message itself.',
              },
              {
                term: 'Technical',
                detail:
                  'Standard server logs — IP address, user agent, the page requested and when. These are what make abuse and rate limiting detectable.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="why" title="Why we hold it">
          <DocP>
            Every category above maps to one of four reasons, and nothing is collected that does not
            map to one.
          </DocP>
          <DocDefinitions
            rows={[
              {
                term: 'To perform a contract',
                detail:
                  'Taking payment, picking and shipping an order, handling a return, answering a question about one. Without this data there is no order.',
              },
              {
                term: 'Because the law requires it',
                detail:
                  'Tax and accounting records have a statutory retention period that overrides a deletion request for the invoice itself.',
              },
              {
                term: 'Legitimate interest',
                detail:
                  'Keeping the site up, detecting fraud and abuse, and understanding in aggregate which pages people actually use. Narrow, and never a euphemism for advertising.',
              },
              {
                term: 'Your consent',
                detail:
                  'Marketing email, and analytics where the law requires consent for it. Withdrawn as easily as it was given.',
              },
            ]}
          />
        </DocSection>

        <DocSection id="processors" title="Who processes it for us">
          <DocP>
            We use a small number of providers, each for one job. They act on our instructions and
            may not use your data for their own purposes.
          </DocP>
          <DocDefinitions
            rows={[
              {
                term: 'Database and authentication',
                detail:
                  'Stores accounts, orders, addresses and reviews, and issues the session that keeps you signed in.',
              },
              {
                term: 'Payments',
                detail:
                  'Collects and processes card details directly. It is a payment processor in its own right, with its own privacy notice, and it — not we — holds your card data.',
              },
              {
                term: 'Transactional email',
                detail:
                  'Sends order confirmations, dispatch notices and password resets. It receives your email address and the contents of that message.',
              },
              {
                term: 'Product analytics',
                detail:
                  'Records page views and a fixed set of storefront events. Autocapture is switched off, so it records the events we have declared and nothing else. Identified profiles are created only for signed-in users.',
              },
              {
                term: 'Hosting and CDN',
                detail: 'Serves the site and keeps the server logs described above.',
              },
            ]}
          />
          <DocNote title="Transfers outside India">
            <p>
              Some of these providers run infrastructure outside India. Where personal data is
              transferred, it moves under the provider’s own contractual safeguards. If you would
              like the current list of providers and the regions they operate in, ask at{' '}
              <a
                href={`mailto:${CONTACT.privacy}`}
                className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
              >
                {CONTACT.privacy}
              </a>{' '}
              and we will send it.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="browser" title="What stays in your browser">
          <DocP>
            Three things live in your browser’s local storage and are never transmitted to us: your
            basket before checkout, your wishlist, and your light-or-dark preference. Clearing site
            data removes all three, and nothing on our side changes.
          </DocP>
          <DocP>
            The cookies this site sets, what each one does and how to refuse them are listed in
            full on the{' '}
            <Link
              href="/cookies"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              cookies page
            </Link>
            .
          </DocP>
        </DocSection>

        <DocSection id="retention" title="How long we keep it">
          <DocDefinitions
            rows={[
              { term: 'Account', detail: 'Until you delete the account, or ask us to.' },
              {
                term: 'Orders and invoices',
                detail:
                  'Eight years, which is the statutory retention period for accounting records. Deleting an account does not delete an invoice — the law will not allow it.',
              },
              { term: 'Newsletter', detail: 'Until you unsubscribe, then a suppression record so we do not mail you again by accident.' },
              { term: 'Contact messages', detail: 'Two years, then deleted.' },
              { term: 'Server logs', detail: 'Ninety days.' },
              { term: 'Analytics events', detail: 'Twelve months, then aggregated beyond recovery.' },
            ]}
          />
        </DocSection>

        <DocSection id="rights" title="Your rights">
          <DocP>
            Under India’s Digital Personal Data Protection Act, and under the GDPR if you are in the
            EU or the UK, you can ask us to do any of the following. We do not charge for it, and we
            answer within thirty days.
          </DocP>
          <DocList
            items={[
              'Access — a copy of everything we hold about you.',
              'Correct — fix anything wrong or out of date. Your name, phone number and addresses can also be edited directly in your account.',
              'Delete — remove your account and personal data, except records the law requires us to keep.',
              'Object and restrict — tell us to stop a particular use, including any processing based on legitimate interest.',
              'Portability — the same copy, in a machine-readable format.',
              'Withdraw consent — unsubscribe from marketing, or refuse analytics, at any time and without consequence to your order.',
            ]}
          />
          <DocP>
            Write to{' '}
            <a
              href={`mailto:${CONTACT.privacy}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.privacy}
            </a>
            . If you are unhappy with how we handle a request, you may complain to your data
            protection authority — in India, the Data Protection Board.
          </DocP>
        </DocSection>

        <DocSection id="changes" title="Changes and contact">
          <DocP>
            When this notice changes materially we date the change at the top of the page and, if
            the change affects how we use data you have already given us, we email account holders
            before it takes effect. We do not make a material change quietly.
          </DocP>
          <DocP>
            VAYRO is the data controller for everything described here. Questions, requests and
            complaints all go to{' '}
            <a
              href={`mailto:${CONTACT.privacy}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.privacy}
            </a>
            .
          </DocP>
          <DocNote title="Children">
            <p>
              This shop is not intended for anyone under 18, and we do not knowingly hold data about
              children. If you believe we have, tell us and it will be deleted the same day.
            </p>
          </DocNote>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/privacy" />
    </>
  );
}
