import { ContourField } from '@/components/brand';
import { NewsletterForm } from '@/components/forms/NewsletterForm';
import { Reveal, RevealText } from '@/components/ui/Reveal';

/* ==========================================================================
   NewsletterBlock — the last thing on the page before the footer.
   ========================================================================== */

export function NewsletterBlock() {
  return (
    <section
      aria-label="Get first access"
      data-surface="inverse"
      className="relative isolate overflow-hidden"
    >
      <ContourField opacity={0.08} scale={180} className="pointer-events-none text-[var(--fg)]" />

      <div className="shell section relative">
        <div className="grid-12 items-end gap-y-12">
          <div className="col-span-4 md:col-span-7 lg:col-span-6">
            <Reveal variant="fadeIn">
              <p className="flex items-center gap-4">
                <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
                  08
                </span>
                <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
                <span className="t-label-sm text-[var(--fg-muted)]">Dispatch</span>
              </p>
            </Reveal>

            <RevealText
              as="h2"
              delay={0.06}
              text={['GET FIRST', 'ACCESS.']}
              className="t-display-lg t-balance mt-6"
            />

            <Reveal variant="fadeUp" delay={0.14}>
              <p className="t-body-lg t-pretty mt-6 max-w-[44ch] text-[var(--fg-muted)]">
                First look at new equipment, limited runs, and the research behind them.
                Sent when there is something worth sending.
              </p>
            </Reveal>
          </div>

          <Reveal
            variant="fadeUp"
            delay={0.18}
            className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8"
          >
            <NewsletterForm source="home" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
