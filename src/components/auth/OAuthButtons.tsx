'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/States';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { safeNext } from './schemas';
import type { OAuthProvider, OAuthProviderId } from '@/lib/auth';

/* ==========================================================================
   OAuthButtons

   Both providers are always visible so the sign-in page never changes shape
   when configuration lands. An unconfigured provider renders disabled with the
   exact reason attached — a tooltip for the mouse, a description for the
   screen reader — rather than a live button that fails on click.
   ========================================================================== */

const GLYPH: Record<OAuthProviderId, React.ReactNode> = {
  google: (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden focusable="false">
      <path fill="currentColor" d="M21.6 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.33Z" opacity=".9" />
      <path fill="currentColor" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.22-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.75-5.59-4.11H3.08v2.58A10 10 0 0 0 12 22Z" opacity=".7" />
      <path fill="currentColor" d="M6.41 13.9a6 6 0 0 1 0-3.8V7.52H3.08a10 10 0 0 0 0 8.96l3.33-2.58Z" opacity=".55" />
      <path fill="currentColor" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2A10 10 0 0 0 3.08 7.52l3.33 2.58C7.2 7.73 9.4 5.98 12 5.98Z" opacity=".85" />
    </svg>
  ),
  apple: (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M16.36 12.72c-.02-2.32 1.9-3.44 1.98-3.5-1.08-1.58-2.76-1.8-3.36-1.82-1.43-.15-2.79.84-3.52.84-.72 0-1.84-.82-3.03-.8-1.56.02-3 .9-3.8 2.29-1.62 2.81-.41 6.97 1.16 9.25.77 1.12 1.68 2.37 2.88 2.33 1.16-.05 1.6-.75 3-.75s1.79.75 3.02.72c1.25-.02 2.04-1.13 2.8-2.25.88-1.29 1.25-2.54 1.27-2.6-.03-.01-2.43-.93-2.4-3.71ZM14.1 5.9c.64-.78 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.38-.59.69-1.11 1.79-.97 2.84 1.03.08 2.08-.52 2.71-1.3Z"
      />
    </svg>
  ),
};

export function OAuthButtons({
  providers,
  next,
  intent = 'Continue',
  className,
}: {
  providers: OAuthProvider[];
  next?: string;
  /** 'Continue' on sign-in, 'Sign up' on registration. */
  intent?: string;
  className?: string;
}) {
  const [pending, setPending] = useState<OAuthProviderId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: OAuthProviderId) {
    const supabase = createClient();
    if (!supabase) {
      setError('Authentication is not configured in this build.');
      return;
    }

    setPending(provider);
    setError(null);

    const destination = safeNext(next);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });

    // Success navigates away; only a failure ever gets back here.
    if (oauthError) {
      setPending(null);
      setError(oauthError.message);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid gap-3">
        {providers.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => start(provider.id)}
            disabled={!provider.enabled || pending !== null}
            title={provider.enabled ? undefined : provider.reason}
            aria-describedby={provider.enabled ? undefined : `oauth-${provider.id}-reason`}
            className={cn(
              't-label group relative inline-flex h-12 items-center justify-center gap-3 whitespace-nowrap',
              'border border-[var(--border-strong)] text-[var(--fg)]',
              'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
              'hover:border-[var(--fg)] disabled:pointer-events-none disabled:opacity-35',
            )}
          >
            {pending === provider.id ? (
              <Spinner size={14} />
            ) : (
              <span className="text-[var(--fg-muted)]">{GLYPH[provider.id]}</span>
            )}
            <span>{intent} with {provider.label}</span>
          </button>
        ))}
      </div>

      {providers
        .filter((provider) => !provider.enabled)
        .map((provider) => (
          <p
            key={provider.id}
            id={`oauth-${provider.id}-reason`}
            className="t-caption text-[var(--fg-subtle)]"
          >
            {provider.reason}
          </p>
        ))}

      {error ? (
        <p role="alert" className="t-caption text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}

/** Hairline rule with a centred word — the divider above the OAuth block. */
export function AuthDivider({ children = 'or' }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4" role="separator">
      <span aria-hidden className="h-px flex-1 bg-[var(--border)]" />
      <span className="t-label-sm text-[var(--fg-subtle)]">{children}</span>
      <span aria-hidden className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
