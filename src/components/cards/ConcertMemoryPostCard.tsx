import { buttonVariants } from '@/components/ui/button';
import { FeedPostShell } from '@/components/cards/FeedPostShell';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/types';
import { Link } from 'react-router-dom';

interface ConcertMemoryPostCardProps {
  post: FeedPost;
}

export function ConcertMemoryPostCard({ post }: ConcertMemoryPostCardProps) {
  const handle = post.username ? `@${post.username}` : post.userDisplayName ?? 'Someone';

  return (
    <FeedPostShell
      post={post}
      sentence={
        <>
          <span className="font-semibold text-foreground">{handle}</span> shared a concert moment
        </>
      }
      actions={
        post.eventId ? (
          <Link
            to={`/concert/${post.eventId}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
          >
            View concert
          </Link>
        ) : undefined
      }
    >
      {post.photoDataUrls && post.photoDataUrls.length > 0 && (
        <div
          className={
            post.photoDataUrls.length === 1
              ? 'overflow-hidden rounded-2xl'
              : 'grid grid-cols-2 gap-1'
          }
        >
          {post.photoDataUrls.map((url, i) => (
            <img
              key={`${url.slice(0, 24)}-${i}`}
              src={url}
              alt=""
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      )}

      {post.caption && (
        <p className="text-sm leading-relaxed text-foreground/90">{post.caption}</p>
      )}

      {post.artistName && (
        <p className="font-display text-sm font-semibold text-foreground">{post.artistName}</p>
      )}
    </FeedPostShell>
  );
}
