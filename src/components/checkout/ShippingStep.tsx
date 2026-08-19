'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn, formatPrice } from '@/lib/utils';
import { SHIPPING_FREE_THRESHOLD } from '@/store/cart';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import type { Currency } from '@/types';
import {
  type AddressValues,
  type ShippingMethodId,
  COUNTRIES,
  addressSchema,
  countryFor,
  methodsFor,
  shippingCost,
  validate,
} from './schema';
import { FieldRow, StepActions, StepHeading } from './StepShell';

/* ==========================================================================
   Step 02 — Shipping.

   The destination decides the vocabulary (PIN code vs ZIP code), which
   postal format is accepted, and which despatch options can honestly be
   offered. Nothing is quoted that cannot be delivered.
   ========================================================================== */

export type ShippingStepProps = {
  address: AddressValues;
  onAddressChange: (next: AddressValues) => void;
  method: ShippingMethodId;
  onMethodChange: (next: ShippingMethodId) => void;
  /** Subtotal after discount — what the free-shipping threshold is read from. */
  merchandiseTotal: number;
  currency: Currency;
  onBack: () => void;
  onContinue: () => void;
};

export function ShippingStep({
  address,
  onAddressChange,
  method,
  onMethodChange,
  merchandiseTotal,
  currency,
  onBack,
  onContinue,
}: ShippingStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const country = countryFor(address.country);
  const available = useMemo(() => methodsFor(address.country), [address.country]);

  // A destination change can withdraw the selected method — fall back rather
  // than let the summary quote something that cannot be despatched.
  useEffect(() => {
    if (!available.some((option) => option.id === method)) onMethodChange(available[0].id);
  }, [available, method, onMethodChange]);

  const set = useCallback(
    <K extends keyof AddressValues>(key: K, next: AddressValues[K]) => {
      onAddressChange({ ...address, [key]: next });
      setErrors((current) => {
        if (!current[key]) return current;
        const rest = { ...current };
        delete rest[key];
        return rest;
      });
    },
    [address, onAddressChange],
  );

  const validateField = useCallback(
    (key: keyof AddressValues) => {
      setTouched((current) => ({ ...current, [key]: true }));
      const result = validate(addressSchema, address);
      setErrors((current) => ({ ...current, [key]: result.ok ? '' : (result.errors[key] ?? '') }));
    },
    [address],
  );

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const result = validate(addressSchema, address);
      if (!result.ok) {
        setErrors(result.errors);
        setTouched(
          Object.fromEntries(Object.keys(address).map((key) => [key, true])) as Record<string, boolean>,
        );
        document
          .querySelector<HTMLElement>('[data-checkout-step="2"] [aria-invalid="true"]')
          ?.focus();
        return;
      }
      setErrors({});
      onContinue();
    },
    [address, onContinue],
  );

  const errorFor = (key: keyof AddressValues) =>
    touched[key] && errors[key] ? errors[key] : undefined;

  const shortfall = Math.max(0, SHIPPING_FREE_THRESHOLD - merchandiseTotal);

  return (
    <form onSubmit={submit} noValidate data-checkout-step="2">
      <StepHeading index={2} title="Shipping" lede="The address on the label, and how fast it travels." />

      <FieldRow>
        <Field label="Full name" required error={errorFor('fullName')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              autoComplete="name"
              autoCapitalize="words"
              enterKeyHint="next"
              value={address.fullName}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('fullName', event.target.value)}
              onBlur={() => validateField('fullName')}
            />
          )}
        </Field>

        <Field label="Country or region" required error={errorFor('country')}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              name="country"
              autoComplete="country"
              value={address.country}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('country', event.target.value)}
              onBlur={() => validateField('country')}
            >
              {COUNTRIES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FieldRow>

      <div className="mt-6 flex flex-col gap-6">
        <Field label="Address" required error={errorFor('line1')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="line1"
              autoComplete="address-line1"
              enterKeyHint="next"
              placeholder="Street and number"
              value={address.line1}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('line1', event.target.value)}
              onBlur={() => validateField('line1')}
            />
          )}
        </Field>

        <Field label="Apartment, floor, landmark" hint="Optional." error={errorFor('line2')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="line2"
              autoComplete="address-line2"
              enterKeyHint="next"
              value={address.line2}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('line2', event.target.value)}
              onBlur={() => validateField('line2')}
            />
          )}
        </Field>
      </div>

      <FieldRow className="mt-6">
        <Field label="City" required error={errorFor('city')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="city"
              autoComplete="address-level2"
              autoCapitalize="words"
              enterKeyHint="next"
              value={address.city}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('city', event.target.value)}
              onBlur={() => validateField('city')}
            />
          )}
        </Field>

        <Field label={country.regionLabel} required error={errorFor('region')}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="region"
              autoComplete="address-level1"
              autoCapitalize="words"
              enterKeyHint="next"
              value={address.region}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('region', event.target.value)}
              onBlur={() => validateField('region')}
            />
          )}
        </Field>
      </FieldRow>

      <div className="mt-6 sm:max-w-[calc(50%-0.75rem)]">
        <Field
          label={country.postalLabel}
          required
          hint={`For example ${country.postalExample}.`}
          error={errorFor('postalCode')}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="postalCode"
              autoComplete="postal-code"
              autoCapitalize="characters"
              inputMode={country.postalPattern?.source.includes('A-Za-z') ? 'text' : 'numeric'}
              enterKeyHint="next"
              value={address.postalCode}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              onChange={(event) => set('postalCode', event.target.value)}
              onBlur={() => validateField('postalCode')}
            />
          )}
        </Field>
      </div>

      {/* ----------------------------------------------------- despatch -- */}
      <fieldset className="mt-12">
        <legend className="t-label text-[var(--fg-muted)]">Despatch</legend>
        <p className="t-caption mt-2 text-[var(--fg-subtle)]">
          Orders leave the workshop within two working days.
        </p>

        <div className="mt-5 flex flex-col">
          {available.map((option) => {
            const cost = shippingCost(option.id, merchandiseTotal);
            const selected = option.id === method;
            const [min, max] = option.leadTime;

            return (
              <label
                key={option.id}
                className={cn(
                  'group relative flex cursor-pointer items-start gap-4 border-t border-[var(--border)] py-5 last:border-b',
                  'transition-colors duration-[var(--d-fast)]',
                  selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                )}
              >
                <input
                  type="radio"
                  name="shippingMethod"
                  value={option.id}
                  checked={selected}
                  onChange={() => onMethodChange(option.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'mt-1 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center border',
                    selected ? 'border-[var(--fg)]' : 'border-[var(--border-strong)]',
                  )}
                >
                  <span
                    className={cn(
                      'block h-1.5 w-1.5 transition-opacity duration-[var(--d-fast)]',
                      selected ? 'bg-[var(--fg)] opacity-100' : 'opacity-0',
                    )}
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="t-label">{option.name}</span>
                    <span className="t-price">
                      {cost === 0 ? 'Free' : formatPrice(cost, currency)}
                    </span>
                  </span>
                  <span className="t-caption mt-1.5 block text-[var(--fg-subtle)]">
                    {min === max ? `${min} working day` : `${min}–${max} working days`} after despatch
                    {' · '}
                    {option.detail}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        {shortfall > 0 ? (
          <p className="t-caption mt-4 text-[var(--fg-subtle)]">
            Standard shipping is free above {formatPrice(SHIPPING_FREE_THRESHOLD, currency)} —{' '}
            <span className="text-[var(--fg)]">{formatPrice(shortfall, currency)}</span> to go.
          </p>
        ) : null}
      </fieldset>

      <StepActions>
        <Button type="button" variant="quiet" size="lg" onClick={onBack}>
          Back to information
        </Button>
        <Button type="submit" size="lg" className="sm:min-w-[13rem]">
          Continue to payment
        </Button>
      </StepActions>
    </form>
  );
}
