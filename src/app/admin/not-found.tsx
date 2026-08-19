import { ButtonLink } from '@/components/ui/Button';

/** Reached when a record id in the URL does not resolve to anything. */
export default function AdminNotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center py-16">
      <p className="t-label-sm text-[var(--fg-subtle)]">404</p>
      <h1 className="t-h1 t-balance mt-5 max-w-[22ch]">That record does not exist.</h1>
      <p className="t-body-sm t-pretty mt-4 max-w-[54ch] text-[var(--fg-muted)]">
        It may have been deleted, or the identifier in the address may be incomplete. The lists below
        are the reliable way back in.
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <ButtonLink href="/admin" size="sm">Dashboard</ButtonLink>
        <ButtonLink href="/admin/products" variant="secondary" size="sm">Products</ButtonLink>
        <ButtonLink href="/admin/orders" variant="secondary" size="sm">Orders</ButtonLink>
      </div>
    </div>
  );
}
