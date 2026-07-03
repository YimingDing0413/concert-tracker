import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl bg-surface-2 px-6 py-12 text-center',
        className
      )}
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
        <Sparkles className="size-5" aria-hidden />
      </span>
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
