import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/utils';
import { DefinitionRow, PageHeading, Panel } from '@/components/account/AccountShell';
import { ThemeControl } from '@/components/account/ThemeControl';
import { PreferencesForm } from '@/components/account/PreferencesForm';
import { PasswordChangeForm } from '@/components/account/PasswordChangeForm';
import { SignOutButton } from '@/components/account/SignOutButton';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Appearance, email preferences and account security.',
};

export default async function SettingsPage() {
  const { profile, user, demo } = await requireUser();

  return (
    <div className="flex flex-col gap-14">
      <PageHeading
        eyebrow="Settings"
        title="How the site behaves"
        lede="Appearance, what lands in your inbox, and the credentials that open the account."
      />

      <Panel
        title="Appearance"
        description="Applied before the first frame renders, so it survives a reload without a flash."
      >
        <ThemeControl />
      </Panel>

      <Panel title="Email" description="What we send, and what we do not.">
        <PreferencesForm marketingOptIn={profile.marketingOptIn} demo={demo} />
      </Panel>

      <Panel
        title="Password"
        description="Changing it here does not sign out your other devices — those sessions run until they expire."
      >
        <PasswordChangeForm provider={user.provider} demo={demo} />
      </Panel>

      <Panel title="Session" description="This browser, on this device.">
        <div className="flex flex-col gap-8">
          <dl className="max-w-[28rem]">
            <DefinitionRow label="Signed in as">{profile.email}</DefinitionRow>
            <DefinitionRow label="Method">
              {user.provider === 'email' ? 'Email and password' : `${user.provider} account`}
            </DefinitionRow>
            {user.lastSignInAt ? (
              <DefinitionRow label="Since">{formatDate(user.lastSignInAt)}</DefinitionRow>
            ) : null}
          </dl>
          <SignOutButton />
        </div>
      </Panel>

      <Panel
        title="Closing your account"
        description="Deletion removes your profile, addresses and wishlist. Order records are retained for the statutory period."
      >
        <p className="t-body-sm t-pretty max-w-[32rem] text-[var(--fg-muted)]">
          Account deletion is handled by a person rather than a button, so that
          an accidental click cannot take an order history with it. Write to{' '}
          <a
            href="mailto:privacy@vayro.example?subject=Account%20deletion"
            className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
          >
            privacy@vayro.example
          </a>{' '}
          from the address on the account and it is actioned within 30 days.
        </p>
      </Panel>
    </div>
  );
}
