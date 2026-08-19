import { cn } from '@/lib/utils';

/* ==========================================================================
   VAYRO icon system — the brand/product domain set.

   Drawn on the same geometry as the VAYRO mark: a 24 grid, 1.5 stroke,
   chamfered corners instead of radii, flat terminals, mitred joins, and the
   chevron's turned arm wherever a line has to change direction. Nothing here
   uses a rounded cap — the identity has none.

   Scope: these are the *domain* icons — movement, weather, packability,
   weight, material, ventilation, storage, travel, durability, care,
   temperature, water resistance, carry and fit. Generic UI chrome (chevrons,
   close, search, cart) stays on `lucide-react`; this set is not a replacement
   for it.

   The names are the contract with the catalogue: `Product['features'][].icon`
   uses `carry pack weight weather travel vent fit`, every one of which
   resolves here. `isIconName()` narrows the raw string safely.
   ========================================================================== */

export const ICON_NAMES = [
  'movement',
  'weather',
  'pack',
  'weight',
  'material',
  'vent',
  'storage',
  'travel',
  'durability',
  'care',
  'temperature',
  'water',
  'carry',
  'fit',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export type IconProps = {
  /** Rendered size in px. The stroke scales with it — always 1.5 on a 24 grid. */
  size?: number | string;
  className?: string;
  /**
   * Accessible name. Supplied → the icon is exposed as an image with this
   * label. Omitted → the icon is decorative and hidden from assistive tech,
   * which is correct whenever adjacent text already carries the meaning.
   */
  title?: string;
};

/* --------------------------------------------------------------- frame -- */

/**
 * Shared drawing surface. Every glyph below is pure path data on this frame,
 * so the family stays optically consistent at any size.
 */
function Glyph({
  size = 24,
  className,
  title,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeMiterlimit={8}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/* --------------------------------------------------------------- glyphs -- */

/** Movement — a route that runs, turns and ascends. The mark's own gesture. */
export function MovementIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M2.5 19H9.5L13.5 9.5H21.5" />
      <path d="M18 6L21.5 9.5L18 13" />
    </Glyph>
  );
}

/** Weather — an angular front with falling rain. Resistance, not immunity. */
export function WeatherIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 16V12.5L6.5 9.5H9.5L12 6H16L19 9V12.5L16.5 16Z" />
      <path d="M7 18.5L5.5 21.5" />
      <path d="M12 18.5L10.5 21.5" />
      <path d="M17 18.5L15.5 21.5" />
    </Glyph>
  );
}

/** Packable — volume compressed between two plates. */
export function PackIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 3.5H20" />
      <path d="M7.5 6.5L12 11L16.5 6.5" />
      <path d="M7.5 17.5L12 13L16.5 17.5" />
      <path d="M4 20.5H20" />
    </Glyph>
  );
}

/** Weight — a balance. Grams are a measurement, not a burden. */
export function WeightIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 7H20" />
      <path d="M12 3.5V20" />
      <path d="M8 20H16" />
      <path d="M2.5 12.5L6 7L9.5 12.5Z" />
      <path d="M14.5 12.5L18 7L21.5 12.5Z" />
    </Glyph>
  );
}

/** Material — a swatch on the ripstop grid, corner turned to show the face. */
export function MaterialIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 3.5H20.5V16.5L16.5 20.5H3.5Z" />
      <path d="M16.5 20.5V16.5H20.5" />
      <path d="M9 3.5V20.5" />
      <path d="M15 3.5V20.5" />
      <path d="M3.5 9H20.5" />
      <path d="M3.5 15H20.5" />
    </Glyph>
  );
}

/** Ventilation — air drawn through and released upward. */
export function VentIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 6.5H12.5L15.5 3.5" />
      <path d="M3 12H16.5L19.5 9" />
      <path d="M3 17.5H12.5L15.5 14.5" />
    </Glyph>
  );
}

/** Storage — a chamfered volume divided into compartments. */
export function StorageIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3 6H17.5L21 9.5V20.5H3Z" />
      <path d="M3 13H21" />
      <path d="M12 13V20.5" />
    </Glyph>
  );
}

