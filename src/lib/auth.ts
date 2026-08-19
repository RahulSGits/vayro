import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabase } from '@/lib/env';
import type { Profile, Role } from '@/types';

/* ==========================================================================
   VAYRO — server-side authentication and authorisation.

   Three rules this module exists to enforce:

   1. Identity is read with `supabase.auth.getUser()`, never from a decoded
      cookie. `getUser()` revalidates the JWT against the Auth server, so a
      forged or stale token cannot promote a request.
   2. Authorisation is a *data* check, not a routing check. `requireAdmin()`
      reads `profiles.role` under RLS on the server. Hiding a route never
      grants or withholds access — the proxy redirect is an optimisation for
      the signed-out case only.
   3. Nothing here throws at import time. With no Supabase credentials the app
      runs in demo mode: the account area renders a clearly-labelled preview
      and every mutation is refused with an explanation.
   ========================================================================== */

/** Set by `src/proxy.ts` so server components can rebuild the current URL. */
const PATH_HEADER = 'x-vayro-path';

export interface SessionUser {
  id: string;
  email: string;
  /** From `user_metadata.full_name` — the profile row is authoritative. */
  metadataName: string | null;
  emailConfirmed: boolean;
  /** 'email', 'google', 'apple', … Used to hide password controls for OAuth. */
  provider: string;
  createdAt: string;
  lastSignInAt: string | null;
}

export type AuthMode = 'live' | 'demo';

export interface AuthContext {
  user: SessionUser;
  profile: Profile;
  mode: AuthMode;
  /** Convenience mirror of `mode === 'demo'` for JSX conditions. */
  demo: boolean;
}

/* ------------------------------------------------------------------ demo -- */

/**
 * True when no Supabase project is configured. Demo mode is a *preview*: the
 * account screens render with synthetic, labelled data so the design can be
 * evaluated, and every write is refused rather than faked.
 */
export function isDemoAuth(): boolean {
  return !hasSupabase;
}

export const DEMO_USER: SessionUser = {
  id: 'demo-user',
  email: 'demo@vayro.example',
  metadataName: 'Demo Account',
  emailConfirmed: true,
  provider: 'email',
  createdAt: '2026-01-09T09:00:00.000Z',
  lastSignInAt: '2026-08-18T07:40:00.000Z',
};

export const DEMO_PROFILE: Profile = {
  id: DEMO_USER.id,
  email: DEMO_USER.email,
  fullName: 'Demo Account',
  phone: null,
  role: 'customer',
  marketingOptIn: true,
  createdAt: DEMO_USER.createdAt,
};

const DEMO_CONTEXT: AuthContext = {
  user: DEMO_USER,
  profile: DEMO_PROFILE,
  mode: 'demo',
  demo: true,
};

/** The exact configuration a developer is missing when demo mode is active. */
export const REQUIRED_AUTH_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const;

/* --------------------------------------------------------------- session -- */

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: { provider?: string | null } | null;
  user_metadata?: { full_name?: string | null } | null;
};

function toSessionUser(user: SupabaseAuthUser): SessionUser {
  return {
    id: user.id,
    email: user.email ?? '',
    metadataName: user.user_metadata?.full_name ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at ?? user.confirmed_at),
    provider: user.app_metadata?.provider ?? 'email',
    createdAt: user.created_at ?? new Date(0).toISOString(),
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

/**
 * The verified user for this request, or null. Cached per-request so a layout
 * and five nested segments cost one round trip.
 *
 * Returns null in demo mode — there is no session to have. Screens that want a
 * preview call `requireUser()`, which supplies the labelled demo context.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  if (isDemoAuth()) return null;
  const sb = await createClient();
  if (!sb) return null;

  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  return toSessionUser(data.user as SupabaseAuthUser);
});

/**
 * The signed-in customer's profile row. Falls back to a projection of the auth
 * user when the row has not been created yet (the `handle_new_user` trigger
 * normally does this, but a project restored from backup may lag).
 */
export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSession();
  if (!user) return null;

  const sb = await createClient();
  if (!sb) return null;

  const { data } = await sb
    .from('profiles')
    .select('id, email, full_name, phone, role, marketing_opt_in, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const row = data as unknown as {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: Role;
    marketing_opt_in: boolean;
    created_at: string;
  } | null;

  if (!row) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.metadataName,
      phone: null,
      role: 'customer',
      marketingOptIn: false,
      createdAt: user.createdAt,
    };
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role === 'admin' ? 'admin' : 'customer',
    marketingOptIn: Boolean(row.marketing_opt_in),
    createdAt: row.created_at,
  };
});

