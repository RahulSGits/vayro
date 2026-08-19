import type { Product, Collection, Category, JournalPost, Review } from '@/types';

/**
 * VAYRO seed catalogue. This is the storefront's source of truth in demo mode
 * and the payload used by `npm run seed` to populate Supabase. Content here is
 * real brand copy — not lorem — so the site reads correctly out of the box.
 */

const M = (n: number) => n * 100; // rupees -> paise

export const categories: Category[] = [
  { id: 'cat-jackets',    slug: 'jackets',    name: 'Jackets',    description: 'Outer layers engineered to pack.', position: 1 },
  { id: 'cat-outerwear',  slug: 'outerwear',  name: 'Outerwear',  description: 'Shells, mids and windproof layers.', position: 2 },
  { id: 'cat-travel',     slug: 'travel',     name: 'Travel',     description: 'Built for transit and long days.', position: 3 },
  { id: 'cat-camping',    slug: 'camping',    name: 'Camping',    description: 'Field equipment, quietly made.', position: 4 },
  { id: 'cat-essentials', slug: 'essentials', name: 'Essentials', description: 'The pieces underneath everything.', position: 5 },
  { id: 'cat-bags',       slug: 'bags',       name: 'Bags',       description: 'Carry systems that fold away.', position: 6 },
];

export const collections: Collection[] = [
  { id: 'col-01', slug: 'new-arrivals', name: 'New Arrivals', tagline: 'Just landed.',
    description: 'The most recent additions to the VAYRO system.', heroImage: '/media/field-ridgeline.webp', position: 1 },
  { id: 'col-02', slug: 'the-carry-system', name: 'The Carry System', tagline: 'Wear. Pack. Move.',
    description: 'Pieces that fold into their own carry configuration.', heroImage: '/media/field-ascent.webp', position: 2 },
  { id: 'col-03', slug: 'field-tested', name: 'Field Tested', tagline: 'Proven in transit.',
    description: 'Equipment taken through airports, ridgelines and everything between.', heroImage: '/media/field-highpass.webp', position: 3 },
  { id: 'col-04', slug: 'limited-drops', name: 'Limited Drops', tagline: 'Made once.',
    description: 'Short runs in colourways that will not return.', heroImage: '/media/field-dusk.webp', position: 4 },
];

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

function variantsFor(
  productId: string,
  prefix: string,
  colorways: { name: string; hex: string; stock: number[] }[],
): Product['variants'] {
  return colorways.flatMap((c) =>
    sizes.map((size, i) => ({
      id: `${productId}-${c.name.toLowerCase().replace(/\s+/g, '-')}-${size.toLowerCase()}`,
      sku: `${prefix}-${c.name.slice(0, 3).toUpperCase()}-${size}`,
      productId,
      colorway: c.name,
      colorHex: c.hex,
      size,
      priceOverride: null,
      stock: c.stock[i] ?? 0,
      available: (c.stock[i] ?? 0) > 0,
      weightGrams: 420,
    })),
  );
}

/* ------------------------------------------------------------------ hero -- */

