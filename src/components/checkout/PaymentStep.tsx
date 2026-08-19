'use client';

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type {
  StripeElements,
  StripePaymentElement,
  StripePaymentElementOptions,
  Stripe,
} from '@stripe/stripe-js';
import { ShieldCheck } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { hasStripe } from '@/lib/env';
import { useTheme } from '@/components/providers/ThemeProvider';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Checkbox } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import type { Currency } from '@/types';
import { StepActions, StepHeading } from './StepShell';
import { getStripe, buildAppearance } from './stripe';
import { createPaymentIntent, type OrderPayload } from './order';
import type { AddressValues, InformationValues, ShippingMethodId } from './schema';

/* ==========================================================================
   Step 03 — Payment.

   Card details are entered into Stripe's Payment Element, which renders in a
   frame we do not control — VAYRO never sees a card number. The element is
   created once per client secret and stays mounted while the customer visits
   the review step, so nothing typed here is lost on the way back.

   When no publishable key is configured the step says so plainly and offers a
   labelled demo order instead. It never pretends a payment happened.
   ========================================================================== */

export type PaymentMode = 'stripe' | 'demo';

export type PaymentStatus = 'idle' | 'preparing' | 'ready' | 'error' | 'unconfigured';

export type PaymentConfirmation =
  | { ok: true; mode: PaymentMode; paymentIntentId: string | null }
  | { ok: false; message: string };

export type PaymentHandle = {
  /** Called by the review step. Resolves once the processor has answered. */
  confirm: () => Promise<PaymentConfirmation>;
};

export type PaymentStepProps = {
  ref?: React.Ref<PaymentHandle>;
  /** The element only prepares itself once the step is reached. */
  active: boolean;
  amount: number;
  currency: Currency;
  items: OrderPayload['items'];
  information: InformationValues;
  address: AddressValues;
  method: ShippingMethodId;
  discountCode: string | null;
  billingSame: boolean;
  onBillingSameChange: (next: boolean) => void;
  onStatusChange: (status: PaymentStatus, mode: PaymentMode) => void;
  onBack: () => void;
  onContinue: () => void;
};

type Mounted = {
  stripe: Stripe;
  elements: StripeElements;
  element: StripePaymentElement;
};

