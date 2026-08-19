import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { env, hasSupabase } from '@/lib/env';

/* ==========================================================================
   VAYRO — Proxy (Next.js 16; the file formerly known as middleware).

   Two jobs, both cheap:

   1. Refresh the Supabase auth cookie. Server Components cannot write cookies,
      so without this pass a session silently expires mid-visit.
   2. Optimistically redirect the signed-out away from /account and /admin, and
      the signed-in away from the auth screens.

   This is an *optimisation*, not the security boundary. Every protected screen
   re-checks server-side via `requireUser()` / `requireAdmin()` in
   `src/lib/auth.ts`; role is never inferred here.

   Runs on the Node.js runtime — Next.js 16 makes that the default for Proxy
   and rejects a `runtime` export outright.
   ========================================================================== */

/** Published to Server Components so `requireUser()` can build `?next=`. */
const PATH_HEADER = 'x-vayro-path'; // keep in sync with src/lib/auth.ts

/** Everything below these prefixes requires a session. */
const PROTECTED_PREFIXES = ['/account', '/admin'] as const;

/** Auth screens a signed-in visitor should never see. */
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'] as const;

function startsWithSegment(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  /** Rebuilt on every cookie write so the response carries the refreshed jar. */
  const build = () => {
    const headers = new Headers(request.headers);
    headers.set(PATH_HEADER, `${pathname}${search}`);
    return NextResponse.next({ request: { headers } });
  };

  let response = build();

  // Demo mode: no project, no session, nothing to guard. The account area
  // renders its labelled preview instead of bouncing the visitor to a sign-in
  // form that cannot work.
  if (!hasSupabase) return response;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          // Mutate the request jar first so the rebuilt response forwards the
          // fresh tokens to the render pass, then mirror them to the browser.
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = build();
          items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // Verifies the JWT with the Auth server and rotates the cookie when needed.
  // Do not replace with a cookie decode: it is the refresh that matters here.
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  /** Redirects must inherit the cookies the refresh just wrote. */
  const redirectTo = (url: URL) => {
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  const isProtected = PROTECTED_PREFIXES.some((prefix) => startsWithSegment(pathname, prefix));
  const isAuthRoute = AUTH_ROUTES.some((route) => startsWithSegment(pathname, route));

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', `${pathname}${search}`);
    return redirectTo(url);
  }

  if (isAuthRoute && user) {
    const requested = request.nextUrl.searchParams.get('next');
    const url = request.nextUrl.clone();
    // Only ever follow a same-origin, absolute path — never an attacker's host.
    url.pathname = requested && requested.startsWith('/') && !requested.startsWith('//')
      ? requested.split('?')[0]
      : '/account';
    url.search = '';
    return redirectTo(url);
  }

  return response;
}

export const config = {
  /**
   * Everything except build output, API routes and static assets. Static files
   * must be excluded or the auth pass would sit in front of every stylesheet,
   * image and font on the site.
   */
  matcher: [
    '/((?!api/|_next/static|_next/image|brand/|media/|models/|favicon\\.ico|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico|glb|gltf|mp4|webm|woff2?|txt|xml)$).*)',
  ],
};
