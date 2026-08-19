import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { CONTACT } from '../_components/documents';
import { ContactForm } from '../_components/ContactForm';
import {
  DocBody,
  DocDefinitions,
  DocFooter,
  DocHeader,
  DocLead,
  DocList,
  DocNote,
  DocP,
  DocSection,
} from '../_components/Doc';

export const metadata: Metadata = buildMetadata({
  title: 'Contact',
  description:
    'Reach the VAYRO studio. Email or the form below; replies within two working days, Monday to Friday.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <>
      <DocHeader
        eyebrow="Support"
        title="Contact"
        lead="A small studio answering its own email. No ticket queue, no chatbot, and nobody reading from a script."
        updated="2026-06-24"
      />

      <DocBody>
        <DocSection id="direct" title="Reach us directly">
          <DocLead>
            Email is the fastest route, and it is the one a person actually watches.
          </DocLead>
          <DocDefinitions
            rows={[
              {
                term: 'General and orders',
                detail: (
                  <a
                    href={`mailto:${CONTACT.general}`}
                    className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                  >
                    {CONTACT.general}
                  </a>
                ),
              },
              {
                term: 'Privacy and data',
                detail: (
                  <a
                    href={`mailto:${CONTACT.privacy}`}
                    className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                  >
                    {CONTACT.privacy}
                  </a>
                ),
              },
              { term: 'Studio hours', detail: CONTACT.hours },
              {
                term: 'Reply time',
                detail: `Within ${CONTACT.responseTarget}. Weekend messages are answered on Monday.`,
              },
            ]}
          />
        </DocSection>

        <DocSection id="faster" title="Faster than writing to us">
          <DocP>
            Four questions make up most of the inbox, and all four are already answered in full.
          </DocP>
          <DocList
            items={[
              <>
                Which size?{' '}
                <Link
                  href="/size-guide"
                  className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                >
                  Body measurements, XS to XXL
                </Link>
                .
              </>,
              <>
                Where is my order?{' '}
                <Link
                  href="/account/orders"
                  className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                >
                  Tracking sits on the order itself
                </Link>
                .
              </>,
              <>
                Sending something back?{' '}
                <Link
                  href="/returns"
                  className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                >
                  Returns and exchanges
                </Link>
                .
              </>,
              <>
                Stopped beading?{' '}
                <Link
                  href="/care"
                  className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
                >
                  Care and repair
                </Link>
                .
              </>,
            ]}
          />
        </DocSection>

        <DocSection id="form" title="Write to the studio">
          <DocP>
            Everything marked required is required because we cannot answer without it. The order
            reference is optional, but including it turns a three-message thread into one.
          </DocP>

          <ContactForm className="mt-4" />

          <DocNote title="Press and partnerships">
            <p>
              Choose the press or wholesale option above and tell us what you are working on and
              when it runs. Product samples, high-resolution imagery and the brand assets are all
              available; press mail is answered on the same target as everything else.
            </p>
          </DocNote>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/contact" />
    </>
  );
}
