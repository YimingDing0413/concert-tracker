import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  label?: string;
  className?: string;
}

export function LoadingSpinner({ label = 'Loading…', className }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center gap-3 py-8', className)} role="status">
      <div className="flex gap-1.5">
        <Skeleton className="size-2.5 rounded-full" />
        <Skeleton className="size-2.5 rounded-full [animation-delay:120ms]" />
        <Skeleton className="size-2.5 rounded-full [animation-delay:240ms]" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
