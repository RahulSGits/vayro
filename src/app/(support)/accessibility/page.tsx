import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo';
import { CONTACT } from '../_components/documents';
import {
  DocBody,
  DocContents,
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
  title: 'Accessibility',
  description:
    'Our accessibility target, what is in place across the storefront, what is not yet done, and how to tell us when something blocks you.',
  path: '/accessibility',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'target', title: 'What we are aiming at' },
  { id: 'in-place', title: 'What is in place' },
  { id: 'gaps', title: 'What is not done' },
  { id: 'report', title: 'Telling us about a problem' },
];

export default function AccessibilityPage() {
  return (
    <>
      <DocHeader
        eyebrow="Legal"
        title="Accessibility"
        lead="This is a statement of where the site actually is, not a badge. It lists what works, what does not, and what we are doing about the second list."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="target" title="What we are aiming at">
          <DocLead>
            WCAG 2.2 at Level AA, across the whole storefront — not only the pages that are easy to
            get there.
          </DocLead>
          <DocP>
            We test with a keyboard on every release, and with VoiceOver on Safari and NVDA on
            Firefox on the flows that matter most: finding a product, choosing a size, checking out,
            and reading an order. We are not claiming a formal third-party audit, because we have
            not had one. When we do, this page will say so and will link to the report.
          </DocP>
        </DocSection>

        <DocSection id="in-place" title="What is in place">
          <DocList
            items={[
              'Every interactive element is reachable and operable with a keyboard alone, in an order that matches the visual layout.',
              'Focus is always visible — a two-pixel outline offset from the element, never removed and never replaced with a colour change alone.',
              'A skip link is the first thing in the tab order on every page.',
              'Headings are real headings and describe the structure of the page rather than its type sizes. Landmarks are used as intended.',
              'Dialogs and drawers trap focus while open, close on Escape, and return focus to whatever opened them.',
              'Status messages — a size added to a basket, a form that failed to send — are announced through a polite live region rather than stealing focus.',
              'Every meaningful image carries a description; decorative plates are hidden from assistive technology instead of being narrated.',
              'The full interface honours prefers-reduced-motion: scroll-linked effects, masked reveals and parallax all stop, and nothing depends on movement to be understood.',
              'Light and dark are both first-class. Text and interface colours are drawn from tokens chosen to hold contrast in either.',
              'Data tables use real headers and scope, and scroll horizontally inside their own container rather than compressing figures.',
              'Text reflows to 400% zoom without a horizontal scrollbar on the page body.',
            ]}
          />
        </DocSection>

        <DocSection id="gaps" title="What is not done">
          <DocP>
            Being specific here is more useful than a general commitment, so these are the known
            gaps as of the date at the top of this page.
          </DocP>
          <DocList
            items={[
              'The three-dimensional product viewer is a visual enhancement and is not a substitute for the rest of the page. Every fact it shows — dimensions, construction, colourways — is also in the specification table and the photography, and the viewer is not required to complete a purchase.',
              'Some long-form editorial pages use scroll-driven typography. The content is fully present and readable without any of it, but the reading order on those pages is best experienced linearly.',
              'We have not yet published a formal VPAT or third-party audit report.',
              'A small number of admin screens have not been through the same keyboard testing as the storefront. They are not part of the shopping experience, but they should be held to the same standard and are not yet.',
            ]}
          />
          <DocNote title="If something here blocks you today">
            <p>
              Do not work around it — tell us, and we will complete whatever you were trying to do
              by email while we fix the underlying problem. Ordering by email is a normal thing to
              do here, not a favour.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="report" title="Telling us about a problem">
          <DocP>
            Write to{' '}
            <a
              href={`mailto:${CONTACT.general}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.general}
            </a>{' '}
            or use the{' '}
            <Link
              href="/contact"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              contact form
            </Link>
            . The page address, the browser and assistive technology you were using, and what you
            expected to happen are the three things that make a report actionable.
          </DocP>
          <DocP>
            We acknowledge accessibility reports within {CONTACT.responseTarget} and treat anything
            that blocks a purchase as the highest priority in the queue — ahead of new features,
            without exception.
          </DocP>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/accessibility" />
    </>
  );
}
