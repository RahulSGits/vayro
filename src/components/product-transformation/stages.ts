/* ==========================================================================
   The transformation, as six named states.

   `TransformationScene` already has a four-moment read-out — WEAR / FOLD /
   PACK / CARRY — which is the caption track and the still sequence. That is
   editorial. This is mechanical: the six states the shell actually passes
   through, each owning a slice of pack progress, so a control bar, a live
   region and the fold shader can all name the same instant.

       pack   0 ────────────────────────────────────────────────── 1
              │ worn │ hood-open │ folding │ compressing │ carry │ packed

   Two clocks, one value
   ---------------------
   The canvas is driven by SCROLL progress. The fold is driven by PACK
   progress, which is scroll remapped through a window — the shell holds on
   WEAR for the first sixth and on CARRY for the last fifth, so the fold has
   the middle to itself. `PACK_WINDOW` is that window and it is the single
   definition of it; `TransformationCanvas.packFromScroll` reads it from here.

   Every state therefore carries both: `range`/`pack` in pack space, which is
   what the brief and the shader speak, and `scroll`, which is what you set to
   put the camera and the fold where that state reads best. The two outer
   states extend to the ends of the scroll track on purpose — `worn` at scroll
   0 and `packed` at scroll 1 are where the camera path starts and finishes,
   and a control that stopped at the window edge would leave the carry unit
   framed from too far away.

   `createTransformationTimeline()` is the shared value both input methods
   write to, so the scroll and the buttons cannot disagree.
   ========================================================================== */

import { clamp, mapRange } from '@/lib/utils';

export type TransformationStageId =
  | 'worn'
  | 'hood-open'
  | 'folding'
  | 'compressing'
  | 'carry-form'
  | 'packed';

export type TransformationState = {
  id: TransformationStageId;
  /** Control-bar and caption label. */
  label: string;
  /** The measured fact for this state. No adjectives. */
  spec: string;
  /** Read aloud when the state is reached. A sentence, not a fragment. */
  description: string;
  /** The pack progress this state occupies: [from, to). The last is closed. */
  range: readonly [number, number];
  /** Where inside the range the state settles when it is driven to. */
  pack: number;
  /** The same settle point in scroll space — what you hand the canvas. */
  scroll: number;
};

/**
 * Scroll progress outside this window is hold time: the shell stands still on
 * WEAR before it, and sits packed after it. Inside, scroll maps to the fold.
 */
export const PACK_WINDOW = { start: 0.16, end: 0.82 } as const;

/** Scroll progress to pack progress. The fold's clock. */
export function packFromScrollProgress(scroll: number) {
  return clamp(mapRange(scroll, PACK_WINDOW.start, PACK_WINDOW.end, 0, 1), 0, 1);
}

/**
 * Pack progress back to scroll progress. Exact inside the window; the two ends
 * open out to the ends of the track so a fully packed shell is framed by the
 * last camera station rather than the one the window happens to stop at.
 */
export function scrollFromPackProgress(pack: number) {
  const value = clamp(pack, 0, 1);
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return PACK_WINDOW.start + value * (PACK_WINDOW.end - PACK_WINDOW.start);
}

export const TRANSFORMATION_STATES: readonly TransformationState[] = [
  {
    id: 'worn',
    label: 'Worn',
    spec: '318 g · size M',
    description: 'Worn. The shell is open on the body, hood down, 318 grams in size M.',
    range: [0, 0.08],
    pack: 0,
    scroll: 0,
  },
  {
    id: 'hood-open',
    label: 'Hood open',
    spec: 'Collar inverts',
    description:
      'Hood open. The collar inverts and the hood everts into the cavity the shell packs into.',
    range: [0.08, 0.26],
    pack: 0.17,
    scroll: scrollFromPackProgress(0.17),
  },
  {
    id: 'folding',
    label: 'Folding',
    spec: 'Sleeves to centre',
    description: 'Folding. The sleeves fold in across the chest and the hem comes up to the collar.',
    range: [0.26, 0.5],
    pack: 0.38,
    scroll: scrollFromPackProgress(0.38),
  },
  {
    id: 'compressing',
    label: 'Compressing',
    spec: 'Volume halves',
    description: 'Compressing. Air leaves the panels and the packed volume halves.',
    range: [0.5, 0.72],
    pack: 0.61,
    scroll: scrollFromPackProgress(0.61),
  },
  {
    id: 'carry-form',
    label: 'Carry form',
    spec: '24 × 16 × 9 cm',
    description: 'Carry form. The shell has taken its block: 24 by 16 by 9 centimetres.',
    range: [0.72, 0.92],
    pack: 0.82,
    scroll: scrollFromPackProgress(0.82),
  },
  {
    id: 'packed',
    label: 'Packed',
    spec: '2.1 L · webbing out',
    description: 'Packed. Sealed at 2.1 litres with the webbing out, ready to clip and carry.',
    range: [0.92, 1],
    pack: 1,
    scroll: 1,
  },
] as const;

