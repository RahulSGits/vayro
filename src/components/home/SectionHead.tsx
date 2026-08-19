import { Reveal, RevealText } from '@/components/ui/Reveal';
import { cn } from '@/lib/utils';

/* ==========================================================================
   SectionHead — the homepage's repeating masthead.

   Index, label, masked headline, optional lead and a right-aligned action.
   Every section on the page uses it, which is what makes the page read as one
   document rather than a stack of blocks.
   ========================================================================== */

type Props = {
  /** Two-digit chapter number. Purely typographic — hidden from assistive tech. */
  index: string;
  label: string;
  /** One entry per masked line. Author the rag yourself. */
  title: string | string[];
  lead?: string;
  action?: React.ReactNode;
  className?: string;
  /** Renders the headline as an h2. Pass 'h3' inside an already-titled region. */
  as?: 'h2' | 'h3';
};

export function SectionHead({
  index,
  label,
  title,
  lead,
  action,
  className,
  as = 'h2',
}: Props) {
  return (
    <div className={cn('grid-12 items-end', className)}>
      <div className="col-span-4 md:col-span-8 lg:col-span-8">
        <Reveal variant="fadeIn">
          <p className="flex items-center gap-4">
            <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
              {index}
            </span>
            <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
            <span className="t-label-sm text-[var(--fg-muted)]">{label}</span>
          </p>
        </Reveal>

        <RevealText
          as={as}
          text={title}
          delay={0.06}
          className="t-display-md t-balance mt-6"
        />

        {lead ? (
          <Reveal variant="fadeUp" delay={0.14}>
            <p className="t-body-lg t-pretty mt-6 max-w-[46ch] text-[var(--fg-muted)]">{lead}</p>
          </Reveal>
        ) : null}
      </div>

      {action ? (
        <Reveal
          variant="fadeUp"
          delay={0.18}
          className="col-span-4 mt-8 md:col-span-4 md:mt-0 md:justify-self-end lg:col-span-4"
        >
          {action}
        </Reveal>
      ) : null}
    </div>
  );
}
