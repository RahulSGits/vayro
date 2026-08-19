import type { Metadata } from 'next';
import Link from 'next/link';
import { ButtonLink, EmptyState } from '@/components/ui';
import { requireUser } from '@/lib/auth';
import { formatDate, formatPrice } from '@/lib/utils';
import { getMyAddresses, getMyOrders, profileCompleteness } from './data';
import { DefinitionRow, PageHeading, Panel, StatFigure } from '@/components/account/AccountShell';
import { OrderStatusTimeline } from '@/components/account/OrderStatusTimeline';
import { OrderSummary } from '@/components/account/OrderSummary';
import { WishlistSummary } from '@/components/account/WishlistSummary';
import { countryName } from './schemas';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Your recent order, saved pieces and account details.',
};

const NOTICES: Record<string, { label: string; body: string }> = {
  'admin-only': {
    label: 'Not available',
    body: 'The admin area is restricted to staff accounts. Your account does not have that role.',
  },
};

export default async function AccountOverviewPage(props: PageProps<'/account'>) {
  const [searchParams, { profile, user }] = await Promise.all([props.searchParams, requireUser()]);
  const [orders, addresses] = await Promise.all([getMyOrders(), getMyAddresses()]);

  const noticeKey = typeof searchParams.notice === 'string' ? searchParams.notice : null;
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;

  const recent = orders[0];
  const completeness = profileCompleteness(profile, addresses, user.emailConfirmed);
  const defaultAddress = addresses.find((address) => address.isDefaultShipping) ?? addresses[0];

  const lifetime = orders
    .filter((order) => order.status !== 'cancelled' && order.status !== 'refunded')
    .reduce((total, order) => total + order.total, 0);

  return (
    <div className="flex flex-col gap-16">
      <PageHeading
        eyebrow="Overview"
        title={recent ? 'Where things stand' : 'Nothing in transit'}
        lede={
          recent
            ? 'Your most recent order, and everything the account knows about you.'
            : 'When you place an order it will appear here with a live status.'
        }
      />

      {notice ? (
        <div className="relative border border-[var(--border)] py-5 pr-5 pl-6" role="status">
          <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-[var(--warning)]" />
          <p className="t-label-sm text-[var(--warning)]">{notice.label}</p>
          <p className="t-body-sm t-pretty mt-2 max-w-[40rem] text-[var(--fg-muted)]">{notice.body}</p>
        </div>
      ) : null}

      {/* ------------------------------------------------------- figures -- */}
      <div className="grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        <StatFigure
          label="Orders"
          value={String(orders.length)}
          note={
            orders.length === 0
              ? 'No orders on this account yet.'
              : `${formatPrice(lifetime, orders[0].currency)} across all orders.`
          }
          href={orders.length > 0 ? '/account/orders' : undefined}
        />
        <WishlistSummary />
        <StatFigure
          label="Profile"
          value={`${completeness.percent}%`}
          note={
            completeness.missing.length === 0
              ? 'Everything we need is on file.'
              : `${completeness.done} of ${completeness.total} details complete.`
          }
          href={completeness.missing.length > 0 ? completeness.missing[0].href : '/account/profile'}
        />
      </div>

      {/* -------------------------------------------------- recent order -- */}
      {recent ? (
        <Panel
          title="Most recent order"
          description={`Placed ${formatDate(recent.placedAt)}.`}
          action={
            <ButtonLink href={`/account/orders/${recent.orderNumber}`} variant="secondary" size="sm">
              Order detail
            </ButtonLink>
          }
        >
          <div className="grid gap-x-[var(--gutter)] gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
            <div className="min-w-0">
              <OrderStatusTimeline
                status={recent.status}
                placedAt={recent.placedAt}
                updatedAt={recent.updatedAt}
                trackingNumber={recent.trackingNumber}
                carrier={recent.carrier}
              />
            </div>

            <dl className="min-w-0">
              <DefinitionRow label="Order" mono>{recent.orderNumber}</DefinitionRow>
              <DefinitionRow label="Items">
                {recent.items.map((item) => item.name).join(', ')}
              </DefinitionRow>
              <DefinitionRow label="Total" mono>
                {formatPrice(recent.total, recent.currency)}
              </DefinitionRow>
              {recent.shippingAddress ? (
                <DefinitionRow label="Shipping to">
                  {recent.shippingAddress.city}, {countryName(recent.shippingAddress.country)}
                </DefinitionRow>
              ) : null}
            </dl>
          </div>

          {orders.length > 1 ? (
            <div className="mt-14">
              <p className="t-label-sm mb-4 text-[var(--fg-subtle)]">Earlier</p>
              {orders.slice(1, 3).map((order) => (
                <OrderSummary key={order.id} order={order} />
              ))}
              {orders.length > 3 ? (
                <Link
                  href="/account/orders"
                  className="t-label mt-6 inline-block text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-[6px] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] hover:decoration-[var(--fg)]"
                >
                  All {orders.length} orders
                </Link>
              ) : null}
            </div>
          ) : null}
        </Panel>
      ) : (
        <Panel title="Orders">
          <EmptyState
            title="No orders yet"
            body="Once you place an order, its status and tracking live here."
            action={<ButtonLink href="/shop" size="md">Browse the shop</ButtonLink>}
          />
        </Panel>
      )}

      {/* --------------------------------------------------- completeness -- */}
      {completeness.missing.length > 0 ? (
        <Panel
          title="Finish your profile"
          description="Each of these removes a step from your next checkout."
        >
          <ul className="border-t border-[var(--border)]">
            {completeness.missing.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  data-cursor="link"
                  className="group flex items-center justify-between gap-6 border-b border-[var(--border)] py-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
                >
                  <span className="t-body-sm text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] group-hover:text-[var(--fg)]">
                    {item.label}
                  </span>
                  <span className="t-label-sm text-[var(--fg-subtle)]">Add</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {/* -------------------------------------------------------- address -- */}
      <Panel
        title="Default delivery address"
        action={
          <ButtonLink href="/account/addresses" variant="quiet" size="sm">
            {addresses.length > 0 ? 'Manage' : 'Add address'}
          </ButtonLink>
        }
      >
        {defaultAddress ? (
          <address className="t-body-sm max-w-[24rem] not-italic text-[var(--fg-muted)]">
            <span className="block text-[var(--fg)]">{defaultAddress.fullName}</span>
            {defaultAddress.line1}
            {defaultAddress.line2 ? <>, {defaultAddress.line2}</> : null}
            <br />
            {defaultAddress.city}, {defaultAddress.region} {defaultAddress.postalCode}
            <br />
            {countryName(defaultAddress.country)}
            {defaultAddress.phone ? (
              <>
                <br />
                <span className="t-spec">{defaultAddress.phone}</span>
              </>
            ) : null}
          </address>
        ) : (
          <p className="t-body-sm text-[var(--fg-muted)]">
            No address on file. Adding one makes checkout a single step.
          </p>
        )}
      </Panel>
    </div>
  );
}
