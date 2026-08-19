import { permanentRedirect } from 'next/navigation';

/**
 * The terms of sale used to live under /legal. It now sits beside the rest of
 * the support documents at /terms, so this route keeps the old address
 * working — footers, receipts and signup pages linked here for a long time,
 * and a printed link is not something you can go back and edit.
 */
export default function LegalRedirect(): never {
  permanentRedirect('/terms');
}
