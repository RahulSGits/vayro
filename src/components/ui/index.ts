/**
 * VAYRO UI primitives — one import surface.
 *
 *   import { Button, Drawer, useToast } from '@/components/ui';
 *
 * Every export below is part of the design system. If a screen needs a
 * behaviour that is not here, extend the primitive rather than re-implement it.
 */

/* form + action ---------------------------------------------------------- */
export { Button, ButtonLink, buttonStyles } from './Button';
export type { ButtonProps, ButtonLinkProps } from './Button';
export { Field, Input, Textarea, Select, Checkbox } from './Field';

/* display ---------------------------------------------------------------- */
export { Badge } from './Badge';
export { Skeleton, Spinner, EmptyState, ErrorState } from './States';

/* overlays --------------------------------------------------------------- */
export {
  Dialog,
  Overlay,
  Portal,
  CloseButton,
  useScrollLock,
  useFocusTrap,
  useEscapeKey,
} from './Dialog';
export type { DialogProps } from './Dialog';
export { Drawer } from './Drawer';
export type { DrawerProps, DrawerSide } from './Drawer';
export { ToastProvider, useToast } from './Toast';
export type { ToastOptions, ToastTone } from './Toast';

/* disclosure ------------------------------------------------------------- */
export { Accordion, AccordionItem } from './Accordion';
export type { AccordionProps, AccordionItemProps } from './Accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
export type { TabsProps } from './Tabs';

/* motion ----------------------------------------------------------------- */
export { Reveal, RevealChild, RevealText } from './Reveal';
export type { RevealProps, RevealTextProps, RevealVariant, RevealTag } from './Reveal';
export { CursorLayer } from './CursorLayer';
