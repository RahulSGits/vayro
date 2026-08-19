/**
 * The support and legal index.
 *
 * One list, consumed by the sticky rail and by the "everything else" footer at
 * the end of each document, so a new page is added in exactly one place and
 * cannot go missing from half the site.
 */

export type SupportDoc = {
  href: string;
  label: string;
  /** One line, shown in the rail's expanded state and in the footer grid. */
  note: string;
};

export type SupportGroup = {
  title: string;
  items: SupportDoc[];
};

export const SUPPORT_GROUPS: SupportGroup[] = [
  {
    title: 'Support',
    items: [
      { href: '/shipping', label: 'Shipping', note: 'Dispatch windows, carriers, tracking and duties.' },
      { href: '/returns', label: 'Returns & exchanges', note: 'Thirty days, unworn, tags attached.' },
      { href: '/size-guide', label: 'Size guide', note: 'Body measurements in centimetres, XS to XXL.' },
      { href: '/care', label: 'Care & repair', note: 'Washing, reproofing and what not to do.' },
      { href: '/faq', label: 'FAQ', note: 'The questions we are actually asked.' },
      { href: '/contact', label: 'Contact', note: 'Reach a person at the studio.' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { href: '/terms', label: 'Terms of sale', note: 'Orders, pricing, delivery and liability.' },
      { href: '/privacy', label: 'Privacy', note: 'What we hold, why, and how to have it removed.' },
      { href: '/cookies', label: 'Cookies', note: 'Every cookie this site sets, and what it does.' },
      { href: '/accessibility', label: 'Accessibility', note: 'Our target, what is done, what is not.' },
    ],
  },
];

/** Flat list — used when the grouping is not needed. */
export const SUPPORT_DOCS: SupportDoc[] = SUPPORT_GROUPS.flatMap((group) => group.items);

/** The studio's published addresses. Kept here so every page quotes the same one. */
export const CONTACT = {
  general: 'hello@vayro.example',
  privacy: 'privacy@vayro.example',
  /** Working days, studio local time. */
  hours: 'Monday to Friday, 10:00–18:00 IST',
  responseTarget: 'two working days',
} as const;
