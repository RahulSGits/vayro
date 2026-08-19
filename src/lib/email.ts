import 'server-only';
import { Resend } from 'resend';
import { env, serverEnv } from '@/lib/env';
import { palette } from '@/lib/design-tokens';
import { formatDate, formatPrice } from '@/lib/utils';
import type { Currency } from '@/types';

/* ==========================================================================
   Transactional email.

   Four rules:

   1. **It never throws.** A failed receipt must not undo a successful order.
      Every function returns a discriminated result the caller can log or
      ignore; the order is already written by the time we get here.
   2. **Unconfigured is a first-class state.** With no `RESEND_API_KEY` the
      message is rendered anyway and printed as a structured preview, so the
      whole flow is reviewable in a demo environment, and the call returns
      `{ sent: false, reason: 'not-configured' }`.
   3. **Every interpolated value is escaped.** Names, addresses and order
      notes arrive from a form; none of them are trusted as markup.
   4. **Colours are literals here on purpose.** Email clients do not resolve
      CSS custom properties, so the palette is read from `design-tokens` — the
      same source the CSS variables are generated from — and inlined. This is
      the one place in the codebase where a resolved hex is correct.
   ========================================================================== */

export type EmailResult =
  | { sent: true; id: string | null }
  | { sent: false; reason: 'not-configured' | 'send-failed' | 'invalid-recipient'; detail?: string };

export type EmailTemplateName =
  | 'order-confirmation'
  | 'shipping-notification'
  | 'password-reset'
  | 'welcome'
  | 'contact-message';

interface Message {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Shown in the inbox list beneath the subject. */
  preheader: string;
}

/* ------------------------------------------------------------- transport -- */

const globalScope = globalThis as typeof globalThis & { __vayroResend?: Resend | null };

function client(): Resend | null {
  if (globalScope.__vayroResend !== undefined) return globalScope.__vayroResend;
  const { RESEND_API_KEY } = serverEnv();
  globalScope.__vayroResend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
  return globalScope.__vayroResend;
}

export function isEmailConfigured(): boolean {
  return Boolean(serverEnv().RESEND_API_KEY);
}

const RECIPIENT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function deliver(template: EmailTemplateName, message: Message): Promise<EmailResult> {
  if (!RECIPIENT.test(message.to)) {
    return { sent: false, reason: 'invalid-recipient', detail: 'The recipient address is not deliverable.' };
  }

  const resend = client();
  const { RESEND_FROM } = serverEnv();

  if (!resend) {
    // Structured, greppable, and complete enough to verify copy and totals
    // without a provider. The body is summarised, never dumped.
    console.info('[vayro:email] preview (not sent — RESEND_API_KEY is unset)', {
      template,
      to: message.to,
      from: RESEND_FROM,
      subject: message.subject,
      preheader: message.preheader,
      textLength: message.text.length,
      text: message.text,
    });
    return { sent: false, reason: 'not-configured' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      headers: { 'X-Entity-Ref-ID': template },
    });

    if (error) {
      console.error('[vayro:email] send failed', { template, name: error.name, message: error.message });
      return { sent: false, reason: 'send-failed', detail: error.message };
    }
    return { sent: true, id: data?.id ?? null };
  } catch (cause) {
    // Network failure, DNS, provider outage — never allowed to propagate.
    console.error('[vayro:email] transport error', { template, cause: describe(cause) });
    return { sent: false, reason: 'send-failed', detail: describe(cause) };
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown transport error.';
}

/* ------------------------------------------------------------- rendering -- */

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const INK = palette.ink;
const IVORY = palette.ivory;
const BONE = palette.bone;
const SLATE = palette.slate;
const TITANIUM = palette.titanium;
const FOREST = palette.forest;
/**
 * Hairlines are opaque tints rather than alpha: the Word rendering engine
 * behind Outlook for Windows drops both `rgba()` and 8-digit hex, and a border
 * that silently disappears is worse than one a shade too warm.
 */
const RULE = palette.sand;
const RULE_SOFT = palette.bone;

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function siteUrl(path = ''): string {
  return `${env.siteUrl.replace(/\/$/, '')}${path}`;
}

