import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function ConcertCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative w-[11.75rem] shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card sm:w-[12.5rem]',
        className
      )}
    >
      <Skeleton className="h-[4.75rem] w-full rounded-none" />
      <div className="space-y-1.5 p-2.5">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function StatRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[4.5rem] rounded-xl" />
      ))}
    </div>
  );
}