const meridian: Product = {
  id: 'prd-meridian-shell',
  slug: 'meridian-carry-shell',
  name: 'Meridian Carry Shell',
  subtitle: 'One layer. Every destination.',
  story:
    'The Meridian was drawn around a single question: what does a jacket owe you once you take it off? '
    + 'Most outer layers become luggage the moment the weather clears — a sleeve knotted at the waist, '
    + 'a bulk that will not compress. The Meridian answers by folding into its own hood. The collar '
    + 'inverts, the shell compresses into the lined cavity, and the internal webbing becomes a handle '
    + 'and a shoulder strap. It leaves your hands, not your kit.',
  description:
    'A packable technical shell with an integrated carry system. Worn, it is a clean, articulated '
    + 'outer layer. Packed, it is a 2.1-litre carry unit that clips to a bag or travels on the shoulder.',
  status: 'published',
  price: M(5999),
  compareAtPrice: null,
  currency: 'INR',
  categorySlug: 'jackets',
  collectionSlugs: ['new-arrivals', 'the-carry-system', 'field-tested'],
  badges: ['Integrated carry', 'Packs to 2.1L'],
  featured: true,
  createdAt: '2026-02-14T09:00:00.000Z',
  images: [
    { id: 'i1', url: '/media/studio-dark.webp',       alt: 'Meridian Carry Shell, front, studio',      position: 1, kind: 'technical', colorway: 'Basalt' },
    { id: 'i2', url: '/media/studio-forest.webp',     alt: 'Meridian Carry Shell in Deep Forest',      position: 2, kind: 'technical', colorway: 'Deep Forest' },
    { id: 'i3', url: '/media/field-ascent.webp',      alt: 'Meridian Carry Shell worn on a ridgeline', position: 3, kind: 'editorial' },
    { id: 'i4', url: '/media/material-ripstop.webp',  alt: 'Ripstop shell fabric at magnification',    position: 4, kind: 'detail' },
    { id: 'i5', url: '/media/field-transit.webp',     alt: 'Meridian packed, in transit',              position: 5, kind: 'editorial' },
    { id: 'i6', url: '/media/studio-stone.webp',      alt: 'Meridian Carry Shell in Sandstone',        position: 6, kind: 'technical', colorway: 'Sandstone' },
  ],
  models: [
    { id: 'm1', url: '/models/meridian-shell.glb',          format: 'glb', mode: 'default',        placeholder: true, sizeBytes: null },
    { id: 'm2', url: '/models/meridian-transformation.glb', format: 'glb', mode: 'transformation', placeholder: true, sizeBytes: null },
    { id: 'm3', url: '/models/meridian-exploded.glb',       format: 'glb', mode: 'exploded',       placeholder: true, sizeBytes: null },
  ],
  variants: variantsFor('prd-meridian-shell', 'MER', [
    { name: 'Basalt',      hex: '#1A1C1A', stock: [6, 14, 22, 18, 9, 4] },
    { name: 'Deep Forest', hex: '#1E2C25', stock: [4, 11, 17, 12, 6, 2] },
    { name: 'Sandstone',   hex: '#D8D0C0', stock: [3, 8, 12, 9, 0, 0] },
    { name: 'Titanium',    hex: '#8C9195', stock: [0, 5, 9, 7, 3, 0] },
  ]),
  specs: [
    { label: 'Shell',            value: '20D recycled ripstop nylon, 42 gsm',        group: 'materials' },
    { label: 'Membrane',         value: 'Air-permeable PU, 10k/10k',                 group: 'materials' },
    { label: 'Lining',           value: 'Brushed 15D taffeta, hood cavity only',     group: 'materials' },
    { label: 'Hardware',         value: 'Anodised alloy pulls, YKK Vislon main zip', group: 'materials' },
    { label: 'Seams',            value: 'Fully taped, 13 mm',                        group: 'construction' },
    { label: 'Articulation',     value: 'Pre-shaped elbow, gusseted underarm',       group: 'construction' },
    { label: 'Pockets',          value: 'Two hand, one internal, one carry cavity',  group: 'construction' },
    { label: 'Packed volume',    value: '2.1 L',                                     group: 'dimensions' },
    { label: 'Packed size',      value: '24 × 16 × 9 cm',                            group: 'dimensions' },
    { label: 'Weight (size M)',  value: '318 g',                                     group: 'dimensions' },
    { label: 'Wind resistance',  value: 'Tested to 60 km/h',                         group: 'performance' },
    { label: 'Water resistance', value: 'DWR finish, PFC-free. Not waterproof.',      group: 'performance' },
    { label: 'Wash',             value: 'Machine cold, gentle. Do not tumble dry.',  group: 'care' },
    { label: 'Reproofing',       value: 'Reapply DWR after 20 washes.',              group: 'care' },
  ],
  hotspots: [
    { id: 'h1', title: 'Carry cavity',   body: 'The hood lining doubles as the pack cavity. Invert, compress, close.', x: 0.5,  y: 0.13, anchor3d: [0, 1.15, 0.18] },
    { id: 'h2', title: 'Load webbing',   body: 'Internal webbing takes the packed load and becomes the shoulder strap.', x: 0.32, y: 0.4,  anchor3d: [-0.42, 0.4, 0.22] },
    { id: 'h3', title: 'Gusseted underarm', body: 'Cut so the shoulder moves without lifting the hem.', x: 0.72, y: 0.36, anchor3d: [0.5, 0.55, 0.1] },
    { id: 'h4', title: 'Hand pockets',   body: 'Set high to clear a hip belt. Both close.', x: 0.36, y: 0.62, anchor3d: [-0.34, -0.1, 0.28] },
    { id: 'h5', title: 'Hem drawcord',   body: 'Single-hand adjust, cord tails routed inside.', x: 0.5,  y: 0.86, anchor3d: [0, -0.62, 0.24] },
  ],
  features: [
    { title: 'Integrated carry',   body: 'Folds into its own hood and becomes a 2.1 L carry unit with a shoulder strap.', icon: 'carry' },
    { title: 'Packable design',    body: 'Compresses to 24 × 16 × 9 cm without a stuff sack to lose.', icon: 'pack' },
    { title: 'Lightweight shell',  body: '318 g in size M. 20D recycled ripstop at 42 gsm.', icon: 'weight' },
    { title: 'Weather resistant',  body: 'PFC-free DWR and taped seams. Built for wind and passing rain.', icon: 'weather' },
    { title: 'Travel optimised',   body: 'Passport-depth internal pocket. Hem clears a hip belt.', icon: 'travel' },
    { title: 'Breathable',         body: 'Air-permeable membrane and gusseted underarms move heat out.', icon: 'vent' },
  ],
  care: [
    'Close all zips before washing.',
    'Machine wash cold on a gentle cycle with a technical detergent.',
    'Do not use fabric softener — it blocks the DWR.',
    'Line dry. A cool iron through a cloth will reactivate the finish.',
  ],
};

