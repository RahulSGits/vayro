import type { Metadata } from 'next';
import { ConfirmationView } from '@/components/checkout/ConfirmationView';

/* Route params are asynchronous in Next 16 — always awaited, never read raw. */
type ConfirmationParams = { params: Promise<{ orderNumber: string }> };

export async function generateMetadata({ params }: ConfirmationParams): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${decodeURIComponent(orderNumber)}`,
    description: 'Your VAYRO order confirmation.',
    robots: { index: false, follow: false, nocache: true },
  };
}

export default async function ConfirmationPage({ params }: ConfirmationParams) {
  const { orderNumber } = await params;
  return <ConfirmationView orderNumber={decodeURIComponent(orderNumber)} />;
}
