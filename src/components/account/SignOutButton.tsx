'use client';

import { useFormStatus } from 'react-dom';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/States';
import { signOutAction } from '@/app/account/actions';

/* ==========================================================================
   SignOutButton

   A real form posting to a server action, so it works before hydration and
   clears the httpOnly cookie server-side. A client-only `signOut()` would
   leave the cookie in place for the next server render.
   ========================================================================== */

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction} className={className}>
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-cursor="link"
      className={cn(
        't-label inline-flex items-center gap-3 text-[var(--fg-muted)]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        'hover:text-[var(--fg)] disabled:opacity-40',
      )}
    >
      {pending ? (
        <Spinner size={13} />
      ) : (
        <LogOut size={15} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
      )}
      {pending ? 'Signing out' : 'Sign out'}
    </button>
  );
}
