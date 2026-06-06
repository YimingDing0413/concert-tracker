import { FilterChip } from '@/components/ui/FilterChip';
import type { FeedFilter } from '@/types';

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'following', label: 'Following' },
  { id: 'looking_for_tickets', label: 'Looking for tickets' },
  { id: 'reviews', label: 'Reviews' },
];

interface FeedFilterTabsProps {
  filter: FeedFilter;
  onFilterChange: (filter: FeedFilter) => void;
  showFollowing?: boolean;
}

export function FeedFilterTabs({
  filter,
  onFilterChange,
  showFollowing = true,
}: FeedFilterTabsProps) {
  const tabs = showFollowing
    ? FILTERS
    : FILTERS.filter((f) => f.id !== 'following');

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => (
        <FilterChip
          key={tab.id}
          active={filter === tab.id}
          onClick={() => onFilterChange(tab.id)}
        >
          {tab.label}
        </FilterChip>
      ))}
    </div>
  );
}
