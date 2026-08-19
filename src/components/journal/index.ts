/**
 * VAYRO journal — one import surface for the editorial layer.
 *
 *   import { ArticleCard, ArticleBody } from '@/components/journal';
 */

export { ArticleCard } from './ArticleCard';
export type { ArticleCardProps, ArticleCardVariant } from './ArticleCard';

export { ArticleBody, paragraphsOf, pullQuoteFrom } from './ArticleBody';
export type { ArticleBodyProps, ArticleFigure } from './ArticleBody';

export { CategoryFilter, categoriesOf } from './CategoryFilter';
export type { CategoryFilterProps, JournalCategory } from './CategoryFilter';

export { ShareRow } from './ShareRow';
export type { ShareRowProps } from './ShareRow';
