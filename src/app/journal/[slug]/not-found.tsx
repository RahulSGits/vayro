import { ButtonLink, EmptyState } from '@/components/ui';

/**
 * Reached when a slug does not match a published entry — an old link, a typo,
 * or a draft that has not gone out yet. The copy says which of those it might
 * be rather than pretending the page never existed.
 */
export default function JournalEntryNotFound() {
  return (
    <div className="shell section">
      <EmptyState
        title="That entry is not here"
        body="The link may be old, or the note may not have been published yet. The full index is below."
        action={
          <div className="flex flex-wrap items-center justify-center gap-4">
            <ButtonLink href="/journal" size="md">
              All entries
            </ButtonLink>
            <ButtonLink href="/story" variant="secondary" size="md">
              Read the story
            </ButtonLink>
          </div>
        }
      />
    </div>
  );
}
