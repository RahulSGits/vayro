import Image from 'next/image';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealText } from '@/components/ui/Reveal';

/* ==========================================================================
   EditorialSplit — the philosophy page of the catalogue.

   The plate runs to the left edge of the viewport; the argument sits in a
   narrow measure opposite it. Revealed with the house masked wipe, not a fade.
   ========================================================================== */

export function EditorialSplit() {
  return (
    <section
      aria-label="Philosophy"
      data-surface="inverse"
      className="relative w-full overflow-hidden"
    >
      <div className="grid w-full items-center gap-y-12 lg:grid-cols-12">
        {/* --------------------------------------------------- full-bleed */}
        <div className="lg:col-span-6">
          <Reveal
            variant="imageReveal"
            className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/11] lg:aspect-[3/4]"
          >
            <Image
              src="/media/field-ascent.webp"
              alt="The Meridian Carry Shell worn open on an ascent above the treeline"
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
            />
          </Reveal>
          <Reveal variant="fadeIn" delay={0.2}>
            <p className="t-spec mt-4 px-[var(--gutter)] text-[var(--fg-subtle)]">
              Ascent — shell worn open
            </p>
          </Reveal>
        </div>

        {/* --------------------------------------------------------- copy */}
        <div className="px-[var(--gutter)] pb-[var(--section)] lg:col-span-5 lg:col-start-8 lg:py-[var(--section)]">
          <Reveal variant="fadeIn">
            <p className="flex items-center gap-4">
              <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
                03
              </span>
              <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
              <span className="t-label-sm text-[var(--fg-muted)]">Philosophy</span>
            </p>
          </Reveal>

          <RevealText
            as="h2"
            delay={0.06}
            text={["MOST OF A JACKET'S DAY", 'IS SPENT NOT', 'BEING WORN.']}
            className="t-display-md t-balance mt-6"
          />

          <Reveal variant="fadeUp" delay={0.14} className="mt-8 flex flex-col gap-5">
            <p className="t-body-lg t-pretty max-w-[46ch] text-[var(--fg-muted)]">
              So that is where we started. The hood lining is oversized because it has to
              become a cavity. The webbing is bar-tacked to the yoke because it has to take a
              shoulder load. The collar inverts because a shell that folds into itself never
              needs a stuff sack — and a stuff sack is a thing you lose.
            </p>
            <p className="t-body-lg t-pretty max-w-[46ch] text-[var(--fg-muted)]">
              Every decision on the Meridian answers to the half of the day the jacket is off
              your back. Engineered for lighter travel.
            </p>
          </Reveal>

          <Reveal variant="fadeUp" delay={0.2} className="mt-10">
            <ButtonLink href="/story" variant="secondary" size="lg" data-cursor="link">
              Read the story
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
