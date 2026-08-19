import { Reveal, RevealText } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

/* ==========================================================================
   StoryChapter — the repeating unit of the narrative.

   Number, label, masked headline, argument, and an optional facing column.
   Every chapter uses it, which is what keeps a nine-screen page reading as one
   document instead of a stack of unrelated sections.
   ========================================================================== */

type Props = {
  /** Two-digit chapter number. Typographic only — hidden from assistive tech. */
  index: string;
  label: string;
  /** One entry per masked line. Author the rag yourself. */
  title: string[];
  /** Paragraphs, in order. */
  body: string[];
  /** Optional facing column — a plate, a list, a quotation. */
  aside?: React.ReactNode;
  /** Moves the aside to the left at large sizes. */
  reverse?: boolean;
  /** Sets the copy in the narrow measure with no facing column. */
  centred?: boolean;
  className?: string;
};

export function StoryChapter({
  index,
  label,
  title,
  body,
  aside,
  reverse = false,
  centred = false,
  className,
}: Props) {
  const copyClass = centred
    ? 'col-span-4 lg:col-span-8 lg:col-start-3'
    : aside
      ? cn('col-span-4 lg:col-span-5', reverse ? 'lg:order-2 lg:col-start-8' : 'lg:col-start-1')
      : 'col-span-4 lg:col-span-7';

  const asideClass = cn(
    'col-span-4 lg:col-span-6',
    reverse ? 'lg:order-1 lg:col-start-1' : 'lg:col-start-7',
  );

  return (
    <section aria-label={label} className={cn('shell section', className)}>
      <div className="grid-12 items-start gap-y-14">
        <div className={copyClass}>
          <Reveal variant="fadeIn">
            <p className="flex items-center gap-4">
              <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
                {index}
              </span>
              <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
              <span className="t-label-sm text-[var(--fg-muted)]">{label}</span>
            </p>
          </Reveal>

          <RevealText as="h2" text={title} delay={0.06} className="t-display-md t-balance mt-7" />

          <Reveal variant="fadeUp" delay={0.14} className="mt-8 flex flex-col gap-5">
            {body.map((paragraph, position) => (
              <p
                key={`${index}-${position}`}
                className={cn(
                  't-pretty max-w-[var(--max-text)]',
                  position === 0 ? 't-body-lg text-[var(--fg)]' : 'text-[var(--fg-muted)]',
                )}
              >
                {paragraph}
              </p>
            ))}
          </Reveal>
        </div>

        {aside ? <div className={asideClass}>{aside}</div> : null}
      </div>
    </section>
  );
}
