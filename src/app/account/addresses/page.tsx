import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { getMyAddresses } from '../data';
import { PageHeading } from '@/components/account/AccountShell';
import { AddressBook } from '@/components/account/AddressBook';

export const metadata: Metadata = {
  title: 'Addresses',
  description: 'Saved delivery and billing addresses.',
};

export default async function AddressesPage() {
  const { demo } = await requireUser();
  const addresses = await getMyAddresses();

  return (
    <div className="flex flex-col gap-14">
      <PageHeading
        eyebrow="Addresses"
        title="Where things go"
        lede="Save the places you actually receive parcels. One is the default; the rest are a click away at checkout."
      />

      <AddressBook addresses={addresses} demo={demo} />
    </div>
  );
}
