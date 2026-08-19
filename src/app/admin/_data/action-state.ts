/**
 * Shared shape for every admin server action.
 *
 * This lives outside `actions.ts` on purpose: a `'use server'` module may only
 * export async functions, so the constants and types that both the actions and
 * the client forms need have to sit in a neutral module. Nothing here touches
 * the server, so it is safe to import from a Client Component.
 */

export type ActionStatus = 'idle' | 'success' | 'error' | 'demo';

export type ActionState = {
  status: ActionStatus;
  message: string;
  /** Keyed by form field name — feeds straight into `<Field error>`. */
  fieldErrors?: Record<string, string>;
};

export const idleState: ActionState = { status: 'idle', message: '' };

export const DEMO_NOTICE =
  'Demo mode — this change was validated but not saved. Connect Supabase to persist live records.';
