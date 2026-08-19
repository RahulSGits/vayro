'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSession, isDemoAuth } from '@/lib/auth';
import { writeTable } from './write';
import {
  addressSchema,
  fieldErrorsFrom,
  passwordChangeSchema,
  preferencesSchema,
  profileSchema,
  type ActionState,
} from './schemas';

/* ==========================================================================
   Account mutations.

   Every action re-establishes who is asking with `getSession()` before it
   touches a row — a form submission carries no authority of its own, and the
   `user_id` is never read from the payload. RLS is the second line: the
   policies in supabase/migrations scope every table to `auth.uid()`.

   In demo mode each action refuses with an explanation. It never reports
   success for a write that did not happen.
   ========================================================================== */

const DEMO_REFUSAL: ActionState = {
  status: 'error',
  message: 'Demo mode — no database is attached, so nothing was saved. Add your Supabase credentials to enable this.',
};

const SIGNED_OUT: ActionState = {
  status: 'error',
  message: 'Your session has expired. Sign in again to save this.',
};

const checkbox = (formData: FormData, name: string) => formData.get(name) === 'on';

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
};

function revalidateAccount() {
  revalidatePath('/account', 'layout');
}

/* --------------------------------------------------------------- profile -- */

export async function updateProfileAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const parsed = profileSchema.safeParse({
    fullName: text(formData, 'fullName'),
    phone: text(formData, 'phone'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  const { error } = await writeTable(sb, 'profiles')
    .update({ full_name: parsed.data.fullName, phone: parsed.data.phone, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { status: 'error', message: error.message };

  // Keep the auth metadata in step so a fresh sign-in shows the same name.
  await sb.auth.updateUser({ data: { full_name: parsed.data.fullName } });

  revalidateAccount();
  return { status: 'success', message: 'Profile updated.' };
}

/* ----------------------------------------------------------- preferences -- */

export async function updatePreferencesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const parsed = preferencesSchema.safeParse({ marketingOptIn: checkbox(formData, 'marketingOptIn') });
  if (!parsed.success) {
    return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  const { error } = await writeTable(sb, 'profiles')
    .update({ marketing_opt_in: parsed.data.marketingOptIn, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { status: 'error', message: error.message };

  revalidateAccount();
  return {
    status: 'success',
    message: parsed.data.marketingOptIn
      ? 'You are subscribed to new releases and field notes.'
      : 'Unsubscribed. Order and dispatch mail continues.',
  };
}

/* ------------------------------------------------------------- addresses -- */

export async function saveAddressAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const parsed = addressSchema.safeParse({
    id: text(formData, 'id') || undefined,
    label: text(formData, 'label'),
    fullName: text(formData, 'fullName'),
    line1: text(formData, 'line1'),
    line2: text(formData, 'line2'),
    city: text(formData, 'city'),
    region: text(formData, 'region'),
    postalCode: text(formData, 'postalCode'),
    country: text(formData, 'country'),
    phone: text(formData, 'phone'),
    isDefaultShipping: checkbox(formData, 'isDefaultShipping'),
    isDefaultBilling: checkbox(formData, 'isDefaultBilling'),
  });

  if (!parsed.success) {
    return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  const { id, ...values } = parsed.data;

  const row = {
    user_id: user.id,
    label: values.label,
    full_name: values.fullName,
    line1: values.line1,
    line2: values.line2,
    city: values.city,
    region: values.region,
    postal_code: values.postalCode,
    country: values.country,
    phone: values.phone,
    is_default_shipping: values.isDefaultShipping,
    is_default_billing: values.isDefaultBilling,
  };

  // A default is exclusive: demote the incumbent before promoting this one, so
  // two rows can never both claim it.
  if (values.isDefaultShipping) {
    await writeTable(sb, 'addresses').update({ is_default_shipping: false }).eq('user_id', user.id);
  }
  if (values.isDefaultBilling) {
    await writeTable(sb, 'addresses').update({ is_default_billing: false }).eq('user_id', user.id);
  }

  const { error } = id
    ? await writeTable(sb, 'addresses').update(row).eq('id', id).eq('user_id', user.id)
    : await writeTable(sb, 'addresses').insert(row);

  if (error) return { status: 'error', message: error.message };

  revalidateAccount();
  return { status: 'success', message: id ? 'Address updated.' : 'Address saved.' };
}

export async function deleteAddressAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const id = text(formData, 'id');
  if (!id) return { status: 'error', message: 'That address no longer exists.' };

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  // The `user_id` filter is belt to RLS's braces — never trust the form's id
  // alone to identify a row that belongs to the caller.
  const { error } = await writeTable(sb, 'addresses').delete().eq('id', id).eq('user_id', user.id);
  if (error) return { status: 'error', message: error.message };

  revalidateAccount();
  return { status: 'success', message: 'Address removed.' };
}

export async function setDefaultAddressAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const id = text(formData, 'id');
  const kind = text(formData, 'kind');
  if (!id || (kind !== 'shipping' && kind !== 'billing')) {
    return { status: 'error', message: 'That address no longer exists.' };
  }

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  const column = kind === 'shipping' ? 'is_default_shipping' : 'is_default_billing';

  await writeTable(sb, 'addresses').update({ [column]: false }).eq('user_id', user.id);
  const { error } = await writeTable(sb, 'addresses')
    .update({ [column]: true })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { status: 'error', message: error.message };

  revalidateAccount();
  return {
    status: 'success',
    message: kind === 'shipping' ? 'Default delivery address set.' : 'Default billing address set.',
  };
}

/* -------------------------------------------------------------- password -- */

export async function changePasswordAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (isDemoAuth()) return DEMO_REFUSAL;

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: text(formData, 'currentPassword'),
    newPassword: text(formData, 'newPassword'),
    confirmPassword: text(formData, 'confirmPassword'),
  });
  if (!parsed.success) {
    return { status: 'error', message: 'Check the highlighted fields.', fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  const user = await getSession();
  if (!user) return SIGNED_OUT;

  const sb = await createClient();
  if (!sb) return SIGNED_OUT;

  // Re-authenticate first. Supabase does not require the old password to set a
  // new one, which would let anyone with a borrowed open tab take the account.
  const { error: reauthError } = await sb.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) {
    return {
      status: 'error',
      message: 'That is not your current password.',
      fieldErrors: { currentPassword: 'Incorrect password.' },
    };
  }

  const { error } = await sb.auth.updateUser({ password: parsed.data.newPassword });
  if (error) return { status: 'error', message: error.message };

  return { status: 'success', message: 'Password changed. Other sessions keep running until they expire.' };
}

/* ---------------------------------------------------------------- session -- */

export async function signOutAction() {
  const sb = await createClient();
  if (sb) await sb.auth.signOut();
  revalidateAccount();
  redirect('/login?notice=signed-out');
}
