import { ButtonLink, EmptyState } from '@/components/ui';

/**
 * Reached when the reference does not match an order on this account — which
 * includes someone else's order. The copy is deliberately identical either
 * way: confirming that an order number exists but belongs to another customer
 * would be an enumeration oracle.
 */
export default function OrderNotFound() {
  return (
    <EmptyState
      title="No order with that reference"
      body="Check the number in your confirmation email — it looks like VY-01047. Orders placed as a guest do not appear in an account."
      action={
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/account/orders" size="md">All orders</ButtonLink>
          <ButtonLink href="/contact" variant="secondary" size="md">Contact us</ButtonLink>
        </div>
      }
    />
  );
}
