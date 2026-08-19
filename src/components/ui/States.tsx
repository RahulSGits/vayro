import { cn } from '@/lib/utils';
import { VayroMark } from '@/components/brand';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.6s_infinite]',
        'after:bg-gradient-to-r after:from-transparent after:via-[color-mix(in_oklab,var(--fg)_6%,transparent)] after:to-transparent',
        className,
      )}
    />
  );
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      role="status" aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[var(--fg)]', className)}
      style={{ width: size, height: size }}
    />
  );
}

export function EmptyState({
  title, body, action, icon = true, className,
}: { title: string; body?: string; action?: React.ReactNode; icon?: boolean; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)}>
      {icon ? <VayroMark size={30} className="mb-6 text-[var(--fg-subtle)]" /> : null}
      <h3 className="t-h3">{title}</h3>
      {body ? <p className="t-body-sm mt-2 max-w-sm text-[var(--fg-muted)]">{body}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong', body, action, className,
}: { title?: string; body?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-20 text-center', className)} role="alert">
      <span className="t-label-sm mb-4 text-[var(--danger)]">Error</span>
      <h3 className="t-h3">{title}</h3>
      {body ? <p className="t-body-sm mt-2 max-w-sm text-[var(--fg-muted)]">{body}</p> : null}
      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  );
}
