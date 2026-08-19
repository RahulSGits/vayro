'use client';

import { useState } from 'react';
import { Field, Input } from '@/components/ui/Field';
import { deleteProduct } from '@/app/admin/actions';
import { ActionForm, ActionMessage, SubmitButton } from './Form';

/**
 * Destructive actions are deliberately awkward: the operator types the word
 * before the control unlocks, and the server re-checks it. Deleting a product
 * cascades to its variants, images, models and inventory.
 */
export function DeleteProductForm({ product }: { product: { id: string; name: string } }) {
  const [confirm, setConfirm] = useState('');
  const armed = confirm.trim().toUpperCase() === 'DELETE';

  return (
    <ActionForm action={deleteProduct} toastOnResult>
      {(state) => (
        <>
          <input type="hidden" name="id" value={product.id} />
          <p className="t-body-sm t-pretty text-[var(--fg-muted)]">
            Deleting <span className="text-[var(--fg)]">{product.name}</span> removes its variants, stock
            records, imagery and 3D references. Orders that already contain it keep their line items.
            Archive instead if you only want it off the storefront.
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-4">
            <Field
              label="Type DELETE to confirm"
              error={state.fieldErrors?.confirm}
              className="min-w-[14rem] flex-1"
            >
              {({ id, invalid }) => (
                <Input
                  id={id}
                  name="confirm"
                  value={confirm}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={invalid}
                  className="t-spec"
                  onChange={(event) => setConfirm(event.target.value)}
                />
              )}
            </Field>
            <SubmitButton variant="danger" disabled={!armed}>Delete product</SubmitButton>
          </div>

          <ActionMessage state={state} className="mt-4" />
        </>
      )}
    </ActionForm>
  );
}
