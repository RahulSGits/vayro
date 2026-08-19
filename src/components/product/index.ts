/**
 * Product surface — one import for the collection grid and the PDP.
 *
 *   import { ProductCard } from '@/components/product';
 */

export { ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';
export { ProductGrid, ProductGridSkeleton } from './ProductGrid';
export { WishlistButton } from './WishlistButton';
export { RelatedProducts } from './RelatedProducts';

/* collection listing ------------------------------------------------------ */
export { ActiveFilters } from './ActiveFilters';
export { ShopFilterPanel } from './ShopFilterPanel';
export type { Facets } from './ShopFilterPanel';
export { ShopFilterDrawer } from './ShopFilterDrawer';
export {
  SORTS,
  activeFilterCount,
  buildHref,
  clearedHref,
  parseShopParams,
  priceBands,
  stateKey,
  toRepoFilters,
} from './shop-params';
export type { ShopState, ShopSearchParams, SortValue, PriceBand } from './shop-params';

/* product detail ---------------------------------------------------------- */
export { ProductProvider, useProductState } from './ProductProvider';
export { ProductGallery } from './ProductGallery';
export { ProductPurchase } from './ProductPurchase';
export { MobileBuyBar } from './MobileBuyBar';
export { SizeGuideDialog } from './SizeGuideDialog';
export { SpecTable } from './SpecTable';
export { HotspotFigure } from './HotspotFigure';
export { ProductReviews } from './ProductReviews';
export { ProductViewTracker } from './ProductViewTracker';

/* derivation -------------------------------------------------------------- */
export {
  SIZE_CHART,
  SPEC_GROUP_LABEL,
  SPEC_GROUP_ORDER,
  cardImages,
  colorwaysOf,
  defaultColorway,
  defaultSize,
  findVariant,
  galleryImages,
  groupedSpecs,
  hasSizeChart,
  inStock,
  sizeRowsFor,
  specValue,
  unitsAvailable,
  variantsFor,
} from './product-utils';
export type { Colorway, SizeRow } from './product-utils';
