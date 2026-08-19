import { permanentRedirect } from 'next/navigation';

/**
 * The accessibility statement used to live under /legal. It now sits beside the rest of
 * the support documents at /accessibility, so this route keeps the old address
 * working — footers, receipts and signup pages linked here for a long time,
 * and a printed link is not something you can go back and edit.
 */
export default function LegalRedirect(): never {
  permanentRedirect('/accessibility');
}
