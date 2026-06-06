import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FeedEventPreview } from '@/components/feed/FeedEventPreview';
import { FeedPostHeader } from '@/components/feed/FeedPostHeader';
import type { FeedPost } from '@/types';
import { formatOverallRating } from '@/utils/format';
import { Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewFeedPostCardProps {
  post: FeedPost;
  isOwnPost?: boolean;
}

export function ReviewFeedPostCard({ post, isOwnPost }: ReviewFeedPostCardProps) {
  const handle = post.username ? `@${post.username}` : post.userDisplayName ?? 'Someone';

  return (
    <article className="space-y-4 rounded-2xl border border-border/40 bg-card/50 p-4">
      <FeedPostHeader post={post} />

      <div className="flex items-start gap-2 text-sm">
        <Star className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <p>
          <span className="font-semibold">{handle}</span> reviewed this concert
        </p>
      </div>

      {post.rating != null && (
        <p className="text-2xl font-bold tabular-nums text-amber-400">
          {formatOverallRating(post.rating)}
        </p>
      )}

      <FeedEventPreview post={post} />

      {post.caption && (
        <p className="text-sm leading-relaxed text-foreground/90">{post.caption}</p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/50 bg-muted/40 px-2.5 py-0.5 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
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

      <div className="flex flex-wrap gap-2">
        {post.eventId && (
          <Link
            to={`/concert/${post.eventId}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
          >
            View concert
          </Link>
        )}
        {isOwnPost && post.eventId && (
          <Link
            to={`/concert/${post.eventId}/wrap-up`}
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}
          >
            <Sparkles className="size-4" aria-hidden />
            Create wrap-up
          </Link>
        )}
      </div>
    </article>
  );
}
