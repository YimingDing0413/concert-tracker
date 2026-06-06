import { ConcertPostCard } from '@/components/feed/ConcertPostCard';
import { LookingForTicketsPostCard } from '@/components/feed/LookingForTicketsPostCard';
import { ReviewFeedPostCard } from '@/components/feed/ReviewFeedPostCard';
import type { FeedPost } from '@/types';

interface FeedPostCardProps {
  post: FeedPost;
  /** Logged-in viewer — used to hide "Message" on your own posts. */
  viewerUserId?: string;
  onHaveTickets: () => void;
}

export function FeedPostCard({ post, viewerUserId, onHaveTickets }: FeedPostCardProps) {
  const isOwnPost = Boolean(viewerUserId && post.userId === viewerUserId);

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
