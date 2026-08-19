import Image from 'next/image';
import { cn } from '@/lib/utils';

/* ==========================================================================
   ArticleBody — typesetting for the journal.

   Entries are stored as plain text with blank-line paragraph breaks, so this
   module owns every editorial decision the copy cannot express itself: the
   measure, the lead paragraph, where a plate lands, and where the lift-out
   quote sits. Nothing here rewrites the author's words — the pull quote is a
   verbatim sentence lifted from the body, which is what a pull quote is.
   ========================================================================== */

export type ArticleFigure = {
  src: string;
  alt: string;
  caption: string;
};

/** Splits the stored body on blank lines. Whitespace-only paragraphs are dropped. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * Lifts a verbatim sentence from the body to set as a pull quote.
 *
 * The opening paragraph is skipped — it is already set as the lead, and
 * repeating it immediately reads as a mistake. Of what remains, the shortest
 * sentence that still carries an argument wins: display type punishes length,
 * and a quote that wraps four times has stopped being a quote.
 */
export function pullQuoteFrom(body: string): string | null {
  const paragraphs = paragraphsOf(body);
  const source = (paragraphs.length > 1 ? paragraphs.slice(1) : paragraphs).join(' ');
  const sentences = source.match(/[^.?!]+[.?!]+/g) ?? [];

  const candidates = sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 45 && sentence.length <= 150);

  if (candidates.length === 0) return null;
  return candidates.reduce((best, sentence) => (sentence.length < best.length ? sentence : best));
}

type Block =
  | { kind: 'lead' | 'para'; key: string; text: string }
  | { kind: 'quote'; key: string; text: string }
  | { kind: 'figure'; key: string; figure: ArticleFigure };

export type ArticleBodyProps = {
  /** Plain text. Paragraphs separated by blank lines. */
  body: string;
  /** Optional plate, set between the opening paragraph and the one after it. */
  figure?: ArticleFigure | null;
  /** Verbatim sentence lifted from the body. Pass `null` to suppress. */
  pullQuote?: string | null;
  className?: string;
};

export function ArticleBody({ body, figure, pullQuote, className }: ArticleBodyProps) {
  const paragraphs = paragraphsOf(body);
  if (paragraphs.length === 0) return null;

  // The plate follows the opening paragraph; the lift-out sits a beat later,
  // never against the closing line, where it would compete with the sign-off.
  const figureAfter = 0;
  const quoteAfter = paragraphs.length >= 3 ? paragraphs.length - 2 : -1;

  const blocks: Block[] = [];
  paragraphs.forEach((text, index) => {
    blocks.push({ kind: index === 0 ? 'lead' : 'para', key: `p-${index}`, text });
    if (figure && index === figureAfter) blocks.push({ kind: 'figure', key: `f-${index}`, figure });
    if (pullQuote && index === quoteAfter) blocks.push({ kind: 'quote', key: `q-${index}`, text: pullQuote });
  });

  return (
    <div className={cn('flex flex-col gap-7', className)}>
      {blocks.map((block) => {
        if (block.kind === 'figure') {
          return (
            <figure key={block.key} className="my-7 w-full">
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-[var(--bg-sunken)]">
                <Image
                  src={block.figure.src}
                  alt={block.figure.alt}
                  fill
                  sizes="(min-width: 1024px) 62vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="t-caption mx-auto mt-4 flex w-full max-w-[var(--max-text)] items-start gap-3 text-[var(--fg-subtle)]">
                <span aria-hidden className="mt-2 block h-px w-5 shrink-0 bg-[var(--border-strong)]" />
                <span className="t-pretty">{block.figure.caption}</span>
              </figcaption>
            </figure>
          );
        }

        if (block.kind === 'quote') {
          return (
            <figure
              key={block.key}
              className="mx-auto my-7 w-full max-w-[var(--max-text)] border-y border-[var(--border)] py-10"
            >
              <blockquote>
                <p className="t-h2 t-balance text-[var(--fg)]">{block.text}</p>
              </blockquote>
            </figure>
          );
        }

        return (
          <p
            key={block.key}
            className={cn(
              't-pretty mx-auto w-full max-w-[var(--max-text)]',
              block.kind === 'lead' ? 't-body-lg text-[var(--fg)]' : 'text-[var(--fg-muted)]',
            )}
          >
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
