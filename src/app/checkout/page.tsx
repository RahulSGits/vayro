import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/checkout/CheckoutFlow';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your VAYRO order.',
  alternates: { canonical: '/checkout' },
  // Nothing about a checkout session belongs in an index.
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
