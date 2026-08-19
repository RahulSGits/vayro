import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { formatDate, formatPrice, pluralise } from '@/lib/utils';
import {
  MetaList, OrderFulfilmentForm, OrderStatusControls, PageHeader, Panel, TBody, TD, TH, THead, TR,
  Table, TableScroller,
} from '@/components/admin';
import type { Address } from '@/types';
import { getOrderById, listProfiles } from '../../_data/queries';

export async function generateMetadata({ params }: PageProps<'/admin/orders/[id]'>) {
  const { id } = await params;
  const order = await getOrderById(id);
  return { title: order ? order.orderNumber : 'Order' };
}

function AddressBlock({ address }: { address: Omit<Address, 'id' | 'userId'> | null }) {
  if (!address) return <p className="t-body-sm text-[var(--fg-subtle)]">Not provided.</p>;
  return (
    <address className="t-body-sm not-italic text-[var(--fg-muted)]">
      <span className="block text-[var(--fg)]">{address.fullName}</span>
      <span className="block">{address.line1}</span>
      {address.line2 ? <span className="block">{address.line2}</span> : null}
      <span className="block">{address.city}, {address.region} {address.postalCode}</span>
      <span className="block">{address.country}</span>
      {address.phone ? <span className="t-spec mt-2 block">{address.phone}</span> : null}
    </address>
  );
}

export default async function AdminOrderPage({ params }: PageProps<'/admin/orders/[id]'>) {
  await requireAdmin();
  const { id } = await params;

  const order = await getOrderById(id);
  if (!order) notFound();

  const profiles = await listProfiles();
  const customer = profiles.find(
    (profile) => profile.id === order.userId || profile.email.toLowerCase() === order.email.toLowerCase(),
  );

  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const money = (value: number) => formatPrice(value, order.currency);

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Commerce"
        title={order.orderNumber}
        description={`${pluralise(units, 'unit')} · placed ${formatDate(order.placedAt, { hour: '2-digit', minute: '2-digit' })}`}
        back={{ href: '/admin/orders', label: 'Orders' }}
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------------ items */}
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Items" bleed>
            <TableScroller>
              <Table caption={`Items in order ${order.orderNumber}`} className="min-w-[38rem]">
                <THead>
                  <TH>Item</TH>
                  <TH width="10rem">SKU</TH>
                  <TH align="right" width="6rem">Qty</TH>
                  <TH align="right" width="8rem">Unit</TH>
                  <TH align="right" width="8rem">Line</TH>
                </THead>
                <TBody>
                  {order.items.map((item) => (
                    <TR key={item.id}>
                      <TD>
                        <span className="flex items-center gap-4">
                          <span className="relative h-14 w-11 shrink-0 overflow-hidden bg-[var(--bg-sunken)]">
                            {item.image?.startsWith('/') ? (
                              <Image src={item.image} alt="" fill sizes="44px" className="object-cover" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-[var(--fg)]">{item.name}</span>
                            <span className="t-caption block truncate text-[var(--fg-subtle)]">
                              {item.colorway} · {item.size}
                            </span>
                          </span>
                        </span>
                      </TD>
                      <TD mono>{item.sku}</TD>
                      <TD align="right" mono>{item.quantity}</TD>
                      <TD align="right" mono>{money(item.unitPrice)}</TD>
                      <TD align="right" mono>{money(item.unitPrice * item.quantity)}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableScroller>

            <dl className="border-t border-[var(--border)] px-5 py-4">
              {[
                { label: 'Subtotal', value: money(order.subtotal) },
                ...(order.discount ? [{ label: 'Discount', value: `− ${money(order.discount)}` }] : []),
                { label: 'Shipping', value: order.shipping === 0 ? 'Free' : money(order.shipping) },
                { label: 'Tax', value: money(order.tax) },
              ].map((line) => (
                <div key={line.label} className="flex justify-between py-1.5">
                  <dt className="t-body-sm text-[var(--fg-muted)]">{line.label}</dt>
                  <dd className="t-spec">{line.value}</dd>
                </div>
              ))}
              <div className="mt-2 flex justify-between border-t border-[var(--border)] pt-3">
                <dt className="t-label">Total</dt>
                <dd className="t-price">{money(order.total)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="Fulfilment"
            description="Tracking details are shown to the customer once the order is marked shipped."
          >
            <OrderFulfilmentForm order={order} />
          </Panel>
        </div>

        {/* ------------------------------------------------------------ aside */}
        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Status">
            <OrderStatusControls order={order} />
          </Panel>

          <Panel title="Customer">
            <MetaList
              items={[
                {
                  label: 'Email',
                  value: customer ? (
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="underline decoration-[var(--border-strong)] underline-offset-[5px] transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
                    >
                      {order.email}
                    </Link>
                  ) : order.email,
                },
                { label: 'Account', value: order.userId ? 'Registered' : 'Guest checkout' },
                { label: 'Order placed', value: formatDate(order.placedAt, { hour: '2-digit', minute: '2-digit' }) },
                { label: 'Last updated', value: formatDate(order.updatedAt, { hour: '2-digit', minute: '2-digit' }) },
              ]}
            />
          </Panel>

          <Panel title="Shipping address">
            <AddressBlock address={order.shippingAddress} />
          </Panel>

          <Panel title="Billing address">
            <AddressBlock address={order.billingAddress} />
          </Panel>

          <Panel title="Payment">
            <MetaList
              items={[
                { label: 'Currency', value: order.currency, mono: true },
                {
                  label: 'Refund',
                  value: order.status === 'refunded'
                    ? `Refunded in full — ${money(order.total)}`
                    : 'No refund recorded',
                },
                {
                  label: 'Carrier',
                  value: order.carrier ?? 'Not assigned',
                },
                {
                  label: 'Tracking',
                  value: order.trackingNumber ?? 'Not assigned',
                  mono: true,
                },
              ]}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
