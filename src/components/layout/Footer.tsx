import Link from 'next/link';
import { VayroLockup } from '@/components/brand';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { formatPrice } from '@/lib/utils';

/**
 * Mirrors SHIPPING_FREE_THRESHOLD in @/store/cart. The store is a client
 * module, so its exports cannot be read from this server component — keep the
 * two in step if the threshold ever moves.
 */
const FREE_SHIPPING_THRESHOLD = 500000;

/* ==========================================================================
   Footer — the closing page of the catalogue.

   Server-rendered: the only client code below the fold is the newsletter
   field. Icons are drawn inline so the footer ships no icon runtime.
   ========================================================================== */

type Column = { title: string; links: { href: string; label: string }[] };

const COLUMNS: Column[] = [
  {
    title: 'Shop',
    links: [
      { href: '/shop', label: 'All equipment' },
      { href: '/shop?category=jackets', label: 'Jackets' },
      { href: '/shop?category=outerwear', label: 'Outerwear' },
      { href: '/shop?category=travel', label: 'Travel' },
      { href: '/collections', label: 'Collections' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/story', label: 'Story' },
      { href: '/technology', label: 'Technology' },
      { href: '/journal', label: 'Journal' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/shipping', label: 'Shipping' },
      { href: '/returns', label: 'Returns & exchanges' },
      { href: '/size-guide', label: 'Size guide' },
      { href: '/care', label: 'Care & repair' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/cookies', label: 'Cookies' },
      { href: '/legal/accessibility', label: 'Accessibility' },
    ],
  },
];

const SOCIAL = [
  { href: 'https://www.instagram.com/vayro', label: 'Instagram', path: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5v.01' },
  { href: 'https://www.youtube.com/@vayro', label: 'YouTube', path: 'M2 8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Zm8 .8v6.4l6-3.2-6-3.2Z' },
  { href: 'https://www.pinterest.com/vayro', label: 'Pinterest', path: 'M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.3-5.4s-.3-.6-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.6 0 1-.6 2.4-1 3.7-.3 1.1.6 2 1.6 2 2 0 3.4-2.5 3.4-5.5 0-2.3-1.5-4-4.4-4a5 5 0 0 0-5.2 5c0 1 .3 1.7.7 2.2.2.2.2.3.1.6l-.2.8c-.1.3-.3.4-.6.2-1.4-.6-2-2.1-2-3.9 0-2.9 2.4-6.4 7.3-6.4 3.9 0 6.5 2.8 6.5 5.9 0 4-2.3 7-5.6 7-1.1 0-2.2-.6-2.6-1.3l-.7 2.8c-.2.9-.8 2-1.2 2.6A10 10 0 1 0 12 2Z' },
] as const;

const TRUST = [
  {
    title: 'Secure checkout',
    body: 'Encrypted payment. Card details never touch our servers.',
    path: 'M5 10V7a5 5 0 0 1 10 0v3M4 10h12v9H4z',
    viewBox: '0 0 20 20',
  },
  {
    title: 'Shipping',
    body: `Free over ${formatPrice(FREE_SHIPPING_THRESHOLD)}. Dispatched within two working days.`,
    path: 'M1 5h10v9H1zM11 8h4l3 3v3h-7zM5 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M13 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
    viewBox: '0 0 20 20',
  },
  {
    title: 'Returns',
    body: 'Unworn, with tags, within 30 days of delivery.',
    path: 'M3 8a7 7 0 1 1 1.5 4.4M3 3v5h5',
    viewBox: '0 0 20 20',
  },
  {
    title: '30-day exchanges',
    body: 'Wrong size is not a wrong purchase. Swap it once, on us.',
    path: 'M3 6h11l-3-3M17 14H6l3 3',
    viewBox: '0 0 20 20',
  },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden border-t border-[var(--border)] bg-[var(--bg-sunken)]">
      {/* Ambient contour — deliberately at the edge of perception. */}
      <div aria-hidden className="contour pointer-events-none absolute inset-0 opacity-40" />

      <div className="shell relative">
        {/* ------------------------------------------------------ dispatch */}
        <section className="grid-12 section-tight items-end">
          <div className="col-span-4 md:col-span-6 lg:col-span-5">
            <p className="t-label-sm text-[var(--fg-subtle)]">Dispatch</p>
            <h2 className="t-display-md t-balance mt-5">
              Field notes,
              <br />
              occasionally.
            </h2>
            <p className="t-body-sm t-pretty mt-5 max-w-sm text-[var(--fg-muted)]">
              New equipment, material research and route notes. Sent when there is
              something worth sending.
            </p>
          </div>
          <div className="col-span-4 md:col-span-6 lg:col-span-6 lg:col-start-7">
            <NewsletterForm source="footer" />
          </div>
        </section>

        <hr className="rule" />

        {/* -------------------------------------------------------- index */}
        <section className="grid-12 py-14 md:py-16">
          <div className="col-span-4 md:col-span-6 lg:col-span-3">
            <Link href="/" aria-label="VAYRO — home" className="inline-flex">
              <VayroLockup variant="stacked" cap={18} className="text-[var(--fg)]" />
            </Link>
            <p className="t-spec mt-6 max-w-[16rem] text-[var(--fg-subtle)]">
              Outerwear and carry systems for the way forward.
            </p>
          </div>

          <nav
            aria-label="Footer"
            className="col-span-4 mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-6 md:mt-0 lg:col-span-8 lg:col-start-5 lg:grid-cols-4"
          >
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="t-label-sm text-[var(--fg-subtle)]">{column.title}</h3>
                <ul className="mt-5 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        data-cursor="link"
                        className="t-body-sm group relative inline-block text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]"
                      >
                        {link.label}
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 left-0 h-px w-full origin-right scale-x-0 bg-[var(--fg)] transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:origin-left group-hover:scale-x-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>

        <hr className="rule" />

        {/* --------------------------------------------------------- trust */}
        <section aria-label="Service" className="grid grid-cols-1 gap-px bg-[var(--border)] py-px sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map((item) => (
            <div key={item.title} className="flex items-start gap-4 bg-[var(--bg-sunken)] py-8 pr-6">
              <svg
                viewBox={item.viewBox}
                width={20}
                height={20}
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                strokeLinecap="square"
                strokeLinejoin="miter"
                aria-hidden
                focusable="false"
                className="mt-0.5 shrink-0 text-[var(--fg-subtle)]"
              >
                <path d={item.path} />
              </svg>
              <div>
                <h3 className="t-label-sm text-[var(--fg)]">{item.title}</h3>
                <p className="t-caption t-pretty mt-2 max-w-[22ch] text-[var(--fg-muted)]">{item.body}</p>
              </div>
            </div>
          ))}
        </section>

        <hr className="rule" />

        {/* ----------------------------------------------------- fine print */}
        <section className="flex flex-col gap-8 py-10 lg:flex-row lg:items-center lg:justify-between">
          <p className="t-label order-2 text-[var(--fg)] lg:order-1">Engineered for the way forward</p>

          <ul className="order-1 flex items-center gap-1 lg:order-2">
            {SOCIAL.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`VAYRO on ${item.label}`}
                  data-cursor="link"
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width={17}
                    height={17}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.1}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    aria-hidden
                    focusable="false"
                  >
                    <path d={item.path} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>

          <p className="t-caption order-3 text-[var(--fg-subtle)]">
            © {year} VAYRO. All rights reserved. Prices in INR, inclusive of tax.
          </p>
        </section>
      </div>
    </footer>
  );
}
