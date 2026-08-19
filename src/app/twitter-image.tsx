/* ==========================================================================
   Twitter / X card.

   The same generated card as `opengraph-image.tsx` — one drawing, two
   conventions. Declaring the file is what makes X use the 1200×630 brand card
   instead of the lockup PNG named in the root layout's `twitter.images`,
   which crops badly at summary_large_image proportions.

   If the two cards ever need to diverge, replace the re-export with its own
   `ImageResponse` rather than parameterising the shared one.
   ========================================================================== */

export { default, alt, size, contentType } from './opengraph-image';