/**
 * One layout for every message: a hairline-ruled sheet on warm ivory. Tables
 * and inline styles only — the constraint email HTML has always had.
 */
function shell({ preheader, title, body }: { preheader: string; title: string; body: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escape(title)}</title>
</head>
<body style="margin:0;padding:0;background:${IVORY};color:${INK};font-family:${FONT};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${IVORY};">
<tr><td align="center" style="padding:40px 20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${IVORY};">
    <tr><td style="padding-bottom:28px;border-bottom:1px solid ${RULE};">
      <a href="${siteUrl('/')}" style="color:${INK};text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.34em;text-transform:uppercase;">VAYRO</a>
    </td></tr>
    <tr><td style="padding:32px 0 0;">${body}</td></tr>
    <tr><td style="padding:36px 0 0;border-top:1px solid ${RULE};">
      <p style="margin:24px 0 0;font-size:12px;line-height:1.7;color:${TITANIUM};">
        VAYRO — engineered for lighter travel.<br>
        <a href="${siteUrl('/shop')}" style="color:${SLATE};text-decoration:underline;">Shop</a>
        &nbsp;·&nbsp;
        <a href="${siteUrl('/technology')}" style="color:${SLATE};text-decoration:underline;">Technology</a>
        &nbsp;·&nbsp;
        <a href="${siteUrl('/account/orders')}" style="color:${SLATE};text-decoration:underline;">Orders</a>
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 20px;font-size:28px;line-height:1.12;letter-spacing:-0.02em;font-weight:500;color:${INK};">${escape(text)}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 18px;font-size:15px;line-height:1.68;color:${INK};">${escape(text)}</p>`;
}

function label(text: string): string {
  return `<p style="margin:28px 0 10px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${TITANIUM};">${escape(text)}</p>`;
}

function button(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
    <td style="background:${INK};">
      <a href="${escape(href)}" style="display:inline-block;padding:14px 26px;color:${IVORY};text-decoration:none;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;">${escape(text)}</a>
    </td></tr></table>`;
}

function addressBlock(lines: string[]): string {
  return `<p style="margin:0;font-size:14px;line-height:1.7;color:${SLATE};">${lines.map(escape).join('<br>')}</p>`;
}

function reference(value: string): string {
  return `<span style="font-family:${MONO};font-size:14px;letter-spacing:0.06em;color:${INK};">${escape(value)}</span>`;
}

function demoNotice(): string {
  return `<p style="margin:0 0 24px;padding:12px 14px;border:1px solid ${RULE};background:${BONE};font-size:13px;line-height:1.6;color:${SLATE};">
    Demonstration environment — no payment was taken and nothing will be despatched.
  </p>`;
}

/* -------------------------------------------------------------- line items */

export interface EmailLineItem {
  name: string;
  colorway: string;
  size: string;
  quantity: number;
  /** Minor units. */
  unitPrice: number;
}

