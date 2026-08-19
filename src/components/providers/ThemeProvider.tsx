'use client';

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

/* ==========================================================================
   Theme — three choices, two palettes.

   ── Choice vs. paint ─────────────────────────────────────────────────────
   `theme` is what the customer *chose*: 'light', 'dark' or 'system'.
   `resolvedTheme` is what is actually on the screen: 'light' or 'dark'.
   Only the resolved value is ever written to `data-theme`, because every
   selector in `globals.css` (and in `global-error.tsx`) keys off that
   attribute and knows nothing about 'system'. Anything that needs to match
   the painted palette — the Stripe Elements appearance, the 3D lighting rig —
   reads `resolvedTheme`. Anything that renders the preference itself — the
   toggle, the account control — reads `theme`.

   ── 'system' is live ─────────────────────────────────────────────────────
   A one-time read at mount would leave the page in yesterday's palette when
   the OS flips at sunset. A `matchMedia` listener stays attached for the life
   of the tab and repaints in place. A `storage` listener does the same across
   tabs, so changing the theme in one window does not leave the others lying.

   ── Why an external store ────────────────────────────────────────────────
   The preference lives in `localStorage` and `matchMedia`, both of which are
   external systems that do not exist during SSR. `useSyncExternalStore` is
   built for exactly that: it renders the server snapshot through hydration
   and swaps to the real one immediately after, with no effect writing state
   back into React and no cascading render.

   ── No flash ─────────────────────────────────────────────────────────────
   `themeScript` runs synchronously in `<head>`, before first paint, and does
   the same resolution this module does. React hydrates against a document
   that is already correct; `ready` exists only so controls can hold still
   until the stored choice is known to the *component* tree.
   ========================================================================== */

/** What the customer picked. Persisted verbatim. */
export type ThemeChoice = 'light' | 'dark' | 'system';
/** What is painted. The only thing `data-theme` ever holds. */
export type ResolvedTheme = 'light' | 'dark';

export const THEME_CHOICES: readonly ThemeChoice[] = ['light', 'dark', 'system'] as const;

/**
 * The brand default, used when nothing is stored and when `matchMedia` is
 * unavailable or reports no preference. VAYRO is a dark-first house.
 */
export const DEFAULT_CHOICE: ThemeChoice = 'dark';

/**
 * What the default paints as on the server, where there is no device to ask.
 * Stated separately rather than derived, because deriving it would mean
 * calling `matchMedia` in an environment that has none.
 */
const DEFAULT_RESOLVED: ResolvedTheme = 'dark';

export const STORAGE_KEY = 'vayro.theme';

/** Attribute carrying the *choice*, for anything that wants to style on it. */
export const CHOICE_ATTR = 'data-theme-choice';

const MEDIA_LIGHT = '(prefers-color-scheme: light)';

/** How long the cross-fade suppressor stays on. Matches `--d-standard` ×2. */
const SWITCH_MS = 400;

/* ------------------------------------------------------------ migration -- */

/**
 * Normalises whatever is in storage into a choice.
 *
 * Before three-way theming this key only ever held the bare strings 'light'
 * or 'dark', so both remain valid and no customer loses their preference.
 * The rest is defensive: an older build, another tab, or a hand-edited
 * devtools value could leave a JSON-quoted string, different casing, or
 * 'auto'. All are accepted rather than silently resetting someone.
 *
 * Migration is by tolerant *reading*, not by rewriting on load: a legacy
 * value keeps working forever, and the first explicit choice normalises what
 * is stored without a write happening behind the customer's back.
 */
export function normaliseChoice(raw: string | null | undefined): ThemeChoice {
  if (!raw) return DEFAULT_CHOICE;
  let value = raw.trim().toLowerCase();
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1).trim();
  }
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  // Legacy and near-miss spellings.
  if (value === 'auto' || value === 'os' || value === 'device') return 'system';
  return DEFAULT_CHOICE;
}

/* ------------------------------------------------------------ pre-paint -- */

/**
 * Inlined in `<head>` and run before the first paint, so the correct palette
 * is committed on the first frame — including when the choice is 'system',
 * which is resolved here against the media query rather than guessed.
 *
 * Deliberately dependency-free and synchronous. It mirrors `normaliseChoice()`
 * and `resolveChoice()`; change one, change both.
 */
export const themeScript = `(function(){try{
var s=localStorage.getItem('${STORAGE_KEY}');
var v=s?String(s).trim().toLowerCase():'';
if(v.length>1&&v.charAt(0)==='"'&&v.charAt(v.length-1)==='"'){v=v.slice(1,-1).trim();}
if(v==='auto'||v==='os'||v==='device'){v='system';}
var c=(v==='light'||v==='dark'||v==='system')?v:'${DEFAULT_CHOICE}';
var r=c;
if(c==='system'){
var m=window.matchMedia&&window.matchMedia('${MEDIA_LIGHT}');
r=m&&m.matches?'light':'dark';
}
var d=document.documentElement;
d.setAttribute('data-theme',r);
d.setAttribute('${CHOICE_ATTR}',c);
}catch(e){
var f=document.documentElement;
f.setAttribute('data-theme','${DEFAULT_CHOICE}');
f.setAttribute('${CHOICE_ATTR}','${DEFAULT_CHOICE}');
}})();`;

