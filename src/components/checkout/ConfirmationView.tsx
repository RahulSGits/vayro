'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn, formatDate, formatPrice, pluralise } from '@/lib/utils';
import { t } from '@/lib/motion';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/States';
import { VayroMark } from '@/components/brand';
import { StepRail } from './StepRail';
import { type StoredOrder, fetchOrder, readStashedOrder } from './order';
import { countryFor } from './schema';

/* ==========================================================================
   Step 05 — Confirmation.

   The order is read from the session first — it was written there the moment
   it was placed, so this screen paints instantly and works even when the
   order service is unreachable. Failing that, the API is asked. Failing both,
   the screen says exactly what it does and does not know.
   ========================================================================== */

export type ConfirmationViewProps = { orderNumber: string };

type State =
  | { status: 'loading' }
  | { status: 'found'; record: StoredOrder }
  | { status: 'missing' };

const noopSubscribe = () => () => {};

/** False for exactly one render — the session store is browser-only. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function ConfirmationView({ orderNumber }: ConfirmationViewProps) {
  const hydrated = useHydrated();

  // Read on the first render rather than in an effect: the order was written
  // to the session the instant it was placed, so this paints without a flash.
  // The screen is gated on `hydrated`, so the server markup still matches.
  const [state, setState] = useState<State>(() => {
    const stashed = readStashedOrder(orderNumber);
    return stashed ? { status: 'found', record: stashed } : { status: 'loading' };
  });

  useEffect(() => {
    if (state.status !== 'loading') return;

    let cancelled = false;
    void fetchOrder(orderNumber).then((order) => {
      if (cancelled) return;
      setState(
        order
          ? {
              status: 'found',
              record: {
                order,
                demo: false,
                recorded: true,
                delivery: { earliest: '', latest: '', despatch: '' },
              },
            }
          : { status: 'missing' },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [orderNumber, state.status]);

  if (!hydrated || state.status === 'loading') return <ConfirmationSkeleton />;

  if (state.status === 'missing') {
    return (
      <div className="shell section-tight">
        <div className="mx-auto max-w-[76rem]">
          <StepRail current={5} />
          <EmptyState
            className="mt-10"
            title="We cannot show this order here"
            body={`Order ${orderNumber} is not available in this browser session. If you placed it, the confirmation is in your email. Signing in shows every order on your account.`}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <ButtonLink href="/account" size="md">
                  Sign in to view orders
                </ButtonLink>
                <ButtonLink href="/shop" variant="secondary" size="md">
                  Continue shopping
                </ButtonLink>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return <ConfirmationBody record={state.record} />;
}

/* ------------------------------------------------------------------ body -- */

