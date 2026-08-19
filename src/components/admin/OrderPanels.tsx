'use client';

import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import type { Order, OrderStatus } from '@/types';
import { updateOrderFulfilment, updateOrderStatus } from '@/app/admin/actions';
import { ActionButtonForm, ActionForm, ActionMessage, FieldGrid, SubmitButton } from './Form';
import { OrderStatusPill } from './StatusPill';

/* ==========================================================================
   Order operations.
   Status is a state machine, not a free-form dropdown: only the transitions
   that make sense from the current state are offered, so an order cannot be
   marked delivered before it has shipped or un-refunded after the fact.
   ========================================================================== */

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'refunded', 'cancelled'],
  processing: ['shipped', 'refunded', 'cancelled'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

const TRANSITION_LABEL: Record<OrderStatus, string> = {
  pending: 'Mark pending',
  paid: 'Mark paid',
  processing: 'Start processing',
  shipped: 'Mark shipped',
  delivered: 'Mark delivered',
  cancelled: 'Cancel order',
  refunded: 'Mark refunded',
};

const CARRIERS = ['Bluedart', 'Delhivery', 'DTDC', 'India Post', 'Ekart', 'Shadowfax', 'DHL', 'FedEx'];

export function OrderStatusControls({ order }: { order: Order }) {
  const next = TRANSITIONS[order.status];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <span className="t-label-sm text-[var(--fg-subtle)]">Current</span>
        <OrderStatusPill status={order.status} />
      </div>

      {next.length === 0 ? (
        <p className="t-caption t-pretty text-[var(--fg-muted)]">
          This order is closed. {order.status === 'refunded'
            ? 'A refund has been recorded against it.'
            : 'It was cancelled before fulfilment.'}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {next.map((status) => (
            <ActionButtonForm
              key={status}
              action={updateOrderStatus}
              fields={{ id: order.id, status }}
              variant={status === 'cancelled' || status === 'refunded' ? 'danger' : 'secondary'}
              size="xs"
              confirm={
                status === 'cancelled' || status === 'refunded'
                  ? `${TRANSITION_LABEL[status]} for ${order.orderNumber}? This is recorded against the order.`
                  : undefined
              }
            >
              {TRANSITION_LABEL[status]}
            </ActionButtonForm>
          ))}
        </div>
      )}
    </div>
  );
}

export function OrderFulfilmentForm({ order }: { order: Order }) {
  return (
    <ActionForm action={updateOrderFulfilment}>
      {(state) => (
        <>
          <input type="hidden" name="id" value={order.id} />
          <FieldGrid>
            <Field label="Carrier" error={state.fieldErrors?.carrier}>
              {({ id, invalid }) => (
                <Select id={id} name="carrier" defaultValue={order.carrier ?? ''} aria-invalid={invalid}>
                  <option value="">Not assigned</option>
                  {CARRIERS.map((carrier) => <option key={carrier} value={carrier}>{carrier}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Tracking number" error={state.fieldErrors?.trackingNumber}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id} name="trackingNumber" defaultValue={order.trackingNumber ?? ''}
                  className="t-spec" aria-describedby={describedBy} aria-invalid={invalid}
                  placeholder="BD123456789"
                />
              )}
            </Field>
          </FieldGrid>

          <div className="mt-7">
            <Field label="Internal note" hint="Visible to administrators only. Never sent to the customer.">
              {({ id, describedBy }) => (
                <Textarea id={id} name="notes" rows={3} defaultValue={order.notes ?? ''} aria-describedby={describedBy} />
              )}
            </Field>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
            <ActionMessage state={state} />
            <SubmitButton>Save fulfilment</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