/* ------------------------------------------------------- supporting range -- */

const ridgeline: Product = {
  id: 'prd-ridgeline-mid',
  slug: 'ridgeline-grid-mid',
  name: 'Ridgeline Grid Mid',
  subtitle: 'Warmth that folds flat.',
  story:
    'A grid-fleece mid layer cut to sit under the Meridian without bunching at the shoulder. '
    + 'The grid face traps air where you need it and vents where you do not.',
  description: 'Grid-fleece mid layer with a flat-locked shoulder seam and a low-profile collar.',
  status: 'published',
  price: M(3499), compareAtPrice: null, currency: 'INR',
  categorySlug: 'outerwear',
  collectionSlugs: ['new-arrivals', 'field-tested'],
  badges: ['Layering cut'], featured: false,
  createdAt: '2026-02-20T09:00:00.000Z',
  images: [
    { id: 'i1', url: '/media/studio-forest.webp', alt: 'Ridgeline Grid Mid, studio', position: 1, kind: 'technical', colorway: 'Deep Forest' },
    { id: 'i2', url: '/media/material-twill.webp', alt: 'Grid fleece structure', position: 2, kind: 'detail' },
    { id: 'i3', url: '/media/field-treeline.webp', alt: 'Ridgeline Grid Mid at the treeline', position: 3, kind: 'editorial' },
  ],
  models: [],
  variants: variantsFor('prd-ridgeline-mid', 'RDG', [
    { name: 'Deep Forest', hex: '#1E2C25', stock: [5, 12, 16, 11, 5, 2] },
    { name: 'Basalt',      hex: '#1A1C1A', stock: [4, 9, 14, 10, 4, 1] },
  ]),
  specs: [
    { label: 'Face',   value: 'Recycled grid fleece, 145 gsm', group: 'materials' },
    { label: 'Seams',  value: 'Flat-locked throughout',        group: 'construction' },
    { label: 'Weight', value: '246 g (size M)',                group: 'dimensions' },
    { label: 'Wash',   value: 'Machine cold, gentle',          group: 'care' },
  ],
  hotspots: [], features: [
    { title: 'Grid face',     body: 'Traps air in the grid, vents through the channels.', icon: 'vent' },
    { title: 'Layering cut',  body: 'Shoulder seam sits inboard so a shell rides clean over it.', icon: 'fit' },
  ],
  care: ['Machine wash cold.', 'Line dry.'],
};

