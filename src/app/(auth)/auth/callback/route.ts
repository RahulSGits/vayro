import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/* ==========================================================================
   /auth/callback

   The single landing point for every out-of-band credential Supabase issues:
   the PKCE `code` from an OAuth round trip, and the `token_hash` from a
   confirmation, recovery, invite or email-change message.

   It exchanges the one-time value for a cookie session and forwards to the
   requested destination. It never trusts `next` beyond "same-origin absolute
   path" — an open redirect here would hand a session to another host.
   ========================================================================== */

const OTP_TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

function failure(request: NextRequest, reason: string) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  url.searchParams.set('notice', 'callback-failed');
  // Kept out of the visible copy; useful when reading server logs.
  console.warn('[vayro:auth] callback rejected —', reason);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get('next'));

  // Supabase reports provider-side failures on the query string.
  const providerError = params.get('error_description') ?? params.get('error');
  if (providerError) return failure(request, providerError);

  const supabase = await createClient();
  if (!supabase) return failure(request, 'no supabase project configured');

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(request, error.message);
    const url = request.nextUrl.clone();
    url.pathname = next;
    url.search = '';
    return NextResponse.redirect(url);
  }

  const tokenHash = params.get('token_hash');
  const rawType = params.get('type');
  const type = OTP_TYPES.find((candidate) => candidate === rawType);

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) return failure(request, error.message);
    const url = request.nextUrl.clone();
    // A recovery link must always land on the form that changes the password,
    // whatever `next` claims — otherwise the session silently goes unused.
    url.pathname = type === 'recovery' ? '/reset-password' : next;
    url.search = '';
    return NextResponse.redirect(url);
  }

  return failure(request, 'no code or token_hash on the callback URL');
}
