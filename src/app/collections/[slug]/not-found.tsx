import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export default function CollectionNotFound() {
  return (
    <div className="shell section">
      <EmptyState
        title="That collection does not exist"
        body="It may have been renamed or retired. The four current routes into the range are all here."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/collections">All collections</ButtonLink>
            <ButtonLink href="/shop" variant="secondary">
              Shop everything
            </ButtonLink>
          </div>
        }
        className="border border-[var(--border)] py-28"
      />
    </div>
  );
}