/* --------------------------------------------------------------- store -- */

interface Snapshot {
  theme: ThemeChoice;
  resolvedTheme: ResolvedTheme;
  ready: boolean;
}

/** Reads the OS preference. Falls back to the brand default, not to light. */
function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'dark';
  return window.matchMedia(MEDIA_LIGHT).matches ? 'light' : 'dark';
}

function resolveChoice(choice: ThemeChoice): ResolvedTheme {
  return choice === 'system' ? systemTheme() : choice;
}

function storedChoice(): ThemeChoice {
  try {
    return normaliseChoice(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_CHOICE; // private mode, or storage disabled
  }
}

/**
 * The snapshot rendered on the server and through hydration. `ready: false`
 * is the honest answer there: nothing has read the customer's preference yet.
 * A module constant, because `getServerSnapshot` must be referentially stable.
 */
const SERVER_SNAPSHOT: Snapshot = {
  theme: DEFAULT_CHOICE,
  resolvedTheme: DEFAULT_RESOLVED,
  ready: false,
};

/**
 * Cached client snapshot. `getSnapshot` must return the same reference until
 * something genuinely changes, or React re-renders forever.
 */
let snapshot: Snapshot | null = null;
const listeners = new Set<() => void>();
let watching = false;

function getSnapshot(): Snapshot {
  if (!snapshot) {
    const choice = storedChoice();
    snapshot = { theme: choice, resolvedTheme: resolveChoice(choice), ready: true };
  }
  return snapshot;
}

function getServerSnapshot(): Snapshot {
  return SERVER_SNAPSHOT;
}

function publish(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

/**
 * Commits a resolved palette to the document. The transition suppressor goes
 * on only when the palette genuinely changes, so a no-op re-apply never
 * forces a repaint of every element on the page.
 */
function paint(next: ResolvedTheme) {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') === next) return;
  root.classList.add('theme-switching');
  root.setAttribute('data-theme', next);
  window.setTimeout(() => root.classList.remove('theme-switching'), SWITCH_MS);
}

/** Attached once, on the first subscriber, and left in place for the tab. */
function watch() {
  if (watching || typeof window === 'undefined') return;
  watching = true;

  // Reconcile with whatever the pre-paint script committed. They agree in
  // every ordinary case — same inputs, same logic — but the OS preference can
  // flip in the window between the script running and hydration finishing,
  // and `paint()` is a no-op when they already match.
  const current = getSnapshot();
  document.documentElement.setAttribute(CHOICE_ATTR, current.theme);
  paint(current.resolvedTheme);

  if (typeof window.matchMedia === 'function') {
    window.matchMedia(MEDIA_LIGHT).addEventListener('change', (event) => {
      // Only acts while the customer is actually following the system.
      if (getSnapshot().theme !== 'system') return;
      const resolved: ResolvedTheme = event.matches ? 'light' : 'dark';
      paint(resolved);
      publish({ theme: 'system', resolvedTheme: resolved, ready: true });
    });
  }

  // Another tab changed the choice. `event.key === null` is a whole-storage
  // clear, which counts too.
  window.addEventListener('storage', (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    const choice = normaliseChoice(event.newValue ?? null);
    const resolved = resolveChoice(choice);
    document.documentElement.setAttribute(CHOICE_ATTR, choice);
    paint(resolved);
    publish({ theme: choice, resolvedTheme: resolved, ready: true });
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  watch();
  return () => {
    listeners.delete(listener);
  };
}

/** Applies and persists a choice. Safe to call from an event handler only. */
function commit(next: ThemeChoice) {
  const choice = normaliseChoice(next);
  const resolved = resolveChoice(choice);

  document.documentElement.setAttribute(CHOICE_ATTR, choice);
  // The choice is persisted, never the resolved value: a customer who picked
  // 'system' must keep following the system after a reload.
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* private mode — the choice holds for this session only */
  }
  paint(resolved);
  publish({ theme: choice, resolvedTheme: resolved, ready: true });
}

/* ------------------------------------------------------------- provider -- */

interface Ctx {
  /** The customer's choice — 'light' | 'dark' | 'system'. */
  theme: ThemeChoice;
  /** The palette actually applied — 'light' | 'dark'. Never 'system'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (next: ThemeChoice) => void;
  /** Cycles light → dark → system → light. */
  toggle: () => void;
  /** False until the stored choice has been read on the client. */
  ready: boolean;
}

const ThemeContext = createContext<Ctx>({
  theme: SERVER_SNAPSHOT.theme,
  resolvedTheme: SERVER_SNAPSHOT.resolvedTheme,
  setTheme: () => {},
  toggle: () => {},
  ready: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((next: ThemeChoice) => commit(next), []);

  const toggle = useCallback(() => {
    const order: ThemeChoice[] = ['light', 'dark', 'system'];
    const index = order.indexOf(getSnapshot().theme);
    commit(order[(index + 1) % order.length]);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      theme: state.theme,
      resolvedTheme: state.resolvedTheme,
      ready: state.ready,
      setTheme,
      toggle,
    }),
    [state, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
