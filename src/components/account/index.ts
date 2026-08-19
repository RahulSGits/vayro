/**
 * Account surface. `OrderStatusTimeline` and `OrderStatusChip` are shared with
 * the admin order views — they are pure render components with no client
 * boundary, so they mount anywhere.
 *
 *   import { OrderStatusTimeline } from '@/components/account';
 */

export {
  OrderStatusTimeline,
  OrderStatusChip,
  ORDER_STATUS_LABEL,
  orderStatusColor,
} from './OrderStatusTimeline';
export type { OrderStatusTimelineProps } from './OrderStatusTimeline';

export { OrderSummary } from './OrderSummary';
export { AccountNav, ACCOUNT_NAV } from './AccountNav';
export type { AccountNavItem } from './AccountNav';
export { SignOutButton } from './SignOutButton';
export { CopyValue } from './CopyValue';
export {
  PageHeading,
  Panel,
  DefinitionRow,
  DemoDataBanner,
  StatusNote,
  StatFigure,
} from './AccountShell';

/* screens ----------------------------------------------------------------- */
export { ProfileForm } from './ProfileForm';
export { AddressBook } from './AddressBook';
export { PreferencesForm } from './PreferencesForm';
export { PasswordChangeForm } from './PasswordChangeForm';
export { ThemeControl } from './ThemeControl';
export { WishlistGrid } from './WishlistGrid';
export { WishlistSummary } from './WishlistSummary';
