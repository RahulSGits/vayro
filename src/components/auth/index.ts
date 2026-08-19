/**
 * Authentication surface — one import for the sign-in, sign-up and recovery
 * screens.
 *
 *   import { LoginForm, OAuthButtons } from '@/components/auth';
 */

export { AuthAside } from './AuthAside';
export { AuthCallout, DemoAuthNotice } from './AuthCallout';
export type { CalloutTone } from './AuthCallout';
export { PasswordField } from './PasswordField';
export { OAuthButtons, AuthDivider } from './OAuthButtons';
export { LoginForm } from './LoginForm';
export { SignupForm } from './SignupForm';
export { ForgotPasswordForm } from './ForgotPasswordForm';
export { ResetPasswordForm } from './ResetPasswordForm';

/* validation -------------------------------------------------------------- */
export {
  emailSchema,
  passwordSchema,
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  fieldErrorsFrom,
  passwordStrength,
  safeNext,
} from './schemas';
export type {
  LoginValues,
  SignupValues,
  ForgotPasswordValues,
  ResetPasswordValues,
  FieldErrors,
  PasswordStrength,
} from './schemas';
