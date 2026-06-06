import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';

interface EmptyFeedStateProps {
  filter?: string;
}

export function EmptyFeedState({ filter }: EmptyFeedStateProps) {
  const isFiltered = filter && filter !== 'all';

  return (
    <EmptyState
      title={isFiltered ? 'No posts in this filter' : 'Your feed is quiet'}
      description={
        isFiltered
          ? 'Try another filter or be the first to post.'
          : 'Follow friends or create a post to get the feed going.'
      }
      action={
        <Link to="/create" className="text-sm font-medium text-primary">
          Create a post →
        </Link>
      }
    />
  );
}