const transit: Product = {
  id: 'prd-transit-pack',
  slug: 'transit-fold-pack',
  name: 'Transit Fold Pack',
  subtitle: 'Eighteen litres, then nothing.',
  story:
    'A daypack that collapses into its own base panel. Carried full it holds a day of transit; '
    + 'emptied it folds to the size of a paperback and stows in the Meridian.',
  description: '18 L packable daypack with a folding base panel and load-bearing shoulder webbing.',
  status: 'published',
  price: M(4299), compareAtPrice: null, currency: 'INR',
  categorySlug: 'bags',
  collectionSlugs: ['the-carry-system', 'new-arrivals'],
  badges: ['Folds to 0.9 L'], featured: true,
  createdAt: '2026-03-02T09:00:00.000Z',
  images: [
    { id: 'i1', url: '/media/studio-dark.webp',      alt: 'Transit Fold Pack, studio',   position: 1, kind: 'technical', colorway: 'Basalt' },
    { id: 'i2', url: '/media/material-shell.webp',   alt: 'Pack shell fabric detail',    position: 2, kind: 'detail' },
    { id: 'i3', url: '/media/field-transit.webp',    alt: 'Transit Fold Pack in transit', position: 3, kind: 'editorial' },
  ],
  models: [],
  variants: [
    { id: 'prd-transit-pack-basalt-os', sku: 'TRN-BAS-OS', productId: 'prd-transit-pack', colorway: 'Basalt', colorHex: '#1A1C1A', size: 'One Size', priceOverride: null, stock: 26, available: true, weightGrams: 290 },
    { id: 'prd-transit-pack-titanium-os', sku: 'TRN-TIT-OS', productId: 'prd-transit-pack', colorway: 'Titanium', colorHex: '#8C9195', size: 'One Size', priceOverride: null, stock: 12, available: true, weightGrams: 290 },
  ],
  specs: [
    { label: 'Volume',      value: '18 L',                       group: 'dimensions' },
    { label: 'Folded',      value: '0.9 L',                      group: 'dimensions' },
    { label: 'Weight',      value: '290 g',                      group: 'dimensions' },
    { label: 'Shell',       value: '40D ripstop, PU-backed',     group: 'materials' },
  ],
  hotspots: [], features: [
    { title: 'Folding base', body: 'The base panel inverts and takes the whole pack.', icon: 'pack' },
    { title: 'Load webbing', body: 'Shoulder webbing is bar-tacked to the base, not the shell.', icon: 'carry' },
  ],
  care: ['Sponge clean.', 'Air dry fully before folding.'],
};

