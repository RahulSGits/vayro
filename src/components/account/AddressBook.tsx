'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Plus } from 'lucide-react';
import { Badge, Button, Checkbox, Dialog, Field, Input, Select, Spinner } from '@/components/ui';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  deleteAddressAction,
  saveAddressAction,
  setDefaultAddressAction,
} from '@/app/account/actions';
import { COUNTRIES, IDLE, countryName } from '@/app/account/schemas';
import { StatusNote } from './AccountShell';
import type { Address } from '@/types';

/* ==========================================================================
   AddressBook — full CRUD over the address list.

   Create and edit share one dialog and one server action; the action decides
   insert vs update from the presence of an id, and re-checks ownership on the
   server either way. A default is exclusive, so promoting one demotes the
   incumbent in the same round trip.
   ========================================================================== */

type Editing = { mode: 'create' } | { mode: 'edit'; address: Address } | null;

export function AddressBook({ addresses, demo }: { addresses: Address[]; demo: boolean }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<Address | null>(null);

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-6">
        <p className="t-body-sm text-[var(--fg-muted)]">
          {addresses.length === 0
            ? 'No addresses saved.'
            : addresses.length === 1
              ? 'One address saved.'
              : `${addresses.length} addresses saved.`}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing({ mode: 'create' })}>
          <Plus size={14} strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
          Add address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          title="No addresses yet"
          body="Save one and checkout becomes a single confirmation."
          action={
            <Button type="button" size="md" onClick={() => setEditing({ mode: 'create' })}>
              Add your first address
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-x-[var(--gutter)] gap-y-8 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id}>
              <AddressCard
                address={address}
                onEdit={() => setEditing({ mode: 'edit', address })}
                onDelete={() => setConfirming(address)}
              />
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <AddressDialog
          key={editing.mode === 'edit' ? editing.address.id : 'create'}
          address={editing.mode === 'edit' ? editing.address : null}
          demo={demo}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {confirming ? (
        <DeleteDialog
          key={confirming.id}
          address={confirming}
          onClose={() => setConfirming(null)}
        />
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- card -- */

function AddressCard({
  address,
  onEdit,
  onDelete,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="flex h-full flex-col justify-between gap-6 border border-[var(--border)] p-6 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--border-strong)]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {address.label ? <Badge tone="outline">{address.label}</Badge> : null}
          {address.isDefaultShipping ? <Badge tone="default">Default delivery</Badge> : null}
          {address.isDefaultBilling ? <Badge tone="muted">Default billing</Badge> : null}
        </div>

        <address className="t-body-sm mt-5 not-italic text-[var(--fg-muted)]">
          <span className="block text-[var(--fg)]">{address.fullName}</span>
          {address.line1}
          {address.line2 ? <>, {address.line2}</> : null}
          <br />
          {address.city}, {address.region} {address.postalCode}
          <br />
          {countryName(address.country)}
          {address.phone ? (
            <>
              <br />
              <span className="t-spec">{address.phone}</span>
            </>
          ) : null}
        </address>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-[var(--border)] pt-5">
        <button
          type="button"
          onClick={onEdit}
          className="t-label-sm text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Edit
        </button>
        {!address.isDefaultShipping ? (
          <DefaultButton id={address.id} kind="shipping" label="Make default delivery" />
        ) : null}
        {!address.isDefaultBilling ? (
          <DefaultButton id={address.id} kind="billing" label="Make default billing" />
        ) : null}
        <button
          type="button"
          onClick={onDelete}
          className="t-label-sm ml-auto text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--danger)]"
        >
          Remove
        </button>
      </div>
    </article>
  );
}

function DefaultButton({
  id,
  kind,
  label,
}: {
  id: string;
  kind: 'shipping' | 'billing';
  label: string;
}) {
  const [state, formAction] = useActionState(setDefaultAddressAction, IDLE);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status === 'idle') return;
    toast({
      title: state.status === 'success' ? 'Default updated' : 'Could not update',
      description: state.message,
      tone: state.status === 'success' ? 'success' : 'error',
    });
  }, [state, toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <DefaultSubmit label={label} />
    </form>
  );
}

function DefaultSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="t-label-sm inline-flex items-center gap-2 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] disabled:opacity-40"
    >
      {pending ? <Spinner size={11} /> : null}
      {label}
    </button>
  );
}

