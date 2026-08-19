import { cn } from '@/lib/utils';

type Props = {
  children: React.ReactNode;
  tone?: 'default' | 'inverse' | 'outline' | 'accent' | 'muted' | 'warning';
  className?: string;
};

export function Badge({ children, tone = 'outline', className }: Props) {
  return (
    <span
      className={cn(
        't-label-sm inline-flex items-center px-2 py-1 leading-none',
        tone === 'default' && 'bg-[var(--fg)] text-[var(--bg)]',
        tone === 'inverse' && 'bg-[var(--bg)] text-[var(--fg)]',
        tone === 'outline' && 'border border-[var(--border-strong)] text-[var(--fg-muted)]',
        tone === 'accent' && 'bg-[var(--accent)] text-[var(--accent-fg)]',
        tone === 'muted' && 'bg-[color-mix(in_oklab,var(--fg)_8%,transparent)] text-[var(--fg-muted)]',
        tone === 'warning' && 'border border-[var(--warning)] text-[var(--warning)]',
        className,
      )}
    >
      {children}
    </span>
  );
}
