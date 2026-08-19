import Link from 'next/link';
import { ButtonLink } from '@/components/ui/Button';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   404 — the root not-found document.

   Handles both `notFound()` thrown in a segment without its own not-found
   file and any URL the router never matched. It renders inside the root
   layout, so the header, footer and theme are already in place; this page
   only has to own the space between them.

   Everything here is above the fold, so — as with the site's hero sections —
   nothing is wrapped in a scroll-triggered reveal. A recovery surface must
   never depend on an intersection observer to become legible.

   The tone is the brand's: state the fact, then hand back the map. No apology
   theatre, no illustration of a lost hiker.
   ========================================================================== */

/** The primary destinations, mirroring the header's index. */
const DESTINATIONS = [
  { href: '/shop', label: 'Shop', note: 'The current range, in full' },
  { href: '/collections', label: 'Collections', note: 'Equipment grouped by intent' },
  { href: '/technology', label: 'Technology', note: 'Materials, construction, testing' },
  { href: '/journal', label: 'Journal', note: 'Field notes and route writing' },
] as const;

export default function NotFound() {
  return (
    <div className="shell section">
      <div className="grid-12 items-start gap-y-16">
        {/* --------------------------------------------------------- statement */}
        <div className="col-span-4 md:col-span-8 lg:col-span-7">
          <p className="t-label-sm flex items-center gap-3 text-[var(--fg-subtle)]">
            <VayroMark size={14} />
            <span>Error 404</span>
          </p>

          <h1 className="t-display-lg t-balance mt-7 max-w-[14ch]">
            This route doesn&rsquo;t exist yet.
          </h1>

          <p className="t-body-lg t-pretty mt-8 max-w-[var(--max-text)] text-[var(--fg-muted)]">
            The address you followed leads nowhere on this site. It may have been retired, or a
            character may have gone missing on the way here. Everything we make is a short list —
            the way back is a click away.
          </p>

          <div className="mt-11 flex flex-wrap gap-3">
            <ButtonLink href="/shop" size="lg">
              Shop everything
            </ButtonLink>
            <ButtonLink href="/" variant="secondary" size="lg">
              Return home
            </ButtonLink>
          </div>
        </div>

        {/* ------------------------------------------------------------- index */}
        <div className="col-span-4 md:col-span-8 lg:col-span-4 lg:col-start-9">
          <p className="t-label-sm text-[var(--fg-subtle)]">Elsewhere</p>
          <ul className="mt-6">
            {DESTINATIONS.map((destination) => (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  className="group flex items-baseline justify-between gap-6 border-t border-[var(--border)] py-5 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--border-strong)]"
                >
                  <span className="flex flex-col gap-1.5">
                    <span className="t-h3">{destination.label}</span>
                    <span className="t-caption text-[var(--fg-muted)]">{destination.note}</span>
                  </span>
                  <span
                    aria-hidden
                    className="t-spec text-[var(--fg-subtle)] transition-transform duration-[var(--d-fast)] ease-[var(--e-out)] group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="t-caption t-pretty mt-8 border-t border-[var(--border)] pt-6 text-[var(--fg-muted)]">
            Looking for a specific piece? Search is in the header, and{' '}
            <Link
              href="/faq"
              className="underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--fg)]"
            >
              the FAQ
            </Link>{' '}
            answers most of what arrives by email.
          </p>
        </div>
      </div>
    </div>
  );
}
