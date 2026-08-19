/**
 * VAYRO admin components — one import surface.
 *
 *   import { PageHeader, Panel, StatCard, AreaChart } from '@/components/admin';
 */

/* shell ------------------------------------------------------------------ */
export { AdminSidebar, AdminMobileBar, ADMIN_NAV } from './AdminNav';

/* chrome ----------------------------------------------------------------- */
export { PageHeader, Panel, DemoBanner, MetaList, StatStrip, SectionRule } from './Chrome';
export { StatCard } from './StatCard';
export { OrderStatusPill, ProductStatusPill, StockPill, Delta } from './StatusPill';

/* data display ----------------------------------------------------------- */
export {
  Table, TableScroller, THead, TH, TBody, TR, TD, RowLink, EmptyRow, Swatch,
} from './Table';
export { AreaChart, BarRows, ColumnChart, DonutChart, FunnelChart, Sparkline } from './Charts';
export type { Point } from './Charts';

/* list controls ---------------------------------------------------------- */
export { SearchField, FilterTabs, Pagination } from './Filters';
export type { FilterOption } from './Filters';

/* forms ------------------------------------------------------------------ */
export { ActionForm, ActionButtonForm, ActionMessage, FieldGrid, FormBar, SubmitButton } from './Form';
export type { ActionFn } from './Form';
export { ProductForm, ProductPrice } from './ProductForm';
export { OrderStatusControls, OrderFulfilmentForm } from './OrderPanels';
export { InventoryTable } from './InventoryTable';
export { JournalManager, FeaturedProducts } from './ContentPanels';
export {
  AnalyticsSettingsForm, BrandSettingsForm, EmailSettingsForm, HomepageForm,
  ShippingSettingsForm, TaxSettingsForm,
} from './SettingsForms';
export { DeleteProductForm } from './DangerZone';
