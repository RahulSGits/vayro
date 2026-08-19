'use client';

import { useCallback, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { CONTACT } from './documents';

/* ==========================================================================
   ContactForm — posts to /api/contact.

   The rules below mirror `contactSchema` in `src/lib/validation.ts`, which is
   the only check that counts. They exist here so nobody waits on a round trip
   to be told a subject line is missing, and because the server's field-level
   errors are mapped straight back onto these inputs when the two disagree.

   Two things this form will not do: claim a message was delivered when the
   endpoint says it was only logged, and throw away what somebody typed
   because a request failed.
   ========================================================================== */

/** Mirrors `emailSchema` — loose enough to accept anything deliverable. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Mirrors `NAME` in src/lib/validation.ts. */
const NAME = /^[\p{L}\p{M}'’.\- ]+$/u;
/** Mirrors the order-number rule: VY- followed by four to six digits. */
const ORDER = /^VY-\d{4,6}$/i;

const MIN_MESSAGE = 20;
const MAX_MESSAGE = 4000;
const MAX_SUBJECT = 140;

/** Mirrors `CONTACT_TOPICS`. The values are the contract; the labels are ours. */
const TOPICS = [
  { value: 'order', label: 'An order or a delivery' },
  { value: 'product', label: 'Product, sizing or care' },
  { value: 'general', label: 'Something else' },
  { value: 'press', label: 'Press' },
  { value: 'wholesale', label: 'Wholesale and stockists' },
] as const;

type Values = {
  name: string;
  email: string;
  topic: string;
  subject: string;
  orderNumber: string;
  message: string;
};

type Errors = Partial<Record<keyof Values, string>>;

const EMPTY: Values = {
  name: '',
  email: '',
  topic: 'order',
  subject: '',
  orderNumber: '',
  message: '',
};

function validate(values: Values): Errors {
  const errors: Errors = {};
  const name = values.name.trim();
  const subject = values.subject.trim();
  const message = values.message.trim();
  const orderNumber = values.orderNumber.trim();

  if (name.length < 2) errors.name = 'Tell us who you are.';
  else if (name.length > 80) errors.name = 'That name is longer than we can store.';
  else if (!NAME.test(name)) errors.name = 'Letters, spaces, hyphens and apostrophes only.';

  if (!EMAIL.test(values.email.trim())) errors.email = 'Enter an address we can reply to.';

  if (subject.length < 3) errors.subject = 'Give the message a subject.';
  else if (subject.length > MAX_SUBJECT) errors.subject = `Keep the subject under ${MAX_SUBJECT} characters.`;

  if (orderNumber && !ORDER.test(orderNumber)) errors.orderNumber = 'Order numbers look like VY-01042.';

  if (message.length < MIN_MESSAGE) {
    errors.message = `A little more detail will get you a better answer — ${MIN_MESSAGE} characters minimum.`;
  } else if (message.length > MAX_MESSAGE) {
    errors.message = `Keep the message under ${MAX_MESSAGE.toLocaleString('en-IN')} characters.`;
  }

  return errors;
}

/** Server field errors are keyed by schema field; only map the ones we render. */
function adoptServerFields(fields: Record<string, string> | undefined): Errors {
  if (!fields) return {};
  const keys: (keyof Values)[] = ['name', 'email', 'topic', 'subject', 'orderNumber', 'message'];
  const out: Errors = {};
  for (const key of keys) if (fields[key]) out[key] = fields[key];
  return out;
}

type Sent = { delivered: boolean; message: string | null };

export function ContactForm({ className }: { className?: string }) {
  const { toast } = useToast();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  // Bots fill every field they find; nobody else can see this one.
  const honeypot = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (sending) return;

      const found = validate(values);
      if (Object.keys(found).length > 0) {
        setErrors(found);
        toast({
          title: 'Check the form',
          description: 'A couple of fields still need something.',
          tone: 'warning',
        });
        return;
      }

      if (honeypot.current?.value) {
        // Accept and discard — automated submissions get no signal either way.
        setSent({ delivered: false, message: null });
        return;
      }

      setSending(true);

      try {
        const orderNumber = values.orderNumber.trim();
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            name: values.name.trim(),
            email: values.email.trim(),
            topic: values.topic,
            subject: values.subject.trim(),
            message: values.message.trim(),
            ...(orderNumber ? { orderNumber: orderNumber.toUpperCase() } : {}),
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; delivered?: boolean; message?: string; fields?: Record<string, string> }
          | null;

        if (!response.ok) {
          setSending(false);
          const fieldErrors = adoptServerFields(payload?.fields);
          if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
          toast({
            title: 'The message did not send',
            description:
              payload?.message ??
              (response.status === 429
                ? 'Too many attempts. Try again in a few minutes.'
                : `Nothing was lost — your message is still in the form. You can also write to ${CONTACT.general}.`),
            tone: 'error',
            duration: 9000,
          });
          return;
        }

        setSending(false);
        setSent({
          delivered: payload?.delivered !== false,
          message: payload?.message ?? null,
        });
        setValues(EMPTY);
        setErrors({});
      } catch {
        setSending(false);
        toast({
          title: 'No connection',
          description: `Check your network and try again, or write to ${CONTACT.general}.`,
          tone: 'error',
          duration: 9000,
        });
      }
    },
    [sending, toast, values],
  );

  if (sent) {
    return (
      <div className={cn('border-t border-[var(--fg)] pt-10', className)} role="status">
        <p className="t-label text-[var(--fg-subtle)]">{sent.delivered ? 'Sent' : 'Received'}</p>
        <h3 className="t-h1 t-balance mt-5 max-w-[18ch]">
          {sent.delivered ? 'That is with the studio.' : 'Logged, not yet delivered.'}
        </h3>
        <p className="t-body-lg t-pretty mt-6 max-w-[var(--max-text)] text-[var(--fg-muted)]">
          {sent.message ??
            (sent.delivered
              ? `Someone will reply within ${CONTACT.responseTarget}.`
              : 'Email delivery is not configured in this environment, so the message was recorded rather than sent.')}
        </p>
        {sent.delivered ? null : (
          <p className="t-body-sm t-pretty mt-4 max-w-[var(--max-text)] text-[var(--fg-muted)]">
            So that nothing is lost, send the same note to{' '}
            <a
              href={`mailto:${CONTACT.general}`}
              className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]"
            >
              {CONTACT.general}
            </a>{' '}
            as well.
          </p>
        )}
        <Button variant="secondary" size="md" className="mt-8" onClick={() => setSent(null)}>
          Write another
        </Button>
      </div>
    );
  }

  const remaining = MAX_MESSAGE - values.message.length;

  return (
    <form onSubmit={submit} noValidate className={cn('flex flex-col gap-8', className)}>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <Field label="Your name" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="name"
              autoComplete="name"
              maxLength={80}
              value={values.name}
              disabled={sending}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onChange={(event) => set('name', event.target.value)}
            />
          )}
        </Field>

        <Field label="Email" error={errors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={values.email}
              disabled={sending}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onChange={(event) => set('email', event.target.value)}
            />
          )}
        </Field>

        <Field label="What is it about" error={errors.topic}>
          {({ id, describedBy }) => (
            <Select
              id={id}
              name="topic"
              value={values.topic}
              disabled={sending}
              aria-describedby={describedBy}
              onChange={(event) => set('topic', event.target.value)}
            >
              {TOPICS.map((topic) => (
                <option key={topic.value} value={topic.value}>
                  {topic.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field
          label="Order reference"
          error={errors.orderNumber}
          hint="Optional. It looks like VY-01042 and is in your confirmation email."
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="orderNumber"
              autoComplete="off"
              placeholder="VY-01042"
              value={values.orderNumber}
              disabled={sending}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              onChange={(event) => set('orderNumber', event.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="Subject" error={errors.subject} required>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="subject"
            maxLength={MAX_SUBJECT}
            placeholder="Sizing between M and L"
            value={values.subject}
            disabled={sending}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => set('subject', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Message"
        error={errors.message}
        hint={
          remaining < 400
            ? `${remaining.toLocaleString('en-IN')} characters left.`
            : 'The more specific the question, the shorter the thread.'
        }
        required
      >
        {({ id, describedBy, invalid }) => (
          <Textarea
            id={id}
            name="message"
            rows={7}
            maxLength={MAX_MESSAGE}
            value={values.message}
            disabled={sending}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={(event) => set('message', event.target.value)}
          />
        )}
      </Field>

      {/* Honeypot — out of the tab order and out of the accessibility tree. */}
      <input
        ref={honeypot}
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="sr-only"
        defaultValue=""
      />

      <div className="flex flex-wrap items-center gap-6">
        <Button type="submit" size="lg" disabled={sending} data-cursor="link">
          {sending ? <Spinner size={14} /> : null}
          {sending ? 'Sending' : 'Send message'}
          {sending ? null : (
            <ArrowRight size={15} strokeWidth={1.25} strokeLinecap="square" aria-hidden />
          )}
        </Button>
        <p className="t-caption t-pretty max-w-[34ch] text-[var(--fg-subtle)]">
          We use what you send here to answer you, and for nothing else.
        </p>
      </div>
    </form>
  );
}
