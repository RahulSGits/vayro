'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input } from '@/components/ui/Field';
import { type InformationValues, informationSchema, validate } from './schema';
import { FieldRow, StepActions, StepHeading } from './StepShell';

/* ==========================================================================
   Step 01 — Information.

   Two fields. Everything else the courier needs comes on the next step, and
   nothing is asked for twice.
   ========================================================================== */

export type InformationStepProps = {
  value: InformationValues;
  onChange: (next: InformationValues) => void;
  onContinue: () => void;
};

export function InformationStep({ value, onChange, onContinue }: InformationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const set = useCallback(
    <K extends keyof InformationValues>(key: K, next: InformationValues[K]) => {
      onChange({ ...value, [key]: next });
      setErrors((current) => {
        if (!current[key]) return current;
        const next = { ...current };
        delete next[key];
        return next;
      });
    },
    [onChange, value],
  );

  const validateField = useCallback(
    (key: keyof InformationValues) => {
      setTouched((current) => ({ ...current, [key]: true }));
      const result = validate(informationSchema, value);
      setErrors((current) => ({
        ...current,
        ...(result.ok
          ? { [key]: '' }
          : { [key]: result.errors[key] ?? '' }),
      }));
    },
    [value],
  );

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const result = validate(informationSchema, value);
      if (!result.ok) {
        setErrors(result.errors);
        setTouched({ email: true, phone: true });
        const first = document.querySelector<HTMLElement>('[data-checkout-step="1"] [aria-invalid="true"]');
        first?.focus();
        return;
      }
      setErrors({});
      onContinue();
    },
    [onContinue, value],
  );

  const errorFor = (key: keyof InformationValues) =>
    touched[key] && errors[key] ? errors[key] : undefined;

  return (
    <form onSubmit={submit} noValidate data-checkout-step="1">
      <StepHeading
        index={1}
        title="Information"
        lede="Where the receipt goes, and how the courier reaches you on the day."
      />

      <FieldRow>
        <Field label="Email" required error={errorFor('email')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="next"
              placeholder="you@example.com"
              value={value.email}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('email', event.target.value)}
              onBlur={() => validateField('email')}
            />
          )}
        </Field>

        <Field label="Phone" required hint="Used for delivery updates only." error={errorFor('phone')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="next"
              placeholder="+91 98765 43210"
              value={value.phone}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('phone', event.target.value)}
              onBlur={() => validateField('phone')}
            />
          )}
        </Field>
      </FieldRow>

      <div className="mt-8">
        <Checkbox
          name="marketingOptIn"
          checked={value.marketingOptIn}
          onChange={(event) => set('marketingOptIn', event.target.checked)}
          label="Send me field notes — new equipment and material research. Unsubscribe in one tap."
        />
      </div>

      <StepActions>
        <p className="t-caption text-[var(--fg-subtle)]">
          Have an account?{' '}
          <Link
            href="/account"
            className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
          >
            Sign in
          </Link>{' '}
          to use a saved address.
        </p>
        <Button type="submit" size="lg" className="sm:min-w-[13rem]">
          Continue to shipping
        </Button>
      </StepActions>
    </form>
  );
}
