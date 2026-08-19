'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { hasStripe } from '@/lib/env';
import { useCart } from '@/store/cart';
import { useToast } from '@/components/ui/Toast';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Skeleton, Spinner } from '@/components/ui/States';
import type { Currency, Order } from '@/types';

import { CHECKOUT_STEPS, StepRail } from './StepRail';
import { StepPanel } from './StepShell';
import { InformationStep } from './InformationStep';
import { ShippingStep } from './ShippingStep';
import { PaymentStep, type PaymentHandle, type PaymentMode, type PaymentStatus } from './PaymentStep';
import { ReviewStep } from './ReviewStep';
import { OrderSummary } from './OrderSummary';
import { getStripe } from './stripe';
import {
  type AddressValues,
  type InformationValues,
  type ShippingMethodId,
  addressSchema,
  checkoutTotals,
  emptyAddress,
  emptyInformation,
  estimateDelivery,
  informationSchema,
  validate,
} from './schema';
import {
  type CheckoutDraft,
  buildLocalOrder,
  buildOrderPayload,
  clearDraft,
  readDraft,
  saveDraft,
  stashOrder,
  submitOrder,
  toPayloadItems,
} from './order';

/* ==========================================================================
   CheckoutFlow — five steps, one page, one source of truth.

   All four editing steps stay mounted; only their visibility changes. That is
   what lets the Stripe Payment Element survive a trip to the review step and
   back with the card intact, and it keeps the summary in agreement with the
   form at every moment.
   ========================================================================== */

const noopSubscribe = () => () => {};

/** False for exactly one render — the cart rehydrates from localStorage. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Phase = 'idle' | 'resuming' | 'placing' | 'complete';

type PlacementError = { title: string; body: string; reference?: string | null };

/**
 * The furthest step a saved draft may be restored to. The payment element
 * cannot be rehydrated, so the flow never resumes past step three, and never
 * past a step whose prerequisites no longer validate.
 */
function restorableStep(draft: CheckoutDraft | null) {
  if (!draft) return 1;
  const informationOk = validate(informationSchema, draft.information).ok;
  const addressOk = informationOk && validate(addressSchema, draft.address).ok;
  const ceiling = addressOk ? 3 : informationOk ? 2 : 1;
  return Math.min(draft.step || 1, ceiling);
}

/** True when Stripe has sent the customer back from a redirect payment. */
function returningFromRedirect() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has('payment_intent_client_secret');
}

