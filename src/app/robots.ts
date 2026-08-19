import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';

/* ==========================================================================
   robots.txt

   The storefront is open; everything that is private, transactional or
   machine-facing is not. Four prefixes are closed:

     /admin     — operator surface, session-gated
     /account   — customer surface, session-gated
     /api       — route handlers and webhooks, never a landing page
     /checkout  — a funnel step, worthless as a search result

   Robots matching is prefix-based, so `/admin` closes every descendant.
   Nothing here is a security control — proxy.ts and RLS do that work. This
   only keeps thin, private and duplicate URLs out of the index.
   ========================================================================== */

const DISALLOWED = ['/admin', '/account', '/api', '/checkout'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOWED,
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