export function PaymentStep({
  ref,
  active,
  amount,
  currency,
  items,
  information,
  address,
  method,
  discountCode,
  billingSame,
  onBillingSameChange,
  onStatusChange,
  onBack,
  onContinue,
}: PaymentStepProps) {
  const { theme } = useTheme();
  const mode: PaymentMode = hasStripe ? 'stripe' : 'demo';

  const [status, setStatus] = useState<PaymentStatus>(hasStripe ? 'idle' : 'unconfigured');
  const [message, setMessage] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<Mounted | null>(null);
  /** Amount the current intent was created for — a change invalidates it. */
  const intentAmountRef = useRef<number | null>(null);

  useEffect(() => {
    onStatusChange(status, mode);
  }, [status, mode, onStatusChange]);

  /* ------------------------------------------------------------- intent */
  useEffect(() => {
    if (!hasStripe || !active || amount <= 0) return;
    if (clientSecret && intentAmountRef.current === amount) return;

    const controller = new AbortController();
    let cancelled = false;

    setStatus('preparing');
    setMessage(null);

    void createPaymentIntent(
      {
        amount,
        currency,
        email: information.email,
        items,
        shippingAddress: address,
        shippingMethod: method,
        discountCode,
      },
      controller.signal,
    ).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setStatus('error');
        setMessage(result.message);
        return;
      }
      intentAmountRef.current = amount;
      setClientSecret(result.clientSecret);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // `items`, `address` and `information` are snapshots of the same basket the
    // amount is derived from; the amount is the trigger that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, amount, currency, method, discountCode, attempt, clientSecret]);

  /* ------------------------------------------------------------ element */
  useEffect(() => {
    if (!clientSecret) return;
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;

    void (async () => {
      const stripe = await getStripe();
      if (disposed) return;
      if (!stripe) {
        setStatus('error');
        setMessage('Stripe.js could not be loaded. Check your connection and try again.');
        return;
      }

      const elements = stripe.elements({
        clientSecret,
        appearance: buildAppearance(theme),
        loader: 'auto',
      });

      const element = elements.create('payment', elementOptions(billingSame, information, address));

      element.on('ready', () => {
        if (!disposed) setStatus('ready');
      });
      element.on('loaderror', (event) => {
        if (disposed) return;
        setStatus('error');
        setMessage(event.error?.message ?? 'The payment form could not be displayed.');
      });
      element.on('change', (event) => {
        if (!disposed) setComplete(event.complete);
      });

      element.mount(container);
      mountedRef.current = { stripe, elements, element };
    })();

    return () => {
      disposed = true;
      mountedRef.current?.element.destroy();
      mountedRef.current = null;
    };
    // Rebuilding on theme change is deliberate: appearance is baked in at
    // creation time and the frame cannot read our CSS variables.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientSecret, theme]);

  /* Billing scope changes only need an update, not a rebuild. */
  useEffect(() => {
    const element = mountedRef.current?.element;
    if (!element) return;
    try {
      element.update(elementOptions(billingSame, information, address));
    } catch {
      /* An update on a destroyed element is harmless — it will be rebuilt. */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billingSame]);

  /* ------------------------------------------------------------ confirm */
  const confirm = useCallback(async (): Promise<PaymentConfirmation> => {
    if (mode === 'demo') return { ok: true, mode: 'demo', paymentIntentId: null };

    const context = mountedRef.current;
    if (!context) {
      return { ok: false, message: 'The payment form is not ready yet. Return to the payment step.' };
    }

    const billingDetails = {
      name: address.fullName,
      email: information.email,
      phone: information.phone,
      address: {
        line1: address.line1,
        line2: address.line2 || undefined,
        city: address.city,
        state: address.region,
        postal_code: address.postalCode,
        country: address.country,
      },
    };

    const result = await context.stripe.confirmPayment({
      elements: context.elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/checkout`,
        receipt_email: information.email,
        shipping: {
          name: address.fullName,
          phone: information.phone,
          address: billingDetails.address,
        },
        ...(billingSame ? { payment_method_data: { billing_details: billingDetails } } : {}),
      },
    });

    if (result.error) {
      return {
        ok: false,
        message: result.error.message ?? 'Your payment could not be completed.',
      };
    }

    const intent = result.paymentIntent;
    if (!intent) {
      return { ok: false, message: 'The payment did not complete. No charge was made.' };
    }

    if (
      intent.status === 'succeeded' ||
      intent.status === 'processing' ||
      intent.status === 'requires_capture'
    ) {
      return { ok: true, mode: 'stripe', paymentIntentId: intent.id };
    }

    return {
      ok: false,
      message: `The payment was not completed (${intent.status.replace(/_/g, ' ')}). No charge was made.`,
    };
  }, [address, billingSame, information, mode]);

  useImperativeHandle(ref, () => ({ confirm }), [confirm]);

  const canContinue = mode === 'demo' || (status === 'ready' && complete);

  return (
    <div data-checkout-step="3">
      <StepHeading
        index={3}
        title="Payment"
        lede={
          mode === 'demo'
            ? 'This environment has no payment processor connected.'
            : 'Handled by Stripe. Card details never reach a VAYRO server.'
        }
      />

      {mode === 'demo' ? (
        <UnconfiguredPanel amount={amount} currency={currency} />
      ) : (
        <>
          <div
            className={cn(
              'relative min-h-[16rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-5 sm:p-7',
              status === 'error' && 'border-[var(--danger)]',
            )}
          >
            {/* The element is mounted into this node and never re-parented. */}
            <div ref={containerRef} />

            {status === 'preparing' || (status === 'idle' && active) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-elevated)]">
                <Spinner />
                <p className="t-caption text-[var(--fg-subtle)]">Preparing a secure payment session…</p>
              </div>
            ) : null}

            {status === 'error' ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[var(--bg-elevated)] px-6 text-center">
                <p className="t-label-sm text-[var(--danger)]">Payment unavailable</p>
                <p className="t-body-sm t-pretty max-w-sm text-[var(--fg-muted)]">
                  {message ?? 'We could not open a payment session.'}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setClientSecret(null);
                    intentAmountRef.current = null;
                    setStatus('idle');
                    setMessage(null);
                    setAttempt((value) => value + 1);
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-7">
            <Checkbox
              name="billingSame"
              checked={billingSame}
              onChange={(event) => onBillingSameChange(event.target.checked)}
              label="Billing address is the same as the delivery address"
            />
            {!billingSame ? (
              <p className="t-caption mt-3 pl-7 text-[var(--fg-subtle)]">
                Enter the billing address in the payment form above.
              </p>
            ) : null}
          </div>

          <p className="t-caption mt-7 flex items-start gap-2.5 text-[var(--fg-subtle)]">
            <ShieldCheck
              size={14}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
              className="mt-0.5 shrink-0"
            />
            <span>
              Payments are processed by Stripe over an encrypted connection. Your card is
              authorised when you place the order on the next step — not before.
            </span>
          </p>
        </>
      )}

      <StepActions>
        <Button type="button" variant="quiet" size="lg" onClick={onBack}>
          Back to shipping
        </Button>
        <Button
          type="button"
          size="lg"
          className="sm:min-w-[13rem]"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Review order
        </Button>
      </StepActions>

      {mode === 'stripe' && status === 'ready' && !complete ? (
        <p className="t-caption mt-4 text-right text-[var(--fg-subtle)]">
          Complete the payment details to continue.
        </p>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- parts -- */

function elementOptions(
  billingSame: boolean,
  information: InformationValues,
  address: AddressValues,
): StripePaymentElementOptions {
  return {
    layout: { type: 'tabs', defaultCollapsed: false },
    fields: billingSame
      ? { billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' } }
      : { billingDetails: { name: 'auto', email: 'never', phone: 'never', address: 'auto' } },
    defaultValues: {
      billingDetails: {
        name: address.fullName,
        email: information.email,
        phone: information.phone,
      },
    },
  };
}

function UnconfiguredPanel({ amount, currency }: { amount: number; currency: Currency }) {
  return (
    <div className="border border-[var(--warning)] bg-[var(--bg-elevated)]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
        <p className="t-label text-[var(--fg)]">Payment is not configured</p>
        <Badge tone="warning">Demo environment</Badge>
      </div>

      <div className="px-6 py-6">
        <p className="t-body-sm t-pretty max-w-lg text-[var(--fg-muted)]">
          No payment processor is connected to this deployment, so no card can be entered and
          nothing will be charged. The rest of the order flow is fully operational: you can place a
          demo order for {formatPrice(amount, currency)} and see the confirmation exactly as a
          customer would.
        </p>
        <p className="t-body-sm t-pretty mt-4 max-w-lg text-[var(--fg-muted)]">
          The order is recorded as a demo order and is labelled as one everywhere it appears.
        </p>

        <div className="mt-6 border-t border-[var(--border)] pt-5">
          <p className="t-label-sm text-[var(--fg-subtle)]">To take live payments, set</p>
          <ul className="mt-3 flex flex-col gap-1.5">
            <li className="t-spec text-[var(--fg-muted)]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
            <li className="t-spec text-[var(--fg-muted)]">STRIPE_SECRET_KEY</li>
            <li className="t-spec text-[var(--fg-muted)]">STRIPE_WEBHOOK_SECRET</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