function itemsTable(items: EmailLineItem[], currency: Currency): string {
  const rows = items
    .map((item) => {
      const spec = [item.colorway, item.size].filter(Boolean).join(' · ');
      return `<tr>
        <td style="padding:14px 0;border-bottom:1px solid ${RULE_SOFT};font-size:14px;line-height:1.5;color:${INK};">
          ${escape(item.name)}
          <span style="display:block;font-size:12px;color:${TITANIUM};">${escape(spec)}${spec ? ' · ' : ''}Qty ${item.quantity}</span>
        </td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid ${RULE_SOFT};font-family:${MONO};font-size:13px;color:${INK};white-space:nowrap;">
          ${escape(formatPrice(item.unitPrice * item.quantity, currency))}
        </td>
      </tr>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function totalsTable(
  totals: { subtotal: number; discount: number; shipping: number; tax: number; total: number },
  currency: Currency,
  taxIncluded: boolean,
): string {
  const row = (name: string, value: string, strong = false) => `<tr>
    <td style="padding:6px 0;font-size:${strong ? '15px' : '13px'};color:${strong ? INK : SLATE};${strong ? 'font-weight:600;' : ''}">${escape(name)}</td>
    <td align="right" style="padding:6px 0;font-family:${MONO};font-size:${strong ? '15px' : '13px'};color:${INK};white-space:nowrap;">${escape(value)}</td>
  </tr>`;

  const lines = [
    row('Subtotal', formatPrice(totals.subtotal, currency)),
    totals.discount > 0 ? row('Discount', `−${formatPrice(totals.discount, currency)}`) : '',
    row('Shipping', totals.shipping === 0 ? 'Included' : formatPrice(totals.shipping, currency)),
    totals.tax > 0 ? row('Tax', formatPrice(totals.tax, currency)) : '',
    row('Total', formatPrice(totals.total, currency), true),
  ]
    .filter(Boolean)
    .join('');

  const note = taxIncluded
    ? `<p style="margin:10px 0 0;font-size:12px;color:${TITANIUM};">Tax included where applicable.</p>`
    : `<p style="margin:10px 0 0;font-size:12px;color:${TITANIUM};">Import duties are levied on arrival and are not included.</p>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid ${RULE};padding-top:8px;">${lines}</table>${note}`;
}

function textItems(items: EmailLineItem[], currency: Currency): string {
  return items
    .map((item) => {
      const spec = [item.colorway, item.size].filter(Boolean).join(' · ');
      return `- ${item.name}${spec ? ` (${spec})` : ''} × ${item.quantity} — ${formatPrice(item.unitPrice * item.quantity, currency)}`;
    })
    .join('\n');
}

/* ================================================================ templates */

export interface OrderConfirmationInput {
  to: string;
  orderNumber: string;
  placedAt: string;
  currency: Currency;
  items: EmailLineItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  taxIncluded: boolean;
  shippingAddressLines: string[];
  shippingMethodLabel: string;
  /** ISO dates. Omitted when no window was quoted. */
  delivery?: { earliest: string; latest: string } | null;
  /** True when no payment processor was configured. */
  demo?: boolean;
}

/** Receipt sent the moment an order is written. */
export function sendOrderConfirmation(input: OrderConfirmationInput): Promise<EmailResult> {
  const window = input.delivery
    ? `${formatDate(input.delivery.earliest)} – ${formatDate(input.delivery.latest)}`
    : null;

  const body = [
    input.demo ? demoNotice() : '',
    heading('Order confirmed'),
    paragraph(
      'Thank you. Your order is recorded and will be prepared for despatch. You will hear from us again when it leaves the workshop.',
    ),
    `<p style="margin:0 0 4px;font-size:13px;color:${TITANIUM};">Order</p>${reference(input.orderNumber)}`,
    `<p style="margin:14px 0 0;font-size:13px;color:${TITANIUM};">Placed ${escape(formatDate(input.placedAt))}</p>`,
    label('Items'),
    itemsTable(input.items, input.currency),
    totalsTable(input, input.currency, input.taxIncluded),
    label('Delivery'),
    addressBlock(input.shippingAddressLines),
    `<p style="margin:12px 0 0;font-size:13px;color:${SLATE};">${escape(input.shippingMethodLabel)}${window ? ` · Estimated ${escape(window)}` : ''}</p>`,
    button(siteUrl(`/checkout/confirmation/${encodeURIComponent(input.orderNumber)}`), 'View order'),
  ].join('');

  const text = [
    input.demo ? 'DEMONSTRATION ENVIRONMENT — no payment was taken.\n' : '',
    'Order confirmed',
    '',
    `Order ${input.orderNumber}`,
    `Placed ${formatDate(input.placedAt)}`,
    '',
    'Items',
    textItems(input.items, input.currency),
    '',
    `Subtotal: ${formatPrice(input.subtotal, input.currency)}`,
    input.discount > 0 ? `Discount: −${formatPrice(input.discount, input.currency)}` : '',
    `Shipping: ${input.shipping === 0 ? 'Included' : formatPrice(input.shipping, input.currency)}`,
    `Total: ${formatPrice(input.total, input.currency)}`,
    '',
    'Delivery',
    input.shippingAddressLines.join('\n'),
    input.shippingMethodLabel,
    window ? `Estimated ${window}` : '',
    '',
    siteUrl(`/checkout/confirmation/${encodeURIComponent(input.orderNumber)}`),
  ]
    .filter((line) => line !== '')
    .join('\n');

  return deliver('order-confirmation', {
    to: input.to,
    subject: `Order ${input.orderNumber} confirmed`,
    preheader: `Your VAYRO order ${input.orderNumber} is recorded.`,
    html: shell({ preheader: `Your VAYRO order ${input.orderNumber} is recorded.`, title: 'Order confirmed', body }),
    text,
  });
}

export interface ShippingNotificationInput {
  to: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  shippingAddressLines: string[];
  items: EmailLineItem[];
  currency: Currency;
  delivery?: { earliest: string; latest: string } | null;
}

/** Sent when an order is marked shipped in the admin. */
export function sendShippingNotification(input: ShippingNotificationInput): Promise<EmailResult> {
  const window = input.delivery
    ? `${formatDate(input.delivery.earliest)} – ${formatDate(input.delivery.latest)}`
    : null;

  const body = [
    heading('On its way'),
    paragraph(`Order ${input.orderNumber} has left the workshop.`),
    label('Tracking'),
    `<p style="margin:0;font-size:14px;line-height:1.7;color:${INK};">${escape(input.carrier)}<br>${reference(input.trackingNumber)}</p>`,
    input.trackingUrl ? button(input.trackingUrl, 'Track parcel') : '',
    label('Delivering to'),
    addressBlock(input.shippingAddressLines),
    window ? `<p style="margin:12px 0 0;font-size:13px;color:${SLATE};">Estimated ${escape(window)}</p>` : '',
    label('In this parcel'),
    itemsTable(input.items, input.currency),
  ].join('');

  const text = [
    'On its way',
    '',
    `Order ${input.orderNumber} has left the workshop.`,
    '',
    `Carrier: ${input.carrier}`,
    `Tracking: ${input.trackingNumber}`,
    input.trackingUrl ?? '',
    '',
    'Delivering to',
    input.shippingAddressLines.join('\n'),
    window ? `Estimated ${window}` : '',
    '',
    'In this parcel',
    textItems(input.items, input.currency),
  ]
    .filter((line) => line !== '')
    .join('\n');

  return deliver('shipping-notification', {
    to: input.to,
    subject: `Order ${input.orderNumber} has shipped`,
    preheader: `${input.carrier} · ${input.trackingNumber}`,
    html: shell({ preheader: `${input.carrier} · ${input.trackingNumber}`, title: 'On its way', body }),
    text,
  });
}

export interface PasswordResetInput {
  to: string;
  /** Absolute URL issued by Supabase Auth. Never constructed here. */
  resetUrl: string;
  /** Minutes the link stays valid, for the copy. */
  expiresInMinutes?: number;
}

/**
 * Password recovery. Supabase sends its own recovery mail when the built-in
 * template is enabled; this exists for projects that route auth mail through
 * Resend instead, and takes the action link as an input so no token is ever
 * minted here.
 */
export function sendPasswordReset(input: PasswordResetInput): Promise<EmailResult> {
  const minutes = input.expiresInMinutes ?? 60;

  const body = [
    heading('Reset your password'),
    paragraph('Use the link below to choose a new password. If you did not ask for this, ignore the message — nothing has changed.'),
    button(input.resetUrl, 'Choose a new password'),
    `<p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:${TITANIUM};">The link works once and expires in ${minutes} minutes.</p>`,
  ].join('');

  const text = [
    'Reset your password',
    '',
    'Use the link below to choose a new password. If you did not ask for this, ignore the message — nothing has changed.',
    '',
    input.resetUrl,
    '',
    `The link works once and expires in ${minutes} minutes.`,
  ].join('\n');

  return deliver('password-reset', {
    to: input.to,
    subject: 'Reset your VAYRO password',
    preheader: 'A one-time link to choose a new password.',
    html: shell({ preheader: 'A one-time link to choose a new password.', title: 'Reset your password', body }),
    text,
  });
}

export interface WelcomeInput {
  to: string;
  name?: string | null;
  /** 'account' after sign-up, 'newsletter' after a subscription. */
  source?: 'account' | 'newsletter';
}

/** First contact. Restrained on purpose — one idea, one link. */
export function sendWelcome(input: WelcomeInput): Promise<EmailResult> {
  const first = (input.name ?? '').trim().split(/\s+/)[0] ?? '';
  const source = input.source ?? 'account';

  const opening =
    source === 'newsletter'
      ? 'You are on the list. Occasional dispatches on new equipment and field notes — nothing else.'
      : 'Your account is ready. Orders, addresses and your wishlist now travel with you.';

  const body = [
    heading(first ? `Welcome, ${first}` : 'Welcome to VAYRO'),
    paragraph(opening),
    paragraph('We build one thing at a time and we build it to pack. The Meridian Carry Shell folds into its own hood and becomes a 2.1-litre carry unit — weather resistant, and honest about not being waterproof.'),
    button(siteUrl(source === 'newsletter' ? '/shop' : '/account'), source === 'newsletter' ? 'See the range' : 'Open your account'),
  ].join('');

  const text = [
    first ? `Welcome, ${first}` : 'Welcome to VAYRO',
    '',
    opening,
    '',
    'We build one thing at a time and we build it to pack. The Meridian Carry Shell folds into its own hood and becomes a 2.1-litre carry unit — weather resistant, and honest about not being waterproof.',
    '',
    siteUrl(source === 'newsletter' ? '/shop' : '/account'),
  ].join('\n');

  return deliver('welcome', {
    to: input.to,
    subject: source === 'newsletter' ? 'You are on the list' : 'Welcome to VAYRO',
    preheader: 'One layer. Every destination.',
    html: shell({ preheader: 'One layer. Every destination.', title: 'Welcome to VAYRO', body }),
    text,
  });
}

export interface ContactMessageInput {
  /** Internal recipient. Defaults to `ADMIN_EMAIL`, then the `from` address. */
  to?: string;
  fromName: string;
  fromEmail: string;
  topic: string;
  subject: string;
  message: string;
  orderNumber?: string | null;
}

/**
 * Routes a contact form submission to the studio. Reply-To is set to the
 * sender so a reply goes straight back to them.
 */
export function sendContactMessage(input: ContactMessageInput): Promise<EmailResult> {
  const { ADMIN_EMAIL, RESEND_FROM } = serverEnv();
  const to = input.to ?? ADMIN_EMAIL ?? extractAddress(RESEND_FROM);

  const body = [
    heading('New enquiry'),
    `<p style="margin:0 0 18px;font-size:13px;line-height:1.8;color:${SLATE};">
      <strong style="color:${INK};">From</strong> ${escape(input.fromName)} &lt;${escape(input.fromEmail)}&gt;<br>
      <strong style="color:${INK};">Topic</strong> ${escape(input.topic)}<br>
      ${input.orderNumber ? `<strong style="color:${INK};">Order</strong> ${escape(input.orderNumber)}<br>` : ''}
      <strong style="color:${INK};">Subject</strong> ${escape(input.subject)}
    </p>`,
    `<div style="padding:16px;border-left:2px solid ${FOREST};background:${BONE};font-size:14px;line-height:1.7;color:${INK};white-space:pre-wrap;">${escape(input.message)}</div>`,
  ].join('');

  const text = [
    'New enquiry',
    '',
    `From: ${input.fromName} <${input.fromEmail}>`,
    `Topic: ${input.topic}`,
    input.orderNumber ? `Order: ${input.orderNumber}` : '',
    `Subject: ${input.subject}`,
    '',
    input.message,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return deliver('contact-message', {
    to,
    replyTo: input.fromEmail,
    subject: `[${input.topic}] ${input.subject}`,
    preheader: `${input.fromName} — ${input.subject}`,
    html: shell({ preheader: `${input.fromName} — ${input.subject}`, title: 'New enquiry', body }),
    text,
  });
}

/** `"VAYRO <hello@example.com>"` -> `hello@example.com`. */
function extractAddress(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  return (match?.[1] ?? from).trim();
}