const cordCap: Product = {
  id: 'prd-bearing-cap',
  slug: 'bearing-cap',
  name: 'Bearing Cap',
  subtitle: 'Packs in a fist.',
  story: 'A five-panel cap in shell fabric with a soft brim that rolls without creasing.',
  description: 'Packable five-panel cap in 40D ripstop with a rollable brim.',
  status: 'published',
  price: M(1499), compareAtPrice: null, currency: 'INR',
  categorySlug: 'essentials',
  collectionSlugs: ['new-arrivals', 'limited-drops'],
  badges: [], featured: false,
  createdAt: '2026-03-11T09:00:00.000Z',
  images: [
    { id: 'i1', url: '/media/studio-stone.webp',   alt: 'Bearing Cap, studio',  position: 1, kind: 'technical', colorway: 'Sandstone' },
    { id: 'i2', url: '/media/material-liner.webp', alt: 'Cap fabric detail',    position: 2, kind: 'detail' },
  ],
  models: [],
  variants: [
    { id: 'prd-bearing-cap-sandstone-os', sku: 'BRG-SAN-OS', productId: 'prd-bearing-cap', colorway: 'Sandstone', colorHex: '#D8D0C0', size: 'One Size', priceOverride: null, stock: 34, available: true, weightGrams: 62 },
    { id: 'prd-bearing-cap-basalt-os',    sku: 'BRG-BAS-OS', productId: 'prd-bearing-cap', colorway: 'Basalt',    colorHex: '#1A1C1A', size: 'One Size', priceOverride: null, stock: 0,  available: false, weightGrams: 62 },
  ],
  specs: [
    { label: 'Shell',  value: '40D ripstop', group: 'materials' },
    { label: 'Weight', value: '62 g',        group: 'dimensions' },
  ],
  hotspots: [], features: [{ title: 'Rollable brim', body: 'Returns flat after packing.', icon: 'pack' }],
  care: ['Hand wash cold.'],
};

export const products: Product[] = [meridian, ridgeline, transit, cordCap];
export const heroProduct = meridian;

/* -------------------------------------------------------------- journal --- */

