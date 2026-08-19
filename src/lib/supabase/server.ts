import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env, hasSupabase, serverEnv, hasServiceRole } from '@/lib/env';
import { createClient as createSbClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Request-scoped Supabase client that respects RLS. Null in demo mode. */
export async function createClient() {
  if (!hasSupabase) return null;
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component — middleware refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. Bypasses RLS — only ever call this from server code that
 * has already authorised the caller (see `requireAdmin`).
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();
  if (!hasSupabase || !hasServiceRole()) return null;
  return createSbClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
