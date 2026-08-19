'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { cn } from '@/lib/utils';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { Button } from '@/components/ui';
import {
  TRANSFORMATION_STATES,
  type TransformationSnapshot,
  type TransformationTimeline,
} from './stages';

/* ==========================================================================
   TransformationControls — the fold, by hand.

   Scrolling the section is the primary way through the transformation. This
   is the other way, for a reader who wants to go straight to the carry unit,
   for a keyboard, and for anyone who cannot produce a controlled scroll at
   all. It is not a second implementation of the fold: every button writes to
   the same `TransformationTimeline` the scroll timeline writes to, so the two
   inputs cannot disagree about what the shell is doing.

     WEAR       worn, hood down
     TRANSFORM  play the whole fold through; press again to stop
     PACK       straight to the carry unit
     RESET      hand the section back to the page and let go

   RESET is deliberately not "show me the worn shell" — that is WEAR. It walks
   the shell to wherever the page has actually scrolled to and then releases,
   so the next flick of the wheel continues rather than snaps. Scrolling more
   than a hair also takes control back on its own; the buttons never lock the
   page out of its own section.

   Accessibility. Four real buttons, so tab and enter work with nothing added.
   Left and right arrows step through the six states one at a time, home and
   end jump to the ends. The current state is announced through a polite live
   region as a sentence — the six `description` strings in ./stages exist for
   this and are the only place they are used aloud.
   ========================================================================== */

export type TransformationControlsProps = {
  /** The shared value. The same one handed to `<TransformationScene />`. */
  timeline: TransformationTimeline;
  className?: string;
  /** Draws the six-state strip above the buttons. */
  strip?: boolean;
  /** Labels the group for assistive technology. */
  label?: string;
};

export function TransformationControls({
  timeline,
  className,
  strip = true,
  label = 'Transformation controls',
}: TransformationControlsProps) {
  const { reducedMotion } = useDeviceTier();

  /* The timeline is an external store, so it is read as one. It publishes
     states rather than frames, which means this re-renders six times across
     the whole fold instead of sixty times a second — and the snapshot it hands
     back keeps its identity between states, which is what lets this work. */
  const state: TransformationSnapshot = useSyncExternalStore(
    timeline.subscribe,
    timeline.snapshot,
    timeline.snapshot,
  );

  // Under reduced motion the transit is the thing to drop, not the control:
  // the shell still goes where it was asked, it simply arrives at once.
  const options = useMemo(() => ({ immediate: reducedMotion }), [reducedMotion]);

  const goToIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, TRANSFORMATION_STATES.length - 1));
      timeline.goTo(TRANSFORMATION_STATES[clamped].id, options);
    },
    [timeline, options],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        event.preventDefault();
        goToIndex(state.index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        goToIndex(state.index + 1);
        break;
      case 'Home':
        event.preventDefault();
        goToIndex(0);
        break;
      case 'End':
        event.preventDefault();
        goToIndex(TRANSFORMATION_STATES.length - 1);
        break;
      default:
        break;
    }
  };

  const total = TRANSFORMATION_STATES.length;

  return (
    <div
      role="group"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('flex flex-col gap-4', className)}
    >
      {/* ------------------------------------------------------ state strip */}
      {strip ? (
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="t-label text-[var(--fg)]">{state.stage.label}</p>
              <p className="t-spec text-[var(--fg-muted)]">{state.stage.spec}</p>
            </div>
            <p className="t-spec text-[var(--fg-subtle)]">
              {String(state.index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </p>
          </div>

          {/* Six segments, not a continuous bar: the states are discrete and
              the strip should say so. The active one fills; the ones behind it
              hold a rule so the distance travelled stays readable. */}
          <ol aria-hidden className="mt-3 grid grid-flow-col gap-px">
            {TRANSFORMATION_STATES.map((entry, index) => (
              <li
                key={entry.id}
                className={cn(
                  'h-px transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                  index < state.index && 'bg-[var(--border-strong)]',
                  index === state.index && 'bg-[var(--fg)]',
                  index > state.index && 'bg-[var(--border)]',
                )}
              />
            ))}
          </ol>
        </div>
      ) : null}

      {/* --------------------------------------------------------- buttons */}
      <div className="flex flex-wrap gap-px">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => timeline.goTo('worn', options)}
          className="flex-1"
        >
          Wear
        </Button>

        <Button
          variant={state.playing ? 'primary' : 'secondary'}
          size="sm"
          aria-pressed={state.playing}
          onClick={() => (state.playing ? timeline.stop() : timeline.play(options))}
          className="flex-1"
        >
          {state.playing ? 'Stop' : 'Transform'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => timeline.goTo('packed', options)}
          className="flex-1"
        >
          Pack
        </Button>

        <Button
          variant="quiet"
          size="sm"
          onClick={() => timeline.reset(options)}
          className="flex-1 border border-[var(--border)]"
        >
          Reset
        </Button>
      </div>

      {/* --------------------------------------------------- announcements */}
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {`Stage ${state.index + 1} of ${total}. ${state.stage.description}`}
      </p>

      <p className="t-caption text-[var(--fg-subtle)]">
        {state.manual
          ? 'Controls are driving the shell. Scroll the section to take it back.'
          : 'Scroll the section to fold the shell, or use the controls.'}
      </p>

      {/* The whole sequence stays in the document for a reader who never
          reaches the controls and never scrolls the section. */}
      <ol className="sr-only">
        {TRANSFORMATION_STATES.map((entry) => (
          <li key={entry.id}>{entry.description}</li>
        ))}
      </ol>
    </div>
  );
}

export default TransformationControls;
