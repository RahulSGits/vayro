/**
 * VAYRO design tokens — the single source of truth for the visual system.
 * Every component consumes these (directly, or via the CSS variables that
 * mirror them in globals.css). Nothing invents its own values.
 */

/* ------------------------------------------------------------------ colour */
/** Raw palette. Never referenced directly by components — use `semantic`. */
export const palette = {
  ink:        '#0B0C0B', // VAYRO Black — deep near-black, never pure #000
  ink80:      '#1A1C1A',
  ink60:      '#2A2D2B',
  graphite:   '#3A3E3C',
  slate:      '#5C6360',
  titanium:   '#8C9195',
  stone:      '#B9B2A5',
  sand:       '#D8D0C0',
  bone:       '#EAE5DB',
  ivory:      '#F4F1EA', // VAYRO Ivory — warm off-white
  white:      '#FBFAF7',

  forest:     '#1E2C25', // muted forest
  olive:      '#3D4536', // deep olive
  moss:       '#5A6350',

  signal:     '#C4501E', // restrained ember — used for nothing but true alerts
  positive:   '#2F6B4F',
  warning:    '#8A6A1F',
  danger:     '#9B2C20',
} as const;

/** Semantic tokens, resolved per theme. Components only ever use these names. */
export const semantic = {
  light: {
    bg:            palette.ivory,
    bgElevated:    palette.white,
    bgSunken:      palette.bone,
    bgInverse:     palette.ink,
    fg:            palette.ink,
    fgMuted:       palette.slate,
    fgSubtle:      palette.titanium,
    fgInverse:     palette.ivory,
    border:        'rgba(11,12,11,0.12)',
    borderStrong:  'rgba(11,12,11,0.26)',
    accent:        palette.forest,
    accentFg:      palette.ivory,
    overlay:       'rgba(11,12,11,0.44)',
    scrim:         'linear-gradient(180deg, rgba(11,12,11,0) 0%, rgba(11,12,11,0.55) 100%)',
  },
  dark: {
    bg:            palette.ink,
    bgElevated:    palette.ink80,
    bgSunken:      '#060706',
    bgInverse:     palette.ivory,
    fg:            palette.ivory,
    fgMuted:       palette.stone,
    fgSubtle:      palette.titanium,
    fgInverse:     palette.ink,
    border:        'rgba(244,241,234,0.14)',
    borderStrong:  'rgba(244,241,234,0.30)',
    accent:        palette.bone,
    accentFg:      palette.ink,
    overlay:       'rgba(6,7,6,0.62)',
    scrim:         'linear-gradient(180deg, rgba(6,7,6,0) 0%, rgba(6,7,6,0.72) 100%)',
  },
} as const;

/* -------------------------------------------------------------- typography */
export const type = {
  family: {
    display: 'var(--font-display)',
    sans:    'var(--font-sans)',
    mono:    'var(--font-mono)',
  },
  /** [size, lineHeight, letterSpacing, weight] — fluid via clamp where useful */
  scale: {
    displayXl: { size: 'clamp(3.4rem, 11vw, 9.5rem)',  lh: '0.88', ls: '-0.04em', weight: 500 },
    displayLg: { size: 'clamp(2.6rem, 7.5vw, 6rem)',   lh: '0.92', ls: '-0.035em', weight: 500 },
    displayMd: { size: 'clamp(2rem, 4.6vw, 3.5rem)',   lh: '0.98', ls: '-0.03em', weight: 500 },
    h1:        { size: 'clamp(1.9rem, 3.6vw, 2.75rem)', lh: '1.06', ls: '-0.025em', weight: 500 },
    h2:        { size: 'clamp(1.5rem, 2.6vw, 2rem)',   lh: '1.12', ls: '-0.02em', weight: 500 },
    h3:        { size: 'clamp(1.15rem, 1.7vw, 1.375rem)', lh: '1.24', ls: '-0.012em', weight: 500 },
    bodyLg:    { size: '1.0625rem', lh: '1.62', ls: '-0.006em', weight: 400 },
    body:      { size: '0.9375rem', lh: '1.66', ls: '-0.004em', weight: 400 },
    bodySm:    { size: '0.8125rem', lh: '1.6',  ls: '0',        weight: 400 },
    label:     { size: '0.6875rem', lh: '1.1',  ls: '0.22em',   weight: 500 },
    labelSm:   { size: '0.625rem',  lh: '1.1',  ls: '0.26em',   weight: 500 },
    caption:   { size: '0.75rem',   lh: '1.45', ls: '0.01em',   weight: 400 },
    price:     { size: '1.0625rem', lh: '1.2',  ls: '-0.01em',  weight: 500 },
    priceLg:   { size: '1.5rem',    lh: '1.1',  ls: '-0.02em',  weight: 500 },
    spec:      { size: '0.75rem',   lh: '1.5',  ls: '0.06em',   weight: 400 },
  },
} as const;

