'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env, hasSupabase } from '@/lib/env';
import type { Database } from './types';

/** Browser Supabase client. Returns null in demo mode — callers must handle it. */
export function createClient() {
  if (!hasSupabase) return null;
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
