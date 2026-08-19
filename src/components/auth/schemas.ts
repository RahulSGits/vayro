import { z } from 'zod';

/* ==========================================================================
   Validation shared by the auth forms. Client and server parse the same
   shapes, so a message never differs depending on where it was produced.
   ========================================================================== */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .check(z.email('That does not look like an email address.'));

/**
 * Eight characters with at least one letter and one digit. Long enough to
 * matter, short enough that nobody reaches for a sticky note. Supabase
 * enforces its own project minimum on top of this.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'Passwords are limited to 72 characters.')
  .regex(/[A-Za-z]/, 'Include at least one letter.')
  .regex(/[0-9]/, 'Include at least one number.');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signupSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Enter your name.')
    .max(80, 'That name is too long.'),
  email: emailSchema,
  password: passwordSchema,
  marketingOptIn: z.boolean(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, 'Repeat the new password.'),
  })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    message: 'The two passwords do not match.',
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

/** Field-keyed messages, first error wins — the shape every auth form holds. */
export type FieldErrors = Record<string, string>;

export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !out[key]) out[key] = issue.message;
  }
  return out;
}

/* ------------------------------------------------------------- strength -- */

export type PasswordStrength = { score: 0 | 1 | 2 | 3 | 4; label: string };

/**
 * A calm, honest read of a password. It is guidance, not a gate — the schema
 * above is what actually blocks a weak credential.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (!value) return { score: 0, label: 'Empty' };

  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value)) score += 1;

  const labels = ['Too short', 'Weak', 'Adequate', 'Strong', 'Very strong'] as const;
  const clamped = Math.min(score, 4) as PasswordStrength['score'];
  return { score: clamped, label: labels[clamped] };
}

/** Only ever follow a same-origin absolute path back after sign-in. */
export function safeNext(value: string | null | undefined, fallback = '/account'): string {
  if (!value) return fallback;
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}
