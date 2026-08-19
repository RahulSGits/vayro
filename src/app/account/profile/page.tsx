import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { DefinitionRow, PageHeading, Panel } from '@/components/account/AccountShell';
import { ProfileForm } from '@/components/account/ProfileForm';

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Your name, contact details and account record.',
};

export default async function ProfilePage() {
  const { profile, user, demo } = await requireUser();

  return (
    <div className="flex flex-col gap-14">
      <PageHeading
        eyebrow="Profile"
        title="Your details"
        lede="What we need to get an order to you, and nothing more."
      />

      <Panel title="Personal details" description="Saved against your account and reused at checkout.">
        <ProfileForm profile={profile} demo={demo} />
      </Panel>

      <Panel title="Account record">
        <dl className="max-w-[28rem]">
          <DefinitionRow label="Account opened">{formatDate(profile.createdAt)}</DefinitionRow>
          <DefinitionRow label="Sign-in method">
            {user.provider === 'email' ? 'Email and password' : `${user.provider} account`}
          </DefinitionRow>
          <DefinitionRow label="Email confirmed">
            {user.emailConfirmed ? 'Yes' : 'Not yet'}
          </DefinitionRow>
          {user.lastSignInAt ? (
            <DefinitionRow label="Last sign-in">{formatDate(user.lastSignInAt)}</DefinitionRow>
          ) : null}
          <DefinitionRow label="Role" mono>{profile.role}</DefinitionRow>
        </dl>
      </Panel>
    </div>
  );
}
