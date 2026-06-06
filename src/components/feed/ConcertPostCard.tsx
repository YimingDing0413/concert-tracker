import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FeedEventPreview } from '@/components/feed/FeedEventPreview';
import { FeedPostHeader } from '@/components/feed/FeedPostHeader';
import type { FeedPost } from '@/types';
import { Link } from 'react-router-dom';

interface ConcertPostCardProps {
  post: FeedPost;
}

export function ConcertPostCard({ post }: ConcertPostCardProps) {
  return (
    <article className="space-y-4 rounded-2xl border border-border/40 bg-card/50 p-4">
      <FeedPostHeader post={post} />

      {post.caption && (
        <p className="text-sm leading-relaxed text-foreground/90">{post.caption}</p>
      )}

      {post.photoDataUrls && post.photoDataUrls.length > 0 && (
        <div
          className={
            post.photoDataUrls.length === 1
              ? 'overflow-hidden rounded-xl'
              : 'grid grid-cols-2 gap-2'
          }
        >
          {post.photoDataUrls.map((url, i) => (
            <img
              key={`${url.slice(0, 24)}-${i}`}
              src={url}
              alt=""
              className="aspect-[4/5] w-full rounded-xl object-cover"
            />
          ))}
        </div>
      )}

      {(post.artistName || post.eventId) && <FeedEventPreview post={post} />}

      {post.eventId && (
        <Link
          to={`/concert/${post.eventId}`}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
        >
          View concert
        </Link>
      )}
    </article>
  );
}
