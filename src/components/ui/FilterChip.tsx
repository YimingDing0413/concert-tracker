import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function FilterChip({ active, className, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-8 shrink-0 items-center justify-center rounded-full border px-3.5 text-xs font-semibold transition-all',
        active
          ? 'border-primary/50 bg-primary text-primary-foreground shadow-[0_0_20px_-4px] shadow-primary/40'
          : 'border-border/70 bg-card/90 text-foreground backdrop-blur-md hover:border-primary/30 hover:bg-card',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
