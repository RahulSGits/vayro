import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

export default function ARNotFound() {
  return (
    <div className="shell section">
      <EmptyState
        title="Nothing to place here"
        body="That code points at a piece we no longer list, or the address is wrong. The current range is a short list — the piece you scanned is probably still on it."
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/shop">Shop everything</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              Back to VAYRO
            </ButtonLink>
          </div>
        }
        className="border border-[var(--border)] py-28"
      />
    </div>
  );
}
