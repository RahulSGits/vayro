'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const button = cva(
  [
    'relative inline-flex items-center justify-center gap-2 select-none',
    'font-medium uppercase whitespace-nowrap',
    'transition-[background-color,color,border-color,opacity,transform]',
    'duration-[var(--d-fast)] ease-[var(--e-out)]',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.985]',
  ].join(' '),
  {
    variants: {
      variant: {
        primary:  'bg-[var(--fg)] text-[var(--bg)] hover:bg-[var(--graphite)]',
        secondary:'border border-[var(--border-strong)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)] hover:border-[var(--fg)]',
        ghost:    'text-[var(--fg)] hover:bg-[color-mix(in_oklab,var(--fg)_8%,transparent)]',
        quiet:    'text-[var(--fg-muted)] hover:text-[var(--fg)]',
        accent:   'bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90',
        danger:   'bg-[var(--danger)] text-white hover:opacity-90',
        link:     'text-[var(--fg)] underline underline-offset-[6px] decoration-[var(--border-strong)] hover:decoration-[var(--fg)] normal-case tracking-normal',
      },
      size: {
        xs: 'h-8  px-3   text-[0.625rem] tracking-[0.2em]',
        sm: 'h-10 px-4   text-[0.6875rem] tracking-[0.2em]',
        md: 'h-12 px-6   text-[0.6875rem] tracking-[0.22em]',
        lg: 'h-14 px-8   text-[0.75rem] tracking-[0.22em]',
        icon: 'h-10 w-10 p-0',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

type BaseProps = VariantProps<typeof button> & { className?: string };

export type ButtonProps = BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

export type ButtonLinkProps = BaseProps &
  Omit<React.ComponentProps<typeof Link>, 'className'> & { href: string };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(button({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = 'Button';

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return <Link className={cn(button({ variant, size, block }), className)} {...props} />;
}

export { button as buttonStyles };