/** Travel — transit, drawn as a flat plan rather than a silhouette. */
export function TravelIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2L13.3 4.6V9.4L21.5 14.4V16.4L13.3 13.6V18.6L15.8 20.6V22.2L12 21L8.2 22.2V20.6L10.7 18.6V13.6L2.5 16.4V14.4L10.7 9.4V4.6Z" />
    </Glyph>
  );
}

/** Durability — a chamfered shield carrying the mark's turned arm. */
export function DurabilityIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 5.5L12 2.5L20 5.5V11.5L12 21.5L4 11.5Z" />
      <path d="M8.5 11L11 13.5L15.5 8.5" />
    </Glyph>
  );
}

/** Care — the wash tub of the international care vocabulary, chamfered. */
export function CareIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M3.5 8H20.5L18 19.5H6Z" />
      <path d="M7 12.5H17" />
    </Glyph>
  );
}

/** Temperature — a faceted column and bulb, with two scale marks. */
export function TemperatureIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M10.5 4.5L12 3L13.5 4.5V14.4L15.5 16.4V18.6L13.5 20.6H10.5L8.5 18.6V16.4L10.5 14.4Z" />
      <path d="M12 8.5V17.5" />
      <path d="M15.5 7H18" />
      <path d="M15.5 10.5H18" />
    </Glyph>
  );
}

/** Water resistance — a drop held off the face, beading on the surface. */
export function WaterIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M12 2.5L17.5 10V13L14.5 17H9.5L6.5 13V10Z" />
      <path d="M2.5 21H21.5" />
      <path d="M4 21L5.2 19.3L6.4 21" />
      <path d="M17.6 21L18.8 19.3L20 21" />
    </Glyph>
  );
}

/** Carry — the packed state: a chamfered unit under a handle. */
export function CarryIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M4 8.5H16.5L20 12V21H4Z" />
      <path d="M8.5 8.5V6L10.5 4H13.5L15.5 6V8.5" />
    </Glyph>
  );
}

/** Fit — the cut itself: shoulder, body line, neckline. */
export function FitIcon(props: IconProps) {
  return (
    <Glyph {...props}>
      <path d="M8.5 3.5L4 6L6 10.5L8.5 9.2V20.5H15.5V9.2L18 10.5L20 6L15.5 3.5Z" />
      <path d="M8.5 3.5L12 6.5L15.5 3.5" />
    </Glyph>
  );
}

/* --------------------------------------------------------------- lookup -- */

export type IconComponent = (props: IconProps) => React.JSX.Element;

/** Name → glyph. Exhaustive by construction: `Record<IconName, …>`. */
export const ICONS: Record<IconName, IconComponent> = {
  movement: MovementIcon,
  weather: WeatherIcon,
  pack: PackIcon,
  weight: WeightIcon,
  material: MaterialIcon,
  vent: VentIcon,
  storage: StorageIcon,
  travel: TravelIcon,
  durability: DurabilityIcon,
  care: CareIcon,
  temperature: TemperatureIcon,
  water: WaterIcon,
  carry: CarryIcon,
  fit: FitIcon,
};

/**
 * Human labels, used as the accessible name when an icon stands alone and as
 * the fallback caption in specification lists.
 */
export const ICON_LABELS: Record<IconName, string> = {
  movement: 'Movement',
  weather: 'Weather resistant',
  pack: 'Packable',
  weight: 'Weight',
  material: 'Material',
  vent: 'Ventilation',
  storage: 'Storage',
  travel: 'Travel',
  durability: 'Durability',
  care: 'Care',
  temperature: 'Temperature',
  water: 'Water resistance',
  carry: 'Carry',
  fit: 'Fit',
};

/** Narrows a catalogue string — `Product['features'][].icon` is a plain string. */
export function isIconName(value: string | null | undefined): value is IconName {
  return typeof value === 'string' && value in ICONS;
}

/**
 * Resolves a catalogue string to a glyph, or `null` when the name is unknown —
 * so an unrecognised feature icon degrades to no icon rather than to a crash.
 */
export function resolveIcon(value: string | null | undefined): IconComponent | null {
  return isIconName(value) ? ICONS[value] : null;
}

/** Lookup renderer: `<Icon name="pack" size={20} />`. */
export function Icon({ name, ...rest }: IconProps & { name: IconName }) {
  const Component = ICONS[name];
  return <Component {...rest} />;
}