/* --------------------------------------------------------------- dialog -- */

function AddressDialog({
  address,
  demo,
  onClose,
}: {
  address: Address | null;
  demo: boolean;
  onClose: () => void;
}) {
  const [state, formAction, pending] = useActionState(saveAddressAction, IDLE);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status !== 'success') return;
    toast({ title: state.message, tone: 'success' });
    onClose();
  }, [state, toast, onClose]);

  const errors = state.fieldErrors ?? {};

  return (
    <Dialog
      open
      onClose={onClose}
      title={address ? 'Edit address' : 'New address'}
      description="Used for delivery and billing at checkout."
      size="lg"
    >
      <form action={formAction} className="flex flex-col gap-7">
        {address ? <input type="hidden" name="id" value={address.id} /> : null}

        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="Label" hint="Home, Studio, Parents…" error={errors.label}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="label"
                defaultValue={address?.label ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                data-autofocus
              />
            )}
          </Field>

          <Field label="Recipient" error={errors.fullName} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="fullName"
                autoComplete="name"
                defaultValue={address?.fullName ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required
              />
            )}
          </Field>
        </div>

        <Field label="Address" error={errors.line1} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="line1"
              autoComplete="address-line1"
              defaultValue={address?.line1 ?? ''}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required
            />
          )}
        </Field>

        <Field label="Address line 2" error={errors.line2}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="line2"
              autoComplete="address-line2"
              defaultValue={address?.line2 ?? ''}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
            />
          )}
        </Field>

        <div className="grid gap-7 sm:grid-cols-3">
          <Field label="City" error={errors.city} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="city"
                autoComplete="address-level2"
                defaultValue={address?.city ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required
              />
            )}
          </Field>

          <Field label="State / Region" error={errors.region} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="region"
                autoComplete="address-level1"
                defaultValue={address?.region ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required
              />
            )}
          </Field>

          <Field label="Postal code" error={errors.postalCode} required>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="postalCode"
                autoComplete="postal-code"
                inputMode="numeric"
                defaultValue={address?.postalCode ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required
              />
            )}
          </Field>
        </div>

        <div className="grid gap-7 sm:grid-cols-2">
          <Field label="Country" error={errors.country} required>
            {({ id, describedBy, invalid }) => (
              <Select
                id={id}
                name="country"
                autoComplete="country"
                defaultValue={address?.country ?? 'IN'}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                required
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Phone" hint="For the courier only." error={errors.phone}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                defaultValue={address?.phone ?? ''}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
              />
            )}
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-6">
          <Checkbox
            name="isDefaultShipping"
            label="Use as my default delivery address"
            defaultChecked={address?.isDefaultShipping ?? false}
          />
          <Checkbox
            name="isDefaultBilling"
            label="Use as my default billing address"
            defaultChecked={address?.isDefaultBilling ?? false}
          />
        </div>

        <StatusNote status={state.status} message={state.message} />

        <div className={cn('flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-6')}>
          <Button type="submit" size="md" disabled={pending}>
            {pending ? <Spinner size={14} /> : null}
            {pending ? 'Saving' : address ? 'Save address' : 'Add address'}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          {demo ? (
            <span className="t-caption text-[var(--fg-subtle)]">Demo mode — saving is disabled.</span>
          ) : null}
        </div>
      </form>
    </Dialog>
  );
}

function DeleteDialog({ address, onClose }: { address: Address; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(deleteAddressAction, IDLE);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status !== 'success') return;
    toast({ title: state.message, tone: 'success' });
    onClose();
  }, [state, toast, onClose]);

  return (
    <Dialog
      open
      onClose={onClose}
      title="Remove address"
      size="sm"
      dismissible={false}
      description={`${address.fullName}, ${address.line1}, ${address.city}`}
    >
      <form action={formAction} className="flex flex-col gap-7">
        <input type="hidden" name="id" value={address.id} />
        <p className="t-body-sm t-pretty text-[var(--fg-muted)]">
          This removes the address from your account. Orders already placed keep
          the address they shipped to.
        </p>

        <StatusNote status={state.status} message={state.message} />

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="danger" size="md" disabled={pending}>
            {pending ? <Spinner size={14} /> : null}
            {pending ? 'Removing' : 'Remove address'}
          </Button>
          <Button type="button" variant="ghost" size="md" onClick={onClose} data-autofocus>
            Keep it
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