/* ------------------------------------------------------------------ layout */
/** 4px base. Named steps only — no magic numbers in components. */
export const space = {
  px: '1px', 0: '0', 1: '0.25rem', 2: '0.5rem', 3: '0.75rem', 4: '1rem',
  5: '1.25rem', 6: '1.5rem', 8: '2rem', 10: '2.5rem', 12: '3rem',
  16: '4rem', 20: '5rem', 24: '6rem', 32: '8rem', 40: '10rem', 48: '12rem',
} as const;

/** Section rhythm — the vertical beat of every page. */
export const section = {
  tight:   'clamp(3rem, 6vw, 5rem)',
  default: 'clamp(4.5rem, 9vw, 8rem)',
  loose:   'clamp(6rem, 13vw, 12rem)',
} as const;

export const layout = {
  maxWidth:   '90rem',   // 1440
  maxText:    '38rem',
  gutter:     'clamp(1.25rem, 4vw, 3.5rem)',
  columns:    12,
  headerH:    '4.5rem',
  headerHSm:  '3.5rem',
} as const;

/** Restrained radii — this brand is engineered, not soft. */
export const radius = {
  none: '0', xs: '2px', sm: '3px', md: '4px', lg: '6px', pill: '999px',
} as const;

/** Elevation is light and cool — never a soft grey blur. */
export const shadow = {
  none: 'none',
  sm:   '0 1px 2px rgba(11,12,11,0.06), 0 1px 1px rgba(11,12,11,0.04)',
  md:   '0 4px 16px rgba(11,12,11,0.08), 0 1px 2px rgba(11,12,11,0.05)',
  lg:   '0 12px 40px rgba(11,12,11,0.12), 0 2px 6px rgba(11,12,11,0.06)',
  xl:   '0 28px 80px rgba(11,12,11,0.18), 0 4px 12px rgba(11,12,11,0.08)',
  focus:'0 0 0 2px var(--bg), 0 0 0 4px var(--fg)',
} as const;

/* ------------------------------------------------------------------ motion */
/** Three registers. Nothing animates at a duration outside this set. */
export const motion = {
  duration: {
    instant: 0.09,
    fast:    0.16,   // 100-180ms  — functional feedback
    standard:0.34,   // 250-450ms  — UI transitions
    slow:    0.52,
    cinematic: 0.9,  // 600-1200ms — storytelling
    epic:    1.2,
  },
  ease: {
    /** Default. Firm out-ease — arrives with authority, no bounce. */
    out:      [0.16, 1, 0.3, 1] as const,
    inOut:    [0.65, 0, 0.35, 1] as const,
    in:       [0.5, 0, 0.75, 0] as const,
    /** For material that folds — a touch of overshoot-free snap. */
    fold:     [0.32, 0.72, 0, 1] as const,
    linear:   [0, 0, 1, 1] as const,
  },
  stagger: { tight: 0.035, default: 0.06, loose: 0.11 },
} as const;

export const easeCss = {
  out:   'cubic-bezier(0.16, 1, 0.3, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  in:    'cubic-bezier(0.5, 0, 0.75, 0)',
  fold:  'cubic-bezier(0.32, 0.72, 0, 1)',
} as const;

/* ------------------------------------------------------------- breakpoints */
export const breakpoint = {
  sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536,
} as const;

export const z = {
  base: 0, raised: 10, sticky: 100, header: 200, drawer: 300,
  overlay: 400, modal: 500, toast: 600, cursor: 900,
} as const;

/* -------------------------------------------------------------------- 3D */
/** Performance budgets and camera language for the WebGL layer. */
export const three = {
  dpr: { min: 1, max: 2 },
  tiers: {
    high:   { dpr: 2,   shadows: true,  env: 'studio', particles: 900, aa: true },
    medium: { dpr: 1.5, shadows: true,  env: 'studio', particles: 380, aa: true },
    low:    { dpr: 1,   shadows: false, env: 'none',   particles: 0,   aa: false },
  },
  camera: { fov: 32, near: 0.1, far: 120, position: [0, 0.15, 5.2] as const },
  /** Slow, cinematic orbit. Never fast enough to feel like a demo. */
  orbit: { speed: 0.16, maxPolar: 1.92, minPolar: 0.78, damping: 0.07 },
  material: {
    shellRoughness: 0.62,
    shellMetalness: 0.04,
    hardwareRoughness: 0.28,
    hardwareMetalness: 0.92,
  },
} as const;

export type ThemeName = keyof typeof semantic;
export type SemanticToken = keyof (typeof semantic)['light'];
