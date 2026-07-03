import { ConcertMemoryPostCard } from '@/components/cards/ConcertMemoryPostCard';
import { ReviewPostCard } from '@/components/cards/ReviewPostCard';
import { TicketPostCard } from '@/components/cards/TicketPostCard';
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
        <TicketPostCard post={post} onHaveTickets={onHaveTickets} isOwnPost={isOwnPost} />
      );
    case 'review':
      return <ReviewPostCard post={post} isOwnPost={isOwnPost} />;
    case 'concert_post':
    default:
      return <ConcertMemoryPostCard post={post} />;
  }
}