function ConfirmationBody({ record }: { record: StoredOrder }) {
  const { order, demo, recorded, delivery } = record;
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const hasWindow = Boolean(delivery.earliest && delivery.latest);

  return (
    <div className="shell section-tight">
      <div className="mx-auto max-w-[76rem]">
        <StepRail current={5} />

        {/* ------------------------------------------------------- head -- */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: t.slow }}
          className="mt-12 border-b border-[var(--border)] pb-12"
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="t-label-sm text-[var(--fg-subtle)]">{demo ? 'Placed' : 'Confirmed'}</p>
            {demo ? <Badge tone="warning">Demo order</Badge> : null}
            {!recorded ? <Badge tone="outline">Not recorded on a server</Badge> : null}
          </div>

          <h1 className="t-display-md t-balance mt-6 max-w-2xl">
            {demo ? 'Demo order placed.' : 'Your order is in.'}
          </h1>

          <dl className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-4">
            <div>
              <dt className="t-label-sm text-[var(--fg-subtle)]">Order</dt>
              <dd className="t-spec mt-1.5 text-[var(--fg)]">{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="t-label-sm text-[var(--fg-subtle)]">Placed</dt>
              <dd className="t-spec mt-1.5 text-[var(--fg)]">{formatDate(order.placedAt)}</dd>
            </div>
            <div>
              <dt className="t-label-sm text-[var(--fg-subtle)]">Total</dt>
              <dd className="t-spec mt-1.5 text-[var(--fg)]">
                {formatPrice(order.total, order.currency)}
              </dd>
            </div>
            <div>
              <dt className="t-label-sm text-[var(--fg-subtle)]">Items</dt>
              <dd className="t-spec mt-1.5 text-[var(--fg)]">{pluralise(itemCount, 'piece')}</dd>
            </div>
          </dl>
        </motion.header>

        {demo || !recorded ? (
          <div className="mt-8 border border-[var(--warning)] bg-[var(--bg-elevated)] px-6 py-5">
            <p className="t-label-sm text-[var(--warning)]">
              {demo ? 'Demo order — no payment was taken' : 'This order was not recorded'}
            </p>
            <p className="t-body-sm t-pretty mt-2 max-w-2xl text-[var(--fg-muted)]">
              {demo
                ? 'No payment processor is configured in this environment, so no card was charged and nothing will be despatched.'
                : 'The payment succeeded but the order service could not be reached, so this record exists only in your browser.'}{' '}
              No email has been sent.
            </p>
          </div>
        ) : null}

        <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-14 lg:grid-cols-12">
          {/* ---------------------------------------------------- items -- */}
          <section className="lg:col-span-7">
            <h2 className="t-label text-[var(--fg-muted)]">What is coming</h2>
            <ul className="mt-6 border-t border-[var(--border)]">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-5 border-b border-[var(--border)] py-6">
                  <div className="relative h-[6.5rem] w-20 shrink-0 overflow-hidden bg-[var(--bg-sunken)]">
                    {item.image && item.image.startsWith('/') ? (
                      <Image src={item.image} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center">
                        <VayroMark size={18} className="text-[var(--fg-subtle)]" />
                      </span>
                    )}
                  </div>
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[var(--fg)]">{item.name}</p>
                      <p className="t-spec mt-1.5 text-[var(--fg-subtle)]">
                        {item.colorway} / {item.size}
                      </p>
                      <p className="t-caption mt-2 text-[var(--fg-subtle)]">Qty {item.quantity}</p>
                    </div>
                    <p className="t-price shrink-0 text-[var(--fg)]">
                      {formatPrice(item.unitPrice * item.quantity, order.currency)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {/* -------------------------------------------- next steps -- */}
            <section className="mt-14">
              <h2 className="t-label text-[var(--fg-muted)]">Next</h2>
              <ol className="mt-6 border-t border-[var(--border)]">
                <NextStep
                  index={1}
                  title={recorded ? 'Confirmation' : 'No confirmation email'}
                  body={
                    recorded
                      ? `A receipt goes to ${order.email}. Check the spam folder if it has not arrived within the hour.`
                      : 'Because this order was not recorded, no receipt was generated.'
                  }
                />
                <NextStep
                  index={2}
                  title="Despatch"
                  body={
                    demo
                      ? 'A live order would leave the workshop within two working days.'
                      : 'Your order leaves the workshop within two working days.'
                  }
                />
                <NextStep
                  index={3}
                  title="On the way"
                  body={
                    hasWindow
                      ? `Tracking is emailed at despatch. Estimated arrival ${formatDate(delivery.earliest, { year: undefined })} – ${formatDate(delivery.latest)}.`
                      : 'Tracking is emailed the moment the parcel is collected.'
                  }
                />
              </ol>
            </section>

            <div className="mt-12 flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">
                Continue shopping
              </ButtonLink>
              <ButtonLink href="/account" variant="secondary" size="lg">
                View your orders
              </ButtonLink>
            </div>
          </section>

          {/* -------------------------------------------------- details -- */}
          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)]">
              <h2 className="t-label border-b border-[var(--border)] px-6 py-5 text-[var(--fg)]">
                Order detail
              </h2>

              <div className="px-6 py-6">
                <dl className="flex flex-col gap-2.5">
                  <DetailRow
                    label="Subtotal"
                    value={formatPrice(order.subtotal, order.currency)}
                  />
                  {order.discount > 0 ? (
                    <DetailRow
                      label="Discount"
                      value={`− ${formatPrice(order.discount, order.currency)}`}
                      tone="positive"
                    />
                  ) : null}
                  <DetailRow
                    label="Shipping"
                    value={order.shipping === 0 ? 'Free' : formatPrice(order.shipping, order.currency)}
                  />
                  <div className="mt-3.5 flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-6">
                    <dt className="t-label text-[var(--fg-muted)]">Total</dt>
                    <dd className="t-price-lg text-[var(--fg)]">
                      {formatPrice(order.total, order.currency)}
                    </dd>
                  </div>
                </dl>

                {order.shippingAddress ? (
                  <div className="mt-8 border-t border-[var(--border)] pt-6">
                    <p className="t-label-sm text-[var(--fg-subtle)]">Ship to</p>
                    <address className="t-body-sm mt-3 not-italic text-[var(--fg-muted)]">
                      <span className="block text-[var(--fg)]">
                        {order.shippingAddress.fullName}
                      </span>
                      <span className="block">{order.shippingAddress.line1}</span>
                      {order.shippingAddress.line2 ? (
                        <span className="block">{order.shippingAddress.line2}</span>
                      ) : null}
                      <span className="block">
                        {order.shippingAddress.city}, {order.shippingAddress.region}
                      </span>
                      <span className="block">{order.shippingAddress.postalCode}</span>
                      <span className="block">
                        {countryFor(order.shippingAddress.country).name}
                      </span>
                      {order.shippingAddress.phone ? (
                        <span className="t-spec mt-2 block text-[var(--fg-subtle)]">
                          {order.shippingAddress.phone}
                        </span>
                      ) : null}
                    </address>
                  </div>
                ) : null}

                <div className="mt-8 border-t border-[var(--border)] pt-6">
                  <p className="t-label-sm text-[var(--fg-subtle)]">Contact</p>
                  <p className="t-body-sm mt-3 break-words text-[var(--fg-muted)]">{order.email}</p>
                </div>

                {order.notes ? (
                  <div className="mt-8 border-t border-[var(--border)] pt-6">
                    <p className="t-label-sm text-[var(--fg-subtle)]">Delivery notes</p>
                    <p className="t-body-sm t-pretty mt-3 text-[var(--fg-muted)]">{order.notes}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <p className="t-caption t-pretty mt-6 text-[var(--fg-subtle)]">
              Something not right?{' '}
              {recorded ? <>Reply to the confirmation email or write to </> : <>Write to </>}
              <Link
                href="/contact"
                className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
              >
                our team
              </Link>{' '}
              quoting {order.orderNumber}.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- parts -- */

function NextStep({ index, title, body }: { index: number; title: string; body: string }) {
  return (
    <li className="flex gap-5 border-b border-[var(--border)] py-5">
      <span className="t-spec shrink-0 text-[var(--fg-subtle)]">
        {String(index).padStart(2, '0')}
      </span>
      <div className="min-w-0">
        <p className="t-label text-[var(--fg)]">{title}</p>
        <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{body}</p>
      </div>
    </li>
  );
}

function DetailRow({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-body-sm text-[var(--fg-muted)]">{label}</dt>
      <dd
        className={cn(
          't-body-sm tabular-nums',
          tone === 'positive' ? 'text-[var(--positive)]' : 'text-[var(--fg)]',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ConfirmationSkeleton() {
  return (
    <div className="shell section-tight" aria-busy="true">
      <div className="mx-auto max-w-[76rem]">
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-6 flex-1" />
          ))}
        </div>
        <Skeleton className="mt-12 h-12 w-3/4 max-w-lg" />
        <div className="mt-8 flex flex-wrap gap-10">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-24" />
          ))}
        </div>
        <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-7">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
