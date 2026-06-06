import { ConcertPostCard } from '@/components/feed/ConcertPostCard';
import { LookingForTicketsPostCard } from '@/components/feed/LookingForTicketsPostCard';
import { ReviewFeedPostCard } from '@/components/feed/ReviewFeedPostCard';
import type { FeedPost } from '@/types';

interface FeedPostCardProps {
  post: FeedPost;
  currentUserId?: string;
  onHaveTickets: () => void;
}

export function FeedPostCard({ post, currentUserId, onHaveTickets }: FeedPostCardProps) {
  const isOwnPost = Boolean(currentUserId && post.userId === currentUserId);

  switch (post.type) {
    case 'looking_for_tickets':
      return (
        <LookingForTicketsPostCard
          post={post}
          onHaveTickets={onHaveTickets}
          isOwnPost={isOwnPost}
        />
      );
    case 'review':
      return <ReviewFeedPostCard post={post} isOwnPost={isOwnPost} />;
    case 'concert_post':
    default:
      return <ConcertPostCard post={post} />;
  }
}
