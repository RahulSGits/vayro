import { requireAdmin } from '@/lib/auth';
import {
  env, hasAnalytics, hasResend, hasServiceRole, hasStripe, hasStripeSecret, hasSupabase,
} from '@/lib/env';
import { formatPrice } from '@/lib/utils';
import {
  AnalyticsSettingsForm, BrandSettingsForm, EmailSettingsForm, MetaList, PageHeader, Panel,
  ShippingSettingsForm, TaxSettingsForm,
} from '@/components/admin';
import { formatBasisPoints } from '../_data/settings';
import { adminContext, getSettings } from '../_data/queries';

export const metadata = { title: 'Settings' };

/**
 * Integration status is derived from the `has*` flags in `@/lib/env`. Those are
 * booleans by construction — no key, token or secret is ever read into this
 * page, let alone rendered.
 */
function IntegrationRow({
  name,
  description,
  configured,
  detail,
}: {
  name: string;
  description: string;
  configured: boolean;
  detail?: string;
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="font-medium">{name}</p>
        <p className="t-caption t-pretty mt-1 max-w-[52ch] text-[var(--fg-muted)]">{description}</p>
        {detail ? <p className="t-spec mt-2 text-[var(--fg-subtle)]">{detail}</p> : null}
      </div>
      <span className="t-label-sm inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap text-[var(--fg-muted)]">
        <span
          aria-hidden
          className="h-[7px] w-[7px]"
          style={{ backgroundColor: configured ? 'var(--positive)' : 'var(--fg-subtle)' }}
        />
        {configured ? 'Configured' : 'Not configured'}
      </span>
    </li>
  );
}

export default async function AdminSettingsPage() {
  const { profile } = await requireAdmin();
  const [{ demo, message }, settings] = await Promise.all([adminContext(), getSettings()]);

  const serviceRole = hasServiceRole();
  const stripeSecret = hasStripeSecret();
  const resend = hasResend();

  return (
    <div className="pt-10">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Store configuration and the state of every integration. Credentials live in environment variables and are never shown here — only whether they are present."
      />

      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Integrations"
          description="Read directly from the environment at request time."
        >
          <ul>
            <IntegrationRow
              name="Supabase — database and auth"
              description="Backs the catalogue, orders, customers and this admin. Without it the storefront runs on the seed catalogue in demo mode."
              configured={hasSupabase}
              detail={hasSupabase ? 'Project URL and anon key present' : 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are unset'}
            />
            <IntegrationRow
              name="Supabase — service role"
              description="Allows the admin to read and write across row-level security. Optional: with the anon key alone, admin policies still apply."
              configured={serviceRole}
              detail={serviceRole ? 'Server-side only — never sent to the browser' : 'SUPABASE_SERVICE_ROLE_KEY is unset'}
            />
            <IntegrationRow
              name="Stripe — payments"
              description="Card payments at checkout and the webhook that marks an order paid."
              configured={hasStripe && stripeSecret}
              detail={
                hasStripe && stripeSecret ? 'Publishable and secret keys present'
                : hasStripe ? 'Publishable key present, secret key missing'
                : stripeSecret ? 'Secret key present, publishable key missing'
                : 'No Stripe keys set'
              }
            />
            <IntegrationRow
              name="Resend — transactional email"
              description="Order confirmations and dispatch notices."
              configured={resend}
              detail={resend ? 'API key present' : 'RESEND_API_KEY is unset'}
            />
            <IntegrationRow
              name="Product analytics"
              description="Forwards the storefront event taxonomy to PostHog or Google Analytics in addition to the first-party table."
              configured={hasAnalytics}
              detail={
                [
                  env.NEXT_PUBLIC_POSTHOG_KEY ? 'PostHog' : null,
                  env.NEXT_PUBLIC_GA_ID ? 'Google Analytics' : null,
                ].filter(Boolean).join(' · ') || 'No provider configured'
              }
            />
          </ul>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="This session">
            <MetaList
              items={[
                { label: 'Signed in as', value: profile.email },
                { label: 'Role', value: profile.role },
                { label: 'Site URL', value: env.siteUrl, mono: true },
                { label: 'Data source', value: demo ? 'Demo catalogue' : 'Supabase' },
              ]}
            />
            {demo ? <p className="t-caption mt-5 text-[var(--fg-subtle)]">{message}</p> : null}
          </Panel>

          <Panel title="In effect now" description="What the storefront is currently applying.">
            <MetaList
              items={[
                { label: 'Currency', value: settings.brand.currency, mono: true },
                {
                  label: 'Free shipping above',
                  value: formatPrice(settings.shipping.freeThreshold, settings.brand.currency),
                  mono: true,
                },
                {
                  label: 'Standard shipping',
                  value: formatPrice(settings.shipping.standardRate, settings.brand.currency),
                  mono: true,
                },
                {
                  label: 'Tax',
                  value: `${settings.tax.label} at ${formatBasisPoints(settings.tax.rateBasisPoints)}${settings.tax.pricesIncludeTax ? ', included in prices' : ', added at checkout'}`,
                },
                {
                  label: 'International',
                  value: settings.shipping.internationalEnabled ? 'Offered' : 'Not offered',
                },
              ]}
            />
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <BrandSettingsForm settings={settings.brand} />
        <TaxSettingsForm settings={settings.tax} />
        <ShippingSettingsForm settings={settings.shipping} />
        <EmailSettingsForm settings={settings.email} />
        <AnalyticsSettingsForm settings={settings.analytics} />
      </div>
    </div>
  );
}
