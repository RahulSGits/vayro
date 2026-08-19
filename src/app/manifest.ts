import type { MetadataRoute } from 'next';
import { palette } from '@/lib/design-tokens';
import { SITE } from '@/lib/seo';

/* ==========================================================================
   Web app manifest.

   Installed, VAYRO opens as the catalogue — not as a chrome-less browser.
   The theme colour is ink so the status bar reads as the header does; the
   background is ivory so the launch splash matches the light surface the
   storefront opens on.

   Icons come from the generated brand set: the squared mark for the platform
   default, the round cut for maskable targets that will crop it themselves.
   ========================================================================== */

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${SITE.name} — ${SITE.strapline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    lang: 'en-IN',
    dir: 'ltr',
    background_color: palette.ivory,
    theme_color: palette.ink,
    categories: ['shopping', 'lifestyle', 'travel'],
    icons: [
      {
        src: '/brand/png/vayro-app-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/png/vayro-app-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/brand/png/vayro-app-icon-round-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Shop', short_name: 'Shop', url: '/shop', description: 'The current range' },
      {
        name: 'Collections',
        short_name: 'Collections',
        url: '/collections',
        description: 'Equipment grouped by intent',
      },
      { name: 'Bag', short_name: 'Bag', url: '/cart', description: 'Your bag' },
    ],
  };
}
