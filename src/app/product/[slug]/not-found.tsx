import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export default function ProductNotFound() {
  return (
    <div className="shell section">
      <EmptyState
        title="That piece is no longer listed"
        body="It may have been retired, or the address may be wrong. The current range is a short list — it will not take long to find what you were after."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/shop">Shop everything</ButtonLink>
            <ButtonLink href="/collections" variant="secondary">
              Browse collections
            </ButtonLink>
          </div>
        }
        className="border border-[var(--border)] py-28"
      />
    </div>
  );
}
