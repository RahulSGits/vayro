'use client';

import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import type { StoreSettings } from '@/app/admin/_data/settings';
import { saveSettings } from '@/app/admin/actions';
import { ActionForm, ActionMessage, FieldGrid, SubmitButton } from './Form';
import { Panel } from './Chrome';

/* ==========================================================================
   Settings.
   One form per group, one row per group in `public.settings`, so saving
   shipping cannot clobber a colleague's edit to tax. Money is entered in
   major units and stored in minor units — the conversion happens once, in the
   server action, and never in a component.
   ========================================================================== */

function GroupForm({
  group,
  title,
  description,
  children,
}: {
  group: keyof StoreSettings;
  title: string;
  description: string;
  children: (fieldErrors: Record<string, string> | undefined) => React.ReactNode;
}) {
  return (
    <ActionForm action={saveSettings}>
      {(state) => (
        <Panel
          title={title}
          description={description}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ActionMessage state={state} />
              <SubmitButton>Save {title.toLowerCase()}</SubmitButton>
            </div>
          }
        >
          <input type="hidden" name="group" value={group} />
          {children(state.fieldErrors)}
        </Panel>
      )}
    </ActionForm>
  );
}

export function BrandSettingsForm({ settings }: { settings: StoreSettings['brand'] }) {
  return (
    <GroupForm
      group="brand"
      title="Store"
      description="The identity used in transactional email, receipts and structured data."
    >
      {(errors) => (
        <FieldGrid>
          <Field label="Store name" required error={errors?.storeName}>
            {({ id, invalid }) => <Input id={id} name="storeName" required defaultValue={settings.storeName} aria-invalid={invalid} />}
          </Field>
          <Field label="Tagline" error={errors?.tagline}>
            {({ id }) => <Input id={id} name="tagline" defaultValue={settings.tagline} />}
          </Field>
          <Field label="Support email" required error={errors?.supportEmail}>
            {({ id, invalid }) => <Input id={id} name="supportEmail" type="email" required defaultValue={settings.supportEmail} aria-invalid={invalid} />}
          </Field>
          <Field label="Support phone" error={errors?.supportPhone}>
            {({ id }) => <Input id={id} name="supportPhone" type="tel" defaultValue={settings.supportPhone} className="t-spec" />}
          </Field>
          <Field label="Default currency" required>
            {({ id }) => (
              <Select id={id} name="currency" defaultValue={settings.currency}>
                <option value="INR">INR — Indian rupee</option>
                <option value="USD">USD — US dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — Pound sterling</option>
              </Select>
            )}
          </Field>
          <Field label="Dispatch origin" hint="Shown on shipping estimates.">
            {({ id, describedBy }) => <Input id={id} name="originCity" defaultValue={settings.originCity} aria-describedby={describedBy} />}
          </Field>
        </FieldGrid>
      )}
    </GroupForm>
  );
}

