import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ButtonLink } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatDate, formatPrice } from '@/lib/utils';
import { getMyOrder } from '../../data';
import { countryName } from '../../schemas';
import { DefinitionRow, Panel } from '@/components/account/AccountShell';
import { OrderStatusChip, OrderStatusTimeline } from '@/components/account/OrderStatusTimeline';
import { CopyValue } from '@/components/account/CopyValue';
import type { Address } from '@/types';

export async function generateMetadata(props: PageProps<'/account/orders/[id]'>): Promise<Metadata> {
  const { id } = await props.params;
  return {
    title: `Order ${id.toUpperCase()}`,
    description: 'Order detail, fulfilment status and tracking.',
  };
}

export default async function OrderDetailPage(props: PageProps<'/account/orders/[id]'>) {
  const [{ id }] = await Promise.all([props.params, requireUser()]);

  // Ownership is enforced twice: `getMyOrder` only ever reads rows scoped to
  // the caller, and the RLS policy refuses anything else at the database.
  const order = await getMyOrder(id);
  if (!order) notFound();

  const items = order.items;
  const units = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="flex flex-col gap-14">
      <div>
        <Link
          href="/account/orders"
          data-cursor="link"
          className="t-label inline-flex items-center gap-2 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          <ArrowLeft size={14} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
          All orders
        </Link>

        <header className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div>
            <p className="t-label-sm text-[var(--fg-subtle)]">Order</p>
            <h1 className="t-display-md mt-4 tabular-nums">{order.orderNumber}</h1>
            <p className="t-body-sm mt-4 text-[var(--fg-muted)]">
              Placed {formatDate(order.placedAt, { day: '2-digit', month: 'long', year: 'numeric' })}
              {' · '}
              {units === 1 ? '1 item' : `${units} items`}
            </p>
          </div>
          <div className="text-right">
            <OrderStatusChip status={order.status} />
            <p className="t-display-md mt-4 tabular-nums">
              {formatPrice(order.total, order.currency)}
            </p>
          </div>
        </header>
      </div>

      <div className="grid gap-x-[var(--gutter)] gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        {/* --------------------------------------------------------- items */}
        <div className="flex min-w-0 flex-col gap-14">
          <section>
            <h2 className="t-label border-b border-[var(--border)] pb-4">Items</h2>
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-6 border-b border-[var(--border)] py-6"
                >
                  <div className="relative h-28 w-24 shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--bg-sunken)]">
                    {item.image ? (
                      <Image src={item.image} alt="" fill sizes="96px" className="object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="t-h3">{item.name}</p>
                    <p className="t-body-sm mt-2 text-[var(--fg-muted)]">
                      {item.colorway}
                      {item.size ? ` · ${item.size}` : ''}
                    </p>
                    <p className="t-spec mt-3 text-[var(--fg-subtle)]">{item.sku}</p>
                  </div>

                  <div className="text-right">
                    <p className="t-price tabular-nums">
                      {formatPrice(item.unitPrice * item.quantity, order.currency)}
                    </p>
                    {item.quantity > 1 ? (
                      <p className="t-spec mt-2 text-[var(--fg-subtle)]">
                        {item.quantity} × {formatPrice(item.unitPrice, order.currency)}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-8 ml-auto max-w-[22rem]">
              <DefinitionRow label="Subtotal" mono>
                {formatPrice(order.subtotal, order.currency)}
              </DefinitionRow>
              {order.discount > 0 ? (
                <DefinitionRow label="Discount" mono>
                  −{formatPrice(order.discount, order.currency)}
                </DefinitionRow>
              ) : null}
              <DefinitionRow label="Shipping" mono>
                {order.shipping === 0 ? 'Included' : formatPrice(order.shipping, order.currency)}
              </DefinitionRow>
              {order.tax > 0 ? (
                <DefinitionRow label="Tax" mono>
                  {formatPrice(order.tax, order.currency)}
                </DefinitionRow>
              ) : null}
              <div className="flex items-baseline justify-between gap-8 border-t border-[var(--border-strong)] pt-4">
                <span className="t-label">Total</span>
                <span className="t-price-lg tabular-nums">
                  {formatPrice(order.total, order.currency)}
                </span>
              </div>
            </dl>
          </section>

          <Panel title="Status" description="Updated as the order moves through fulfilment.">
            <OrderStatusTimeline
              status={order.status}
              placedAt={order.placedAt}
              updatedAt={order.updatedAt}
              trackingNumber={order.trackingNumber}
              carrier={order.carrier}
              showTracking={false}
            />
          </Panel>
        </div>

        {/* --------------------------------------------------------- aside */}
        <aside className="flex min-w-0 flex-col gap-12">
          {order.trackingNumber ? (
            <section className="border border-[var(--border)] p-6">
              <h2 className="t-label-sm text-[var(--fg-subtle)]">
                {order.carrier ? `${order.carrier} · Tracking` : 'Tracking'}
              </h2>
              <div className="mt-3">
                <CopyValue value={order.trackingNumber} label="tracking number" />
              </div>
              <p className="t-caption t-pretty mt-4 text-[var(--fg-subtle)]">
                Carrier systems can take up to 24 hours to show a first scan.
              </p>
            </section>
          ) : null}

          <section>
            <h2 className="t-label border-b border-[var(--border)] pb-4">Delivery</h2>
            <div className="pt-5">
              <AddressBlock address={order.shippingAddress} fallback="No delivery address recorded." />
            </div>
          </section>

          <section>
            <h2 className="t-label border-b border-[var(--border)] pb-4">Billing</h2>
            <div className="pt-5">
              <AddressBlock address={order.billingAddress} fallback="Same as delivery." />
            </div>
          </section>

          <section>
            <h2 className="t-label border-b border-[var(--border)] pb-4">Reference</h2>
            <dl className="pt-2">
              <DefinitionRow label="Order number" mono>{order.orderNumber}</DefinitionRow>
              <DefinitionRow label="Placed">{formatDate(order.placedAt)}</DefinitionRow>
              <DefinitionRow label="Last update">{formatDate(order.updatedAt)}</DefinitionRow>
              <DefinitionRow label="Confirmation sent to">{order.email}</DefinitionRow>
            </dl>
            {order.notes ? (
              <div className="mt-6">
                <p className="t-label-sm text-[var(--fg-subtle)]">Delivery note</p>
                <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{order.notes}</p>
              </div>
            ) : null}
          </section>

          <section>
            <h2 className="t-label border-b border-[var(--border)] pb-4">Something wrong?</h2>
            <p className="t-body-sm t-pretty mt-5 text-[var(--fg-muted)]">
              Quote the order number and we will pick it up from there.
            </p>
            <ButtonLink href="/contact" variant="secondary" size="sm" className="mt-5">
              Contact us
            </ButtonLink>
          </section>
        </aside>
      </div>
    </div>
  );
}

function AddressBlock({
  address,
  fallback,
}: {
  address: Omit<Address, 'id' | 'userId'> | null;
  fallback: string;
}) {
  if (!address) {
    return <p className="t-body-sm text-[var(--fg-subtle)]">{fallback}</p>;
  }
  return (
    <address className="t-body-sm not-italic text-[var(--fg-muted)]">
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
  );
}