export const TRANSFORMATION_STAGE_IDS = TRANSFORMATION_STATES.map((state) => state.id);

export function stageIndexAtPack(pack: number): number {
  const value = clamp(pack, 0, 1);
  for (let i = TRANSFORMATION_STATES.length - 1; i >= 0; i -= 1) {
    if (value >= TRANSFORMATION_STATES[i].range[0]) return i;
  }
  return 0;
}

export function stageAtPack(pack: number): TransformationState {
  return TRANSFORMATION_STATES[stageIndexAtPack(pack)];
}

export function getStage(id: TransformationStageId): TransformationState {
  return TRANSFORMATION_STATES.find((state) => state.id === id) ?? TRANSFORMATION_STATES[0];
}

/** Pack progress for a named state. */
export function packForStage(id: TransformationStageId): number {
  return getStage(id).pack;
}

/** Scroll progress for a named state — what the canvas wants. */
export function scrollForStage(id: TransformationStageId): number {
  return getStage(id).scroll;
}

/* ======================================================== shared timeline === */

export type TransformationSnapshot = {
  /** Scroll-space progress, 0..1. What the canvas reads. */
  progress: number;
  /** Pack progress, 0..1. What the fold reads. */
  pack: number;
  index: number;
  stage: TransformationState;
  /** True while the control bar owns the value and scroll is standing by. */
  manual: boolean;
  /** True while a play-through is running. */
  playing: boolean;
};

export type TransformationDriveOptions = {
  /** Skip the transit. Set under `prefers-reduced-motion`. */
  immediate?: boolean;
};

export type TransformationTimeline = {
  /** Scroll-space progress. Read this every frame; it never causes a render. */
  progress(): number;
  pack(): number;
  stage(): TransformationState;
  snapshot(): TransformationSnapshot;
  /**
   * The scroll timeline reports here. Ignored while the control bar holds the
   * value — until the page moves far enough to mean it, at which point scroll
   * takes it back. That is what keeps the two inputs from fighting.
   */
  setFromScroll(value: number): void;
  /** Drive to a named state. Engages manual control. */
  goTo(id: TransformationStageId, options?: TransformationDriveOptions): void;
  /** Run the whole fold forward from wherever it is. */
  play(options?: TransformationDriveOptions): void;
  /** Stop a run where it stands. */
  stop(): void;
  /** To `worn`, then hand the value back to the scroll. */
  reset(options?: TransformationDriveOptions): void;
  /** Hand the value back to the scroll without moving it. */
  release(): void;
  /** Fires on a state change, and when manual or playing flips. Not per frame. */
  subscribe(listener: (snapshot: TransformationSnapshot) => void): () => void;
  dispose(): void;
};

/** Enough scroll movement to mean the reader has taken over from the buttons. */
const SCROLL_RECLAIM = 0.02;

/** A full play-through of the fold, at rest. Scaled by distance remaining. */
const PLAY_MS = 2600;

/** A jump to a named state. Also scaled — a short hop should not take as long. */
const JUMP_MS = 900;


function smoothstep(t: number) {
  return t * t * (3 - 2 * t);
}

/**
 * The one value both the scroll and the control bar write to.
 *
 * It drives itself: a `goTo` or `play` starts a rAF loop that runs until the
 * value arrives, so neither caller has to own a frame loop. The canvas keeps
 * reading `progress()` every frame and never learns which input moved it.
 *
 * Listeners hear about states, not frames. The value changes sixty times a
 * second and re-rendering React on each of those is exactly what the existing
 * scroll path was written to avoid, so a notification goes out only when the
 * named state changes or when `manual` / `playing` flips.
 */
