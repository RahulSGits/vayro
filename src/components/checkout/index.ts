/**
 * VAYRO checkout — one import surface.
 *
 *   import { CheckoutFlow, OrderSummary } from '@/components/checkout';
 *
 * The flow owns its own state; everything else here is composable and safe to
 * reuse (the cart page renders `TrustRow` and `DiscountField` directly).
 */

/* flow ------------------------------------------------------------------- */
export { CheckoutFlow, CheckoutSkeleton } from './CheckoutFlow';
export { ConfirmationView, ConfirmationSkeleton } from './ConfirmationView';

/* steps ------------------------------------------------------------------ */
export { InformationStep } from './InformationStep';
export type { InformationStepProps } from './InformationStep';
export { ShippingStep } from './ShippingStep';
export type { ShippingStepProps } from './ShippingStep';
export { PaymentStep } from './PaymentStep';
export type {
  PaymentStepProps,
  PaymentHandle,
  PaymentMode,
  PaymentStatus,
  PaymentConfirmation,
} from './PaymentStep';
export { ReviewStep } from './ReviewStep';
export type { ReviewStepProps } from './ReviewStep';

/* chrome ----------------------------------------------------------------- */
export { StepRail, CHECKOUT_STEPS } from './StepRail';
export type { StepRailProps, CheckoutStepId } from './StepRail';
export { StepHeading, StepActions, StepPanel, FieldRow } from './StepShell';
export { OrderSummary } from './OrderSummary';
export type { OrderSummaryProps } from './OrderSummary';
export { DiscountField } from './DiscountField';
export type { DiscountFieldProps } from './DiscountField';
export { TrustRow } from './TrustRow';
export type { TrustRowProps } from './TrustRow';

/* contract --------------------------------------------------------------- */
export {
  COUNTRIES,
  DEFAULT_COUNTRY,
  DESPATCH_DAYS,
  SHIPPING_METHODS,
  addressLines,
  addressSchema,
  checkoutTotals,
  countryFor,
  emptyAddress,
  emptyInformation,
  estimateDelivery,
  fieldErrors,
  informationSchema,
  methodFor,
  methodsFor,
  shippingCost,
  taxIsIncluded,
  validate,
} from './schema';
export type {
  AddressValues,
  CheckoutTotals,
  Country,
  InformationValues,
  ShippingMethod,
  ShippingMethodId,
} from './schema';

export {
  buildLocalOrder,
  buildOrderPayload,
  clearDraft,
  createPaymentIntent,
  deliveryFor,
  fetchOrder,
  methodLabel,
  readDraft,
  readStashedOrder,
  saveDraft,
  stashOrder,
  submitOrder,
  toOrderItems,
  toPayloadItems,
} from './order';
export type { CheckoutDraft, OrderPayload, StoredOrder, IntentResult, SubmitResult } from './order';

export { getStripe, buildAppearance } from './stripe';