/** Session + profile in one call. Null when signed out on a live project. */
export const getAuthContext = cache(async (): Promise<AuthContext | null> => {
  if (isDemoAuth()) return DEMO_CONTEXT;
  const user = await getSession();
  if (!user) return null;
  const profile = await getProfile();
  if (!profile) return null;
  return { user, profile, mode: 'live', demo: false };
});

/* ---------------------------------------------------------------- guards -- */

/** Current path + query, published by the proxy, for `?next=` round-trips. */
export async function currentPath(fallback = '/account'): Promise<string> {
  const store = await headers();
  const value = store.get(PATH_HEADER);
  return value && value.startsWith('/') ? value : fallback;
}

/**
 * Gate for every `/account` screen. Redirects to the sign-in page, preserving
 * the destination, when there is no verified session.
 */
export async function requireUser(options: { next?: string } = {}): Promise<AuthContext> {
  const context = await getAuthContext();
  if (context) return context;
  const next = options.next ?? (await currentPath());
  redirect(`/login?next=${encodeURIComponent(next)}`);
}

/**
 * Gate for every `/admin` screen. The role is read server-side from the
 * `profiles` table under RLS — the client cannot influence the outcome, and a
 * customer who types the URL is redirected out with an explicit reason.
 *
 * In demo mode (no Supabase project at all) the admin preview is allowed:
 * there is no database, no user and no real data to protect, and the screens
 * label themselves as demo. The moment credentials exist, the real role check
 * is the only thing that grants access.
 */
export async function requireAdmin(options: { next?: string } = {}): Promise<AuthContext> {
  if (isDemoAuth()) return { ...DEMO_CONTEXT, profile: { ...DEMO_PROFILE, role: 'admin' } };

  const context = await getAuthContext();
  if (!context) {
    const next = options.next ?? (await currentPath('/admin'));
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  if (context.profile.role !== 'admin') redirect('/account?notice=admin-only');
  return context;
}

/** Read-only variant for conditional UI (e.g. an "Admin" link in the nav). */
export async function isAdmin(): Promise<boolean> {
  const context = await getAuthContext();
  return context?.profile.role === 'admin';
}

/* ------------------------------------------------------------- providers -- */

export type OAuthProviderId = 'google' | 'apple';

export interface OAuthProvider {
  id: OAuthProviderId;
  label: string;
  /** False renders the button disabled with the reason below. */
  enabled: boolean;
  /** Plain-language explanation shown in the tooltip when disabled. */
  reason: string;
}

/**
 * Which social providers to offer. Supabase does not expose its enabled
 * provider list to the client, so the storefront is told explicitly:
 *
 *   NEXT_PUBLIC_AUTH_PROVIDERS="google,apple"
 *
 * set alongside the provider's client ID and secret in the Supabase dashboard
 * (Authentication → Providers). Anything not listed renders as a disabled
 * button with the reason attached, rather than a control that fails on click.
 */
export function getOAuthProviders(): OAuthProvider[] {
  const configured = new Set(
    (process.env.NEXT_PUBLIC_AUTH_PROVIDERS ?? '')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  const reasonFor = (id: OAuthProviderId, label: string) => {
    if (!hasSupabase) {
      return `Sign in with ${label} needs a Supabase project. Set ${REQUIRED_AUTH_ENV.join(' and ')}.`;
    }
    return `${label} is not enabled yet. Add the provider in Supabase → Authentication → Providers, then list "${id}" in NEXT_PUBLIC_AUTH_PROVIDERS.`;
  };

  return (
    [
      { id: 'google' as const, label: 'Google' },
      { id: 'apple' as const, label: 'Apple' },
    ] satisfies { id: OAuthProviderId; label: string }[]
  ).map(({ id, label }) => ({
    id,
    label,
    enabled: hasSupabase && configured.has(id),
    reason: reasonFor(id, label),
  }));
}