export function ShippingSettingsForm({ settings }: { settings: StoreSettings['shipping'] }) {
  return (
    <GroupForm
      group="shipping"
      title="Shipping"
      description="Rates are entered in major units. The free-shipping threshold is compared against the order subtotal, before tax."
    >
      {(errors) => (
        <>
          <FieldGrid>
            <Field label="Free shipping above" required error={errors?.freeThreshold}>
              {({ id, invalid }) => (
                <Input id={id} name="freeThreshold" type="number" min={0} step="0.01" required
                  defaultValue={settings.freeThreshold / 100} className="t-spec" aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Processing days" required hint="Working days between payment and dispatch." error={errors?.processingDays}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="processingDays" type="number" min={0} max={30} required
                  defaultValue={settings.processingDays} className="t-spec"
                  aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Standard rate" required error={errors?.standardRate}>
              {({ id, invalid }) => (
                <Input id={id} name="standardRate" type="number" min={0} step="0.01" required
                  defaultValue={settings.standardRate / 100} className="t-spec" aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Standard label" required error={errors?.standardLabel}>
              {({ id, invalid }) => <Input id={id} name="standardLabel" required defaultValue={settings.standardLabel} aria-invalid={invalid} />}
            </Field>
            <Field label="Express rate" required error={errors?.expressRate}>
              {({ id, invalid }) => (
                <Input id={id} name="expressRate" type="number" min={0} step="0.01" required
                  defaultValue={settings.expressRate / 100} className="t-spec" aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Express label" required error={errors?.expressLabel}>
              {({ id, invalid }) => <Input id={id} name="expressLabel" required defaultValue={settings.expressLabel} aria-invalid={invalid} />}
            </Field>
          </FieldGrid>

          <div className="mt-8 flex flex-col gap-6 border-t border-[var(--border)] pt-6">
            <Checkbox name="internationalEnabled" defaultChecked={settings.internationalEnabled}
              label="Offer international delivery" />
            <Field label="International rate" error={errors?.internationalRate}>
              {({ id }) => (
                <Input id={id} name="internationalRate" type="number" min={0} step="0.01"
                  defaultValue={settings.internationalRate / 100} className="t-spec" />
              )}
            </Field>
          </div>
        </>
      )}
    </GroupForm>
  );
}

export function TaxSettingsForm({ settings }: { settings: StoreSettings['tax'] }) {
  return (
    <GroupForm
      group="tax"
      title="Tax"
      description="A single rate applied to the discounted subtotal. Rates are held as basis points, so 12.5% is exact rather than a float."
    >
      {(errors) => (
        <>
          <FieldGrid>
            <Field label="Tax label" required error={errors?.label}>
              {({ id, invalid }) => <Input id={id} name="label" required defaultValue={settings.label} aria-invalid={invalid} />}
            </Field>
            <Field label="Rate (%)" required error={errors?.rateBasisPoints}>
              {({ id, invalid }) => (
                <Input id={id} name="ratePercent" type="number" min={0} max={100} step="0.01" required
                  defaultValue={settings.rateBasisPoints / 100} className="t-spec" aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Registration number" hint="Printed on invoices when present." error={errors?.registrationId}>
              {({ id, describedBy }) => (
                <Input id={id} name="registrationId" defaultValue={settings.registrationId}
                  className="t-spec" aria-describedby={describedBy} />
              )}
            </Field>
          </FieldGrid>
          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <Checkbox name="pricesIncludeTax" defaultChecked={settings.pricesIncludeTax}
              label="Catalogue prices already include tax" />
          </div>
        </>
      )}
    </GroupForm>
  );
}

export function EmailSettingsForm({ settings }: { settings: StoreSettings['email'] }) {
  return (
    <GroupForm
      group="email"
      title="Email"
      description="Transactional messages only. Marketing consent is captured separately and never assumed."
    >
      {(errors) => (
        <>
          <FieldGrid>
            <Field label="From name" required error={errors?.fromName}>
              {({ id, invalid }) => <Input id={id} name="fromName" required defaultValue={settings.fromName} aria-invalid={invalid} />}
            </Field>
            <Field label="From address" required error={errors?.fromAddress}>
              {({ id, invalid }) => <Input id={id} name="fromAddress" type="email" required defaultValue={settings.fromAddress} aria-invalid={invalid} />}
            </Field>
            <Field label="Reply-to" error={errors?.replyTo}>
              {({ id }) => <Input id={id} name="replyTo" defaultValue={settings.replyTo} />}
            </Field>
          </FieldGrid>

          <div className="mt-8 flex flex-col gap-4 border-t border-[var(--border)] pt-6">
            <Checkbox name="orderConfirmation" defaultChecked={settings.orderConfirmation}
              label="Send an order confirmation on payment" />
            <Checkbox name="shippingNotification" defaultChecked={settings.shippingNotification}
              label="Send a dispatch notice with tracking when an order ships" />
            <Checkbox name="abandonedCart" defaultChecked={settings.abandonedCart}
              label="Send one abandoned-cart reminder — only to customers who opted in" />
          </div>
        </>
      )}
    </GroupForm>
  );
}

export function AnalyticsSettingsForm({ settings }: { settings: StoreSettings['analytics'] }) {
  return (
    <GroupForm
      group="analytics"
      title="Analytics"
      description="Controls the first-party event stream that powers the analytics screen. Third-party providers are configured through environment variables."
    >
      {(errors) => (
        <>
          <FieldGrid>
            <Field label="Retention (days)" required hint="Events older than this are eligible for deletion." error={errors?.retentionDays}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="retentionDays" type="number" min={1} max={3650} required
                  defaultValue={settings.retentionDays} className="t-spec"
                  aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
          </FieldGrid>
          <div className="mt-8 flex flex-col gap-4 border-t border-[var(--border)] pt-6">
            <Checkbox name="serverSideEvents" defaultChecked={settings.serverSideEvents}
              label="Record events server-side as well as in the browser" />
            <Checkbox name="excludeAdminTraffic" defaultChecked={settings.excludeAdminTraffic}
              label="Exclude administrator sessions from reporting" />
          </div>
        </>
      )}
    </GroupForm>
  );
}

export function HomepageForm({ settings }: { settings: StoreSettings['homepage'] }) {
  return (
    <GroupForm
      group="homepage"
      title="Homepage"
      description="The words above the fold. Keep the headline to one line — it is set at display size and will not wrap gracefully."
    >
      {(errors) => (
        <>
          <FieldGrid>
            <Field label="Eyebrow" error={errors?.eyebrow}>
              {({ id }) => <Input id={id} name="eyebrow" defaultValue={settings.eyebrow} />}
            </Field>
            <Field label="Headline" required error={errors?.headline}>
              {({ id, invalid }) => <Input id={id} name="headline" required defaultValue={settings.headline} aria-invalid={invalid} />}
            </Field>
            <Field label="Call to action" required error={errors?.ctaLabel}>
              {({ id, invalid }) => <Input id={id} name="ctaLabel" required defaultValue={settings.ctaLabel} aria-invalid={invalid} />}
            </Field>
            <Field label="Call to action link" required error={errors?.ctaHref}>
              {({ id, invalid }) => <Input id={id} name="ctaHref" required defaultValue={settings.ctaHref} className="t-spec" aria-invalid={invalid} />}
            </Field>
          </FieldGrid>

          <div className="mt-7 flex flex-col gap-7">
            <Field label="Subhead" error={errors?.subhead}>
              {({ id }) => <Textarea id={id} name="subhead" rows={2} defaultValue={settings.subhead} />}
            </Field>
            <Checkbox name="announcementEnabled" defaultChecked={settings.announcementEnabled}
              label="Show the announcement bar" />
            <Field label="Announcement" hint="One short, factual line. No countdowns, no invented scarcity." error={errors?.announcementText}>
              {({ id, describedBy }) => (
                <Input id={id} name="announcementText" defaultValue={settings.announcementText} aria-describedby={describedBy} />
              )}
            </Field>
          </div>
        </>
      )}
    </GroupForm>
  );
}
