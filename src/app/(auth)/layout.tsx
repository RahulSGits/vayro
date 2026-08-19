import { AuthAside } from '@/components/auth/AuthAside';

/* ==========================================================================
   Auth layout — a split, not a card.

   The plate takes 46% on large screens; the form column gets the wider half
   and sits off-centre inside it. Deliberate asymmetry: a form floating in a
   box in the middle of the viewport is the look this brand is avoiding.

   Below `lg` the plate is dropped entirely rather than shrunk — a 120px-tall
   strip of landscape photography adds nothing on a phone.
   ========================================================================== */

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid lg:grid-cols-[46fr_54fr]"
      style={{ minHeight: 'calc(100svh - var(--header-h))' }}
    >
      <AuthAside />

      <div className="flex items-center justify-center px-[var(--gutter)] py-[var(--section-tight)]">
        <div className="w-full max-w-[27rem] lg:mr-[6%] lg:ml-auto">{children}</div>
      </div>
    </div>
  );
}