export function CheckoutFlow() {
  const hydrated = useHydrated();
  const router = useRouter();
  const { toast } = useToast();

  const lines = useCart((state) => state.lines);
  const discountCode = useCart((state) => state.discountCode);
  const discountPercent = useCart((state) => state.discountPercent);
  const clearCart = useCart((state) => state.clear);

  // The draft is read once, during the very first render. Output is gated on
  // `hydrated`, so restoring it here can never diverge from the server markup.
  const [draft] = useState(readDraft);

  const [step, setStep] = useState(() => restorableStep(draft));
  const [furthest, setFurthest] = useState(() => restorableStep(draft));
  const [information, setInformation] = useState<InformationValues>(
    () => draft?.information ?? emptyInformation,
  );
  const [address, setAddress] = useState<AddressValues>(() => draft?.address ?? emptyAddress);
  const [method, setMethod] = useState<ShippingMethodId>(() => draft?.method ?? 'standard');
  const [billingSame, setBillingSame] = useState(() => draft?.billingSame ?? true);
  const [notes, setNotes] = useState(() => draft?.notes ?? '');

  const [phase, setPhase] = useState<Phase>(() => (returningFromRedirect() ? 'resuming' : 'idle'));
  const [error, setError] = useState<PlacementError | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(hasStripe ? 'stripe' : 'demo');
  const [, setPaymentStatus] = useState<PaymentStatus>(hasStripe ? 'idle' : 'unconfigured');

  const paymentRef = useRef<PaymentHandle>(null);
  const startedRef = useRef(false);

  const currency: Currency = lines[0]?.currency ?? 'INR';
  const totals = useMemo(
    () => checkoutTotals(lines, discountPercent, method, address.country),
    [lines, discountPercent, method, address.country],
  );
  const items = useMemo(() => toPayloadItems(lines), [lines]);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  /* ---------------------------------------------------------- save draft */
  useEffect(() => {
    if (phase === 'complete') return;
    saveDraft({ information, address, billingSame, method, notes, step });
  }, [information, address, billingSame, method, notes, step, phase]);

  /* -------------------------------------------------- delivery estimate */
  // Derived, never stored: it depends on today's date, and the whole screen is
  // gated behind `hydrated`, so the server never quotes a stale window.
  const delivery = useMemo(() => {
    const estimate = estimateDelivery(method);
    return { earliest: estimate.earliest, latest: estimate.latest };
  }, [method]);

  /* ------------------------------------------------------------ analytics */
  useEffect(() => {
    if (!hydrated || startedRef.current || lines.length === 0) return;
    startedRef.current = true;
    track('checkout_started', { value: totals.total, currency, items: itemCount });
  }, [hydrated, lines.length, totals.total, currency, itemCount]);

  useEffect(() => {
    if (!hydrated) return;
    const record = CHECKOUT_STEPS.find((entry) => entry.id === step);
    if (record) track('checkout_step', { step, name: record.name });
  }, [hydrated, step]);

  /* --------------------------------------------------------- navigation */
  const goTo = useCallback((next: number) => {
    setStep(next);
    setFurthest((current) => Math.max(current, next));
    setError(null);
    if (typeof window !== 'undefined') {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    }
  }, []);

  const handlePaymentStatus = useCallback((status: PaymentStatus, mode: PaymentMode) => {
    setPaymentStatus(status);
    setPaymentMode(mode);
  }, []);

  /* ------------------------------------------------------------ placement */
  const completeOrder = useCallback(
    async (context: {
      paymentIntentId: string | null;
      mode: PaymentMode;
      information: InformationValues;
      address: AddressValues;
      method: ShippingMethodId;
      billingSame: boolean;
      notes: string;
    }) => {
      const state = useCart.getState();
      const currentLines = state.lines;
      if (currentLines.length === 0) {
        setPhase('idle');
        setError({
          title: 'Your bag is empty',
          body: 'The order could not be built because the bag was cleared. Nothing has been charged.',
        });
        return;
      }

      const orderTotals = checkoutTotals(
        currentLines,
        state.discountPercent,
        context.method,
        context.address.country,
      );

      const payload = buildOrderPayload({
        lines: currentLines,
        information: context.information,
        address: context.address,
        billing: context.billingSame ? context.address : null,
        method: context.method,
        totals: orderTotals,
        discountCode: state.discountCode,
        currency: currentLines[0]?.currency ?? 'INR',
        paymentIntentId: context.paymentIntentId,
        demo: context.mode === 'demo',
        notes: context.notes,
      });

      let order: Order | null = null;
      let recorded = false;

      try {
        const result = await submitOrder(payload);
        if (result.ok) {
          order = result.order;
          recorded = true;
        } else if (context.mode === 'stripe') {
          // Money has moved. Never quietly invent a record for it.
          setPhase('idle');
          setError({
            title: 'Payment taken — the order was not recorded',
            body: `${result.message} Your card has been charged. Email hello@vayro.example with the reference below and we will complete the order by hand.`,
            reference: context.paymentIntentId,
          });
          return;
        } else {
          order = buildLocalOrder(payload, currentLines);
        }
      } catch {
        if (context.mode === 'stripe') {
          setPhase('idle');
          setError({
            title: 'Payment taken — the order was not recorded',
            body: 'Your card has been charged but we could not reach the order service. Email hello@vayro.example with the reference below and we will complete the order by hand.',
            reference: context.paymentIntentId,
          });
          return;
        }
        order = buildLocalOrder(payload, currentLines);
      }

      const deliveryWindow = estimateDelivery(context.method);

      stashOrder({
        order,
        demo: context.mode === 'demo',
        recorded,
        delivery: deliveryWindow,
      });

      track('purchase', {
        orderId: order.orderNumber,
        value: orderTotals.total,
        currency: payload.currency,
        items: currentLines.reduce((sum, line) => sum + line.quantity, 0),
      });

      if (!recorded) {
        toast({
          title: 'Demo order placed',
          description: 'No payment was taken and no record was written to a server.',
          tone: 'warning',
          duration: 8000,
        });
      }

      setPhase('complete');
      clearDraft();
      router.push(`/checkout/confirmation/${order.orderNumber}`);
      clearCart();
    },
    [clearCart, router, toast],
  );

  const placeOrder = useCallback(async () => {
    setPhase('placing');
    setError(null);

    const handle = paymentRef.current;
    if (!handle) {
      setPhase('idle');
      setError({
        title: 'Payment is not ready',
        body: 'Return to the payment step and complete your details before placing the order.',
      });
      return;
    }

    const confirmation = await handle.confirm();
    if (!confirmation.ok) {
      setPhase('idle');
      setError({ title: 'Payment was not completed', body: confirmation.message });
      toast({ title: 'Payment was not completed', description: confirmation.message, tone: 'error' });
      return;
    }

    await completeOrder({
      paymentIntentId: confirmation.paymentIntentId,
      mode: confirmation.mode,
      information,
      address,
      method,
      billingSame,
      notes,
    });
  }, [address, billingSame, completeOrder, information, method, notes, toast]);

  /* -------------------------------------------- return from a redirect */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const secret = params.get('payment_intent_client_secret');
    if (!secret) return;

    // `phase` already reads 'resuming' — it was seeded from the URL before the
    // first render, so nothing has to be pushed into state here.
    let cancelled = false;

    void (async () => {
      const stripe = await getStripe();
      window.history.replaceState({}, '', '/checkout');

      if (!stripe) {
        if (!cancelled) {
          setPhase('idle');
          setError({
            title: 'We could not confirm your payment',
            body: 'Stripe.js did not load. Reload the page — you will not be charged twice.',
          });
        }
        return;
      }

      const { paymentIntent, error: retrieveError } = await stripe.retrievePaymentIntent(secret);
      if (cancelled) return;

      const draft = readDraft();
      if (retrieveError || !paymentIntent || !draft) {
        setPhase('idle');
        setError({
          title: 'We could not confirm your payment',
          body:
            retrieveError?.message ??
            'The payment session could not be read. Nothing has been charged twice — check your email for a receipt before retrying.',
        });
        return;
      }

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        await completeOrder({
          paymentIntentId: paymentIntent.id,
          mode: 'stripe',
          information: draft.information,
          address: draft.address,
          method: draft.method,
          billingSame: draft.billingSame ?? true,
          notes: draft.notes ?? '',
        });
        return;
      }

      setPhase('idle');
      setStep(3);
      setError({
        title: 'The payment was not completed',
        body: `Your bank returned "${paymentIntent.status.replace(/_/g, ' ')}". No charge was made — try again or use another method.`,
      });
    })();

    return () => {
      cancelled = true;
    };
    // Runs once: the redirect parameters are read from the URL on entry only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------------- render */

  if (!hydrated) return <CheckoutSkeleton />;

  if (phase === 'resuming') {
    return (
      <div className="shell section flex flex-col items-center gap-6 text-center">
        <Spinner size={24} />
        <div>
          <h1 className="t-h3">Confirming your payment</h1>
          <p className="t-body-sm mt-2 text-[var(--fg-muted)]">
            Do not close this window. This takes a moment.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="shell section flex flex-col items-center gap-6 text-center">
        <Spinner size={24} />
        <p className="t-body-sm text-[var(--fg-muted)]">Opening your confirmation…</p>
      </div>
    );
  }

  if (lines.length === 0 && phase === 'idle') {
    return (
      <div className="shell section-tight">
        <EmptyState
          title="There is nothing to check out"
          body="Your bag is empty. Start with the shell that folds into its own hood."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href="/shop" size="md">
                Browse equipment
              </ButtonLink>
              <ButtonLink href="/cart" variant="secondary" size="md">
                Back to cart
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="shell section-tight">
      <div className="mx-auto max-w-[76rem]">
        {/* ------------------------------------------------------ chrome -- */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/cart"
            data-cursor="link"
            className="t-label-sm group inline-flex items-center gap-2.5 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            <ArrowLeft
              size={13}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
              className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:-translate-x-1"
            />
            Back to cart
          </Link>

          <p className="t-caption inline-flex items-center gap-2 text-[var(--fg-subtle)]">
            <Lock
              size={12}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
            />
            {paymentMode === 'demo' ? 'Demo checkout — no payment processor' : 'Secure checkout by Stripe'}
          </p>
        </div>

        <StepRail current={step} furthest={furthest} onNavigate={goTo} className="mt-8" />

        {/* ----------------------------------------------- mobile summary -- */}
        <OrderSummary
          variant="disclosure"
          className="mt-8 -mx-[var(--gutter)] lg:hidden"
          lines={lines}
          totals={totals}
          currency={currency}
          method={method}
          delivery={delivery}
          editHref="/cart"
        />

        <div className="mt-10 grid gap-x-[var(--gutter)] gap-y-14 lg:mt-14 lg:grid-cols-12">
          {/* -------------------------------------------------- the form -- */}
          <div className="lg:col-span-7">
            <StepPanel active={step === 1}>
              <InformationStep
                value={information}
                onChange={setInformation}
                onContinue={() => goTo(2)}
              />
            </StepPanel>

            <StepPanel active={step === 2}>
              <ShippingStep
                address={address}
                onAddressChange={setAddress}
                method={method}
                onMethodChange={setMethod}
                merchandiseTotal={totals.merchandise}
                currency={currency}
                onBack={() => goTo(1)}
                onContinue={() => goTo(3)}
              />
            </StepPanel>

            <StepPanel active={step === 3}>
              <PaymentStep
                ref={paymentRef}
                active={step === 3}
                amount={totals.total}
                currency={currency}
                items={items}
                information={information}
                address={address}
                method={method}
                discountCode={discountCode}
                billingSame={billingSame}
                onBillingSameChange={setBillingSame}
                onStatusChange={handlePaymentStatus}
                onBack={() => goTo(2)}
                onContinue={() => goTo(4)}
              />
            </StepPanel>

            <StepPanel active={step === 4}>
              <ReviewStep
                lines={lines}
                totals={totals}
                currency={currency}
                information={information}
                address={address}
                method={method}
                billingSame={billingSame}
                delivery={delivery}
                mode={paymentMode}
                notes={notes}
                onNotesChange={setNotes}
                placing={phase === 'placing'}
                error={error}
                onEdit={goTo}
                onBack={() => goTo(3)}
                onPlace={() => void placeOrder()}
              />
            </StepPanel>

            {/* Errors raised outside the review step still need somewhere to
                be read — a declined redirect lands the customer on step 3. */}
            {error && step !== 4 ? (
              <div
                role="alert"
                className="mt-10 border border-[var(--danger)] bg-[var(--bg-elevated)] px-6 py-5"
              >
                <p className="t-label-sm text-[var(--danger)]">{error.title}</p>
                <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{error.body}</p>
              </div>
            ) : null}
          </div>

          {/* ---------------------------------------------- desktop panel -- */}
          <aside className="hidden lg:col-span-4 lg:col-start-9 lg:block">
            <OrderSummary
              className={cn('sticky', 'top-[calc(var(--header-h)+1.5rem)]')}
              lines={lines}
              totals={totals}
              currency={currency}
              method={method}
              delivery={delivery}
              editHref="/cart"
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- skeleton -- */

export function CheckoutSkeleton() {
  return (
    <div className="shell section-tight" aria-busy="true">
      <div className="mx-auto max-w-[76rem]">
        <Skeleton className="h-3 w-32" />
        <div className="mt-8 flex gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-6 flex-1" />
          ))}
        </div>
        <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-2/3" />
            <Skeleton className="h-12 w-52" />
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <Skeleton className="h-80 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
