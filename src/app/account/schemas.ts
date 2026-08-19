import { z } from 'zod';

/* ==========================================================================
   Account form contracts. Imported by the client forms for instant feedback
   and by the server actions for the decision that actually counts.
   ========================================================================== */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

/** Permissive on purpose — international numbers do not share a shape. */
const phoneSchema = z
  .string()
  .trim()
  .max(24, 'That number is too long.')
  .refine((value) => value === '' || /^[+0-9][0-9\s()\-.]{5,}$/.test(value), {
    message: 'Use digits, spaces and + only.',
  })
  .transform((value) => (value.length > 0 ? value : null));

export const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(80, 'That name is too long.'),
  phone: phoneSchema,
});

export const addressSchema = z.object({
  id: z.string().trim().optional(),
  label: optionalText(40),
  fullName: z.string().trim().min(2, 'Enter the recipient name.').max(80, 'That name is too long.'),
  line1: z.string().trim().min(4, 'Enter the street address.').max(120, 'That line is too long.'),
  line2: optionalText(120),
  city: z.string().trim().min(2, 'Enter the city.').max(60, 'That city name is too long.'),
  region: z.string().trim().min(2, 'Enter the state or region.').max(60, 'That region is too long.'),
  postalCode: z
    .string()
    .trim()
    .min(3, 'Enter the postal code.')
    .max(12, 'That postal code is too long.'),
  country: z.string().trim().length(2, 'Select a country.').toUpperCase(),
  phone: phoneSchema,
  isDefaultShipping: z.boolean(),
  isDefaultBilling: z.boolean(),
});

/**
 * One switch, because one switch is what the schema can honour. Order and
 * dispatch mail is transactional and is not offered as a preference — see the
 * settings screen, which says so rather than showing a toggle that does
 * nothing.
 */
export const preferencesSchema = z.object({
  marketingOptIn: z.boolean(),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Passwords are limited to 72 characters.')
      .regex(/[A-Za-z]/, 'Include at least one letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string().min(1, 'Repeat the new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords do not match.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password you have not used on this account.',
  });

export type ProfileValues = z.infer<typeof profileSchema>;
export type AddressValues = z.infer<typeof addressSchema>;
export type PreferencesValues = z.infer<typeof preferencesSchema>;

/**
 * Shipping destinations VAYRO currently serves. India first — it is the home
 * market and the default currency.
 */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

export function countryName(code: string): string {
  return COUNTRIES.find((country) => country.code === code.toUpperCase())?.name ?? code;
}

/* ------------------------------------------------------- action contract -- */

export type ActionState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  /** Field-keyed messages rendered inline beside the offending control. */
  fieldErrors?: Record<string, string>;
};

export const IDLE: ActionState = { status: 'idle', message: '' };

export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = issue.message;
  }
  return out;
}
