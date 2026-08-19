import { requireAdmin } from '@/lib/auth';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatPrice } from '@/lib/utils';
import {
  EmptyRow, PageHeader, Pagination, Panel, RowLink, SearchField, StatStrip,
  TBody, TD, TH, THead, TR, Table, TableScroller,
} from '@/components/admin';
import { listCustomers } from '../_data/queries';

export const metadata = { title: 'Customers' };

const PER_PAGE = 25;

export default async function AdminCustomersPage({ searchParams }: PageProps<'/admin/customers'>) {
  await requireAdmin();
  const params = await searchParams;
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? '';
  };

  const query = one('q').trim();
  const page = Math.max(1, Number(one('page')) || 1);

  const { rows, total } = await listCustomers({ q: query, page, perPage: PER_PAGE });

  const repeat = rows.filter((row) => row.orderCount > 1).length;
  const lifetime = rows.reduce((sum, row) => sum + row.lifetimeValue, 0);
  const optedIn = rows.filter((row) => row.profile.marketingOptIn).length;

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="Commerce"
        title="Customers"
        description="Everyone with an account, ranked by lifetime value. Guest orders appear against the matching email address."
      />

      <StatStrip
        className="mt-8"
        items={[
          { label: 'Customers', value: total.toLocaleString('en-IN') },
          { label: 'Repeat buyers', value: repeat.toLocaleString('en-IN') },
          { label: 'Lifetime value', value: formatPrice(lifetime, 'INR', { compact: true }) },
          { label: 'Marketing opt-in', value: optedIn.toLocaleString('en-IN') },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SearchField
          basePath="/admin/customers"
          defaultValue={query}
          label="Search customers"
          placeholder="Name or email…"
          className="ml-auto w-full sm:w-80"
        />
      </div>

      <Panel
        className="mt-4"
        bleed
        footer={<Pagination basePath="/admin/customers" preserve={query ? { q: query } : {}} page={page} perPage={PER_PAGE} total={total} />}
      >
        <TableScroller>
          <Table caption="Customers">
            <THead>
              <TH>Customer</TH>
              <TH width="9rem">Role</TH>
              <TH align="right" width="8rem">Orders</TH>
              <TH align="right" width="11rem">Lifetime value</TH>
              <TH align="right" width="10rem">Last order</TH>
              <TH align="right" width="10rem">Joined</TH>
            </THead>
            <TBody>
              {rows.map((row) => (
                <TR key={row.profile.id}>
                  <TD>
                    <RowLink
                      href={`/admin/customers/${row.profile.id}`}
                      title={row.profile.fullName ?? row.profile.email}
                      meta={row.profile.email}
                    />
                  </TD>
                  <TD>
                    {row.profile.role === 'admin' ? (
                      <Badge tone="accent">Admin</Badge>
                    ) : (
                      <span className="t-caption text-[var(--fg-subtle)]">Customer</span>
                    )}
                  </TD>
                  <TD align="right" mono>{row.orderCount}</TD>
                  <TD align="right" mono>{formatPrice(row.lifetimeValue, 'INR')}</TD>
                  <TD align="right" mono>{row.lastOrderAt ? formatDate(row.lastOrderAt, { year: undefined }) : '—'}</TD>
                  <TD align="right" mono>{formatDate(row.profile.createdAt)}</TD>
                </TR>
              ))}
              {rows.length === 0 ? (
                <EmptyRow colSpan={6}>
                  {query ? `Nobody matches “${query}”.` : 'No customer accounts yet.'}
                </EmptyRow>
              ) : null}
            </TBody>
          </Table>
        </TableScroller>
      </Panel>
    </div>
  );
}
