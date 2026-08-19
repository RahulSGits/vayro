import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatPrice, pluralise } from '@/lib/utils';
import {
  ActionButtonForm, EmptyRow, MetaList, OrderStatusPill, PageHeader, Panel, RowLink, StatStrip,
  TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import { getCustomer } from '../../_data/queries';
import { setCustomerRole } from '../../actions';

export async function generateMetadata({ params }: PageProps<'/admin/customers/[id]'>) {
  const { id } = await params;
  const record = await getCustomer(id);
  return { title: record ? record.profile.fullName ?? record.profile.email : 'Customer' };
}

export default async function AdminCustomerPage({ params }: PageProps<'/admin/customers/[id]'>) {
  const { profile: viewer } = await requireAdmin();
  const { id } = await params;

  const record = await getCustomer(id);
  if (!record) notFound();

  const { profile, orders, addresses, summary } = record;
  const units = orders.reduce(
    (sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0,
  );
  const averageOrder = summary.orderCount ? Math.round(summary.lifetimeValue / summary.orderCount) : 0;
  const isSelf = profile.id === viewer.id;

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Commerce"
        title={profile.fullName ?? profile.email}
        description={profile.fullName ? profile.email : undefined}
        back={{ href: '/admin/customers', label: 'Customers' }}
        actions={
          <>
            {profile.role === 'admin' ? <Badge tone="accent">Administrator</Badge> : null}
            {isSelf ? (
              <span className="t-caption text-[var(--fg-subtle)]">This is your own account.</span>
            ) : (
              <ActionButtonForm
                action={setCustomerRole}
                fields={{ id: profile.id, role: profile.role === 'admin' ? 'customer' : 'admin' }}
                variant={profile.role === 'admin' ? 'danger' : 'secondary'}
                size="sm"
                confirm={
                  profile.role === 'admin'
                    ? `Revoke administrator access for ${profile.email}?`
                    : `Grant full administrator access to ${profile.email}? They will be able to edit the catalogue, orders and settings.`
                }
              >
                {profile.role === 'admin' ? 'Revoke admin' : 'Make admin'}
              </ActionButtonForm>
            )}
          </>
        }
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'Orders', value: summary.orderCount.toLocaleString('en-IN') },
          { label: 'Lifetime value', value: formatPrice(summary.lifetimeValue, 'INR') },
          { label: 'Average order', value: formatPrice(averageOrder, 'INR') },
          { label: 'Units bought', value: units.toLocaleString('en-IN') },
        ]}
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="Order history" bleed>
          <TableScroller>
            <Table caption={`Orders placed by ${profile.email}`} className="min-w-[38rem]">
              <THead>
                <TH width="9rem">Order</TH>
                <TH width="10rem">Status</TH>
                <TH>Items</TH>
                <TH align="right" width="9rem">Placed</TH>
                <TH align="right" width="8rem">Total</TH>
              </THead>
              <TBody>
                {orders.map((order) => (
                  <TR key={order.id}>
                    <TD mono><RowLink href={`/admin/orders/${order.id}`} title={order.orderNumber} /></TD>
                    <TD><OrderStatusPill status={order.status} /></TD>
                    <TD>
                      <span className="block truncate">{order.items[0]?.name ?? '—'}</span>
                      <span className="t-caption block text-[var(--fg-subtle)]">
                        {pluralise(order.items.reduce((sum, item) => sum + item.quantity, 0), 'unit')}
                      </span>
                    </TD>
                    <TD align="right" mono>{formatDate(order.placedAt, { year: undefined })}</TD>
                    <TD align="right" mono>{formatPrice(order.total, order.currency)}</TD>
                  </TR>
                ))}
                {orders.length === 0 ? (
                  <EmptyRow colSpan={5}>No orders against this account yet.</EmptyRow>
                ) : null}
              </TBody>
            </Table>
          </TableScroller>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel title="Profile">
            <MetaList
              items={[
                { label: 'Identifier', value: profile.id, mono: true },
                { label: 'Email', value: profile.email },
                { label: 'Phone', value: profile.phone ?? 'Not provided', mono: Boolean(profile.phone) },
                { label: 'Role', value: profile.role },
                { label: 'Marketing consent', value: profile.marketingOptIn ? 'Opted in' : 'Not opted in' },
                { label: 'Joined', value: formatDate(profile.createdAt) },
                { label: 'Last order', value: summary.lastOrderAt ? formatDate(summary.lastOrderAt) : 'Never' },
              ]}
            />
          </Panel>

          <Panel title="Addresses">
            {addresses.length === 0 ? (
              <p className="t-body-sm text-[var(--fg-subtle)]">No saved addresses.</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {addresses.map((address) => (
                  <li key={address.id}>
                    <p className="t-label-sm mb-2 text-[var(--fg-subtle)]">
                      {address.label ?? 'Address'}
                      {address.isDefaultShipping ? ' · default shipping' : ''}
                    </p>
                    <address className="t-body-sm not-italic text-[var(--fg-muted)]">
                      <span className="block text-[var(--fg)]">{address.fullName}</span>
                      <span className="block">{address.line1}</span>
                      {address.line2 ? <span className="block">{address.line2}</span> : null}
                      <span className="block">{address.city}, {address.region} {address.postalCode}</span>
                      <span className="block">{address.country}</span>
                    </address>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