export function createTransformationTimeline(initial = 0): TransformationTimeline {
  const listeners = new Set<(snapshot: TransformationSnapshot) => void>();

  let value = clamp(initial, 0, 1);
  let index = stageIndexAtPack(packFromScrollProgress(value));
  let manual = false;
  let playing = false;
  let disposed = false;

  /** Scroll's own reading, tracked even while it is not the one in charge. */
  let scrollValue = value;
  /** Where scroll stood when the control bar last took over. */
  let scrollAtEngage = value;

  /** What the listeners were last told. Emit only when this goes stale. */
  let announced = { index, manual, playing };

  let from = value;
  let to = value;
  let elapsed = 0;
  let duration = 0;
  let frame: number | null = null;
  let last = 0;
  let onArrive: (() => void) | null = null;

  const build = (): TransformationSnapshot => ({
    progress: value,
    pack: packFromScrollProgress(value),
    index,
    stage: TRANSFORMATION_STATES[index],
    manual,
    playing,
  });

  /**
   * The last announced state, held as one object that only changes identity
   * when the announcement does. `useSyncExternalStore` requires exactly that —
   * a fresh object per call would re-render forever — which is also why the
   * snapshot's `progress` is the value as of the last state change rather than
   * as of this millisecond. Anything that wants the live number every frame
   * calls `progress()` or `pack()`, which is what the canvas does.
   */
  let cached: TransformationSnapshot = build();
  const snapshot = () => cached;

  /**
   * Writes the value, then reports if — and only if — something nameable
   * changed. One place decides that, so no caller has to track what the
   * previous flags were.
   */
  const commit = (next?: number) => {
    if (next !== undefined) value = clamp(next, 0, 1);
    index = stageIndexAtPack(packFromScrollProgress(value));

    if (
      announced.index === index &&
      announced.manual === manual &&
      announced.playing === playing
    ) {
      return;
    }
    announced = { index, manual, playing };
    cached = build();
    for (const listener of listeners) listener(cached);
  };

  const cancel = () => {
    if (frame !== null && typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame);
    frame = null;
    duration = 0;
    onArrive = null;
  };

  const step = (now: number) => {
    frame = null;
    if (disposed) return;

    // The first frame has no previous timestamp, and a backgrounded tab
    // returns with an enormous one. Neither should jump the transit.
    const dt = last === 0 ? 16 : Math.min(now - last, 50);
    last = now;
    elapsed += dt;

    const t = duration <= 0 ? 1 : Math.min(elapsed / duration, 1);

    if (t >= 1) {
      duration = 0;
      playing = false;
      const arrived = onArrive;
      onArrive = null;
      commit(to);
      // The callback may change `manual`, so it runs after the state settles
      // and commits again for itself.
      arrived?.();
      return;
    }

    commit(from + (to - from) * smoothstep(t));
    frame = requestAnimationFrame(step);
  };

  /** Engages manual control and walks the value to `target`. */
  const drive = (
    target: number,
    ms: number,
    immediate: boolean,
    arrived?: () => void,
  ) => {
    cancel();
    manual = true;
    scrollAtEngage = scrollValue;

    from = value;
    to = clamp(target, 0, 1);

    const still = Math.abs(to - from) < 0.001;
    if (immediate || still || ms <= 0 || typeof requestAnimationFrame === 'undefined') {
      playing = false;
      commit(to);
      arrived?.();
      return;
    }

    // Distance sets the duration, with a floor so a one-state step still reads
    // as motion rather than a cut.
    duration = Math.max(ms * Math.abs(to - from), 220);
    elapsed = 0;
    last = 0;
    onArrive = arrived ?? null;
    commit();
    frame = requestAnimationFrame(step);
  };

  return {
    progress: () => value,
    pack: () => packFromScrollProgress(value),
    stage: () => TRANSFORMATION_STATES[index],
    snapshot,

    setFromScroll(next) {
      const clamped = clamp(next, 0, 1);
      scrollValue = clamped;

      if (manual) {
        // A hand on the wheel outranks a button pressed a moment ago — but only
        // once the page has actually travelled. Scrub inertia and a
        // ScrollTrigger refresh both arrive as tiny deltas and mean nothing.
        if (Math.abs(clamped - scrollAtEngage) < SCROLL_RECLAIM) return;
        cancel();
        manual = false;
        playing = false;
      }

      commit(clamped);
    },

    goTo(id, options) {
      playing = false;
      drive(scrollForStage(id), JUMP_MS, options?.immediate ?? false);
    },

    play(options) {
      if (options?.immediate) {
        playing = false;
        drive(1, 0, true);
        return;
      }
      // Pressing play on a finished sequence replays it rather than sitting
      // there: rewind first, without animating the rewind.
      if (value > 0.985) drive(0, 0, true);
      playing = true;
      drive(1, PLAY_MS, false);
    },

    stop() {
      if (!playing && frame === null) return;
      cancel();
      playing = false;
      commit();
    },

    reset(options) {
      // RESET is not "show me the worn shell" — that is WEAR. It hands the
      // section back to the page: walk to wherever the scroll actually is and
      // then let go, so the next flick of the wheel continues from there
      // rather than snapping.
      const target = scrollValue;
      if (options?.immediate || typeof requestAnimationFrame === 'undefined') {
        cancel();
        manual = false;
        playing = false;
        commit(target);
        return;
      }
      playing = false;
      drive(target, JUMP_MS, false, () => {
        manual = false;
        commit();
      });
    },

    release() {
      if (!manual && !playing && frame === null) return;
      cancel();
      manual = false;
      playing = false;
      commit();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispose() {
      disposed = true;
      cancel();
      listeners.clear();
    },
  };
}
