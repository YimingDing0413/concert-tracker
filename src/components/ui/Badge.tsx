import type { SearchResultType } from '@/types';

const labels: Record<SearchResultType, string> = {
  artist: 'Artist',
  venue: 'Venue',
  event: 'Event',
};

interface BadgeProps {
  type: SearchResultType | 'going' | 'attended' | 'saved' | 'predicted' | 'actual';
  className?: string;
}

export function Badge({ type, className = '' }: BadgeProps) {
  const label =
    type in labels ? labels[type as SearchResultType] : type.charAt(0).toUpperCase() + type.slice(1);
  return <span className={`badge badge-${type} ${className}`.trim()}>{label}</span>;
}
