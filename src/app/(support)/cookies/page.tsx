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
  DocTable,
  type DocSectionRef,
} from '../_components/Doc';

export const metadata: Metadata = buildMetadata({
  title: 'Cookies',
  description:
    'Every cookie and storage item this site uses, what each one does, how long it lasts and how to refuse it.',
  path: '/cookies',
});

const SECTIONS: DocSectionRef[] = [
  { id: 'necessary', title: 'Strictly necessary' },
  { id: 'local', title: 'Stored in your browser only' },
  { id: 'analytics', title: 'Analytics' },
  { id: 'control', title: 'How to refuse or remove them' },
];

const NECESSARY = [
  {
    name: 'Session',
    purpose: 'Keeps you signed in and refreshes the session as you browse. Set only after you sign in.',
    duration: 'Until sign-out or expiry',
  },
  {
    name: 'Session refresh',
    purpose: 'Paired with the session cookie so a long visit does not silently sign you out mid-checkout.',
    duration: 'Until sign-out or expiry',
  },
];

const LOCAL = [
  { name: 'vayro.cart', purpose: 'Your basket before checkout, so it survives a refresh.', duration: 'Until cleared' },
  { name: 'vayro.wishlist', purpose: 'Pieces you have saved.', duration: 'Until cleared' },
  { name: 'vayro.theme', purpose: 'Whether you chose light, dark, or to follow the system.', duration: 'Until cleared' },
];

export default function CookiesPage() {
  return (
    <>
      <DocHeader
        eyebrow="Legal"
        title="Cookies"
        lead="A short list, because there is a short list. This site sets nothing for advertising, sells nothing to a data broker, and shows no consent wall for cookies it does not use."
        updated="2026-06-24"
      />

      <DocContents sections={SECTIONS} />

      <DocBody>
        <DocSection id="necessary" title="Strictly necessary">
          <DocLead>
            Two cookies, both from the authentication layer, and neither one set until you sign in.
          </DocLead>
          <DocTable
            caption="Strictly necessary cookies set by this site"
            columns={[
              { key: 'name', label: 'Cookie' },
              { key: 'purpose', label: 'What it does' },
              { key: 'duration', label: 'Lasts' },
            ]}
            rows={NECESSARY}
            rowHeaderKey="name"
            minWidth="36rem"
          />
          <DocP>
            These cannot be switched off while you are signed in, because they are what being signed
            in means. Browse and buy as a guest and no cookie is set at all.
          </DocP>
        </DocSection>

        <DocSection id="local" title="Stored in your browser only">
          <DocP>
            Three items live in your browser’s local storage. They are not cookies, they are never
            attached to a request, and they never reach our servers.
          </DocP>
          <DocTable
            caption="Local storage items used by this site"
            columns={[
              { key: 'name', label: 'Key' },
              { key: 'purpose', label: 'What it holds' },
              { key: 'duration', label: 'Lasts' },
            ]}
            rows={LOCAL}
            rowHeaderKey="name"
            minWidth="36rem"
          />
          <DocNote title="Clearing them is safe">
            <p>
              Clearing site data empties your basket, your wishlist and your theme choice, and
              nothing else. Orders, addresses and account details are held server-side and are
              untouched.
            </p>
          </DocNote>
        </DocSection>

        <DocSection id="analytics" title="Analytics">
          <DocP>
            When product analytics is enabled on a deployment of this site, it records page views
            and a fixed, declared list of storefront events — a product viewed, an item added to a
            basket, a checkout step reached. Automatic capture of every click and keystroke is
            switched off, so nothing outside that list is recorded.
          </DocP>
          <DocList
            items={[
              'No advertising or cross-site tracking cookies are set, by us or on our behalf.',
              'Identified profiles are created only for signed-in users. Everyone else is counted, not identified.',
              'Analytics is not required for anything on this site to work. Refusing it costs you nothing.',
            ]}
          />
          <DocP>
            What the analytics provider itself collects is described in{' '}
            <Link
              href="/privacy"
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              our privacy notice
            </Link>
            , under processors.
          </DocP>
        </DocSection>

        <DocSection id="control" title="How to refuse or remove them">
          <DocList
            ordered
            items={[
              'Browser settings — every major browser can block or clear cookies and site data per site. That is the most reliable control, and it applies to us as much as to anyone.',
              'Do Not Track and Global Privacy Control — we honour both signals for analytics.',
              'Sign out — the two session cookies are removed immediately.',
              'Clear site data — removes the local storage items listed above.',
            ]}
          />
          <DocP>
            Blocking the session cookies while signed in will sign you out and keep signing you out;
            everything else on the site continues to work. Questions about any of this go to{' '}
            <a
              href={`mailto:${CONTACT.privacy}`}
              className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.privacy}
            </a>
            .
          </DocP>
        </DocSection>
      </DocBody>

      <DocFooter exclude="/cookies" />
    </>
  );
}