export const journalPosts: JournalPost[] = [
  {
    id: 'jp-01', slug: 'the-second-life-of-a-jacket',
    title: 'The second life of a jacket',
    excerpt: 'Every outer layer spends most of its day not being worn. We designed for that half.',
    body: 'A jacket is carried more often than it is worn. On a long transit day the shell comes off at security, goes back on at the gate, comes off on the aircraft, and spends four hours compressed under a seat. None of that is the part most outerwear is designed for.\n\nThe Meridian started from the carried state and worked backwards. The hood lining is oversized because it has to become a cavity. The internal webbing is bar-tacked to the yoke because it has to take a shoulder load. The collar inverts because a jacket that folds into itself never needs a stuff sack — and a stuff sack is a thing you lose.\n\nWhat we ended up with is a shell that behaves like equipment in both states, rather than a garment in one and luggage in the other.',
    category: 'Product Innovation', heroImage: '/media/field-ridgeline.webp',
    readingMinutes: 4, publishedAt: '2026-03-18T08:00:00.000Z', author: 'VAYRO Studio',
  },
  {
    id: 'jp-02', slug: 'twenty-denier',
    title: 'Twenty denier',
    excerpt: 'What the number on a spec sheet actually tells you about a fabric.',
    body: 'Denier measures the linear mass of a yarn: grams per 9,000 metres. A 20D yarn is fine. A 400D yarn is not. It is the single most quoted number in technical apparel and the most misread.\n\nDenier says nothing about strength on its own. A 20D ripstop with a reinforcing grid every 5 mm resists tearing better than a 40D plain weave, because a tear has to cross a thicker yarn to propagate. Weave density, yarn type and finish all matter more than the headline figure.\n\nWe use 20D on the Meridian shell because we wanted the pack volume down and the hand soft, and because the ripstop grid does the work the denier number implies.',
    category: 'Material Science', heroImage: '/media/material-ripstop.webp',
    readingMinutes: 3, publishedAt: '2026-03-25T08:00:00.000Z', author: 'VAYRO Studio',
  },
  {
    id: 'jp-03', slug: 'one-bag-eleven-days',
    title: 'One bag, eleven days',
    excerpt: 'A packing list for a trip that crosses three climates and two dress codes.',
    body: 'Eleven days, three climates, one 40-litre bag. The constraint is not weight — it is decisions. Every piece has to work in at least two of the three environments, or it does not come.\n\nThe list: one shell, one mid layer, two technical tees, one merino long sleeve, one pair of trousers that reads as smart, one pair that does not care, five days of socks and underwear on a three-day wash cycle.\n\nThe shell is the only item that has to work in all three, which is why it is the one piece worth spending on.',
    category: 'Travel', heroImage: '/media/field-highpass.webp',
    readingMinutes: 5, publishedAt: '2026-04-02T08:00:00.000Z', author: 'VAYRO Studio',
  },
  {
    id: 'jp-04', slug: 'quiet-hardware',
    title: 'Quiet hardware',
    excerpt: 'Why our zip pulls are anodised alloy and not moulded plastic.',
    body: 'Hardware is where cost-cutting shows first. A moulded pull costs almost nothing and fails in three ways: it whitens at the stress point, it rattles against the slider, and it reads as cheap the moment you touch it.\n\nAnodised alloy costs more and does none of those. It has thermal mass, so it feels like an object. It takes a laser mark cleanly, which is how the symbol gets onto it. And it is quiet, which matters more than it sounds — a jacket that clicks with every step is a jacket you stop wearing.',
    category: 'Product Innovation', heroImage: '/media/material-shell.webp',
    readingMinutes: 3, publishedAt: '2026-04-11T08:00:00.000Z', author: 'VAYRO Studio',
  },
  {
    id: 'jp-05', slug: 'the-case-against-waterproof',
    title: 'The case against waterproof',
    excerpt: 'We do not call the Meridian waterproof. Here is the honest reason.',
    body: 'Waterproof is a specific claim with a specific test behind it: hydrostatic head, measured in millimetres of water column, plus fully taped seams and a rating for the whole garment rather than the fabric.\n\nThe Meridian has taped seams and a 10k/10k membrane, which would let us use the word. We do not, because the front zip is not a waterproof zip, and a garment is only as waterproof as its least waterproof opening. Calling it weather resistant is the accurate description: it handles wind and passing rain, and it is not what you want in sustained heavy rainfall.\n\nOverclaiming is easy and it costs you the second purchase.',
    category: 'Material Science', heroImage: '/media/field-coastal.webp',
    readingMinutes: 4, publishedAt: '2026-04-19T08:00:00.000Z', author: 'VAYRO Studio',
  },
  {
    id: 'jp-06', slug: 'shoulder-seasons',
    title: 'Shoulder seasons',
    excerpt: 'The two windows in the year when a single layer is genuinely enough.',
    body: 'Late March to mid-May, and mid-September to early November. In most temperate latitudes those are the windows where a shell over a mid layer covers the entire day — cold start, warm middle, cold end — without carrying anything else.\n\nThey are also the best windows to travel in: fewer people, lower prices, and light that photographs well for longer either side of noon.\n\nThe system we build for is exactly this: one shell, one mid, and the ability to carry both when neither is needed.',
    category: 'Outdoor Culture', heroImage: '/media/field-dusk.webp',
    readingMinutes: 3, publishedAt: '2026-04-28T08:00:00.000Z', author: 'VAYRO Studio',
  },
];

/* --------------------------------------------------------------- reviews --- */
/** Clearly flagged demo content. Never presented as real customer feedback. */
export const demoReviews: Review[] = [
  { id: 'rv-1', productId: 'prd-meridian-shell', userId: null, authorName: 'Demo review', rating: 5,
    title: 'Packs smaller than expected', body: 'Sample content included with the demo dataset so review layouts can be evaluated. Replace before launch.',
    verifiedPurchase: false, createdAt: '2026-04-04T10:00:00.000Z', isDemo: true },
  { id: 'rv-2', productId: 'prd-meridian-shell', userId: null, authorName: 'Demo review', rating: 4,
    title: 'Runs slightly long', body: 'Sample content included with the demo dataset so review layouts can be evaluated. Replace before launch.',
    verifiedPurchase: false, createdAt: '2026-04-09T10:00:00.000Z', isDemo: true },
];
