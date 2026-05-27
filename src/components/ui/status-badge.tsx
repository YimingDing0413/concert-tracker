import { Badge as ShadBadge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SearchResultType } from '@/types';

const labels: Record<SearchResultType, string> = {
  artist: 'Artist',
  venue: 'Venue',
  event: 'Event',
};

type StatusBadgeType =
  | SearchResultType
  | 'going'
  | 'attended'
  | 'saved'
  | 'predicted'
  | 'actual';

const variantMap: Record<
  StatusBadgeType,
  'default' | 'secondary' | 'outline' | 'destructive'
> = {
  artist: 'secondary',
  venue: 'outline',
  event: 'secondary',
  going: 'default',
  attended: 'secondary',
  saved: 'outline',
  predicted: 'outline',
  actual: 'secondary',
};

interface StatusBadgeProps {
  type: StatusBadgeType;
  className?: string;
}

export function StatusBadge({ type, className }: StatusBadgeProps) {
  const label =
    type in labels ? labels[type as SearchResultType] : type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <ShadBadge variant={variantMap[type]} className={cn('capitalize', className)}>
      {label}
    </ShadBadge>
  );
}

/** @deprecated Use StatusBadge — kept as Badge for existing imports */
export { StatusBadge as Badge };
