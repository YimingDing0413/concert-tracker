import { buttonVariants } from '@/components/ui/button';
import { FeedPostShell } from '@/components/cards/FeedPostShell';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/types';
import { formatDate, formatOverallRating } from '@/utils/format';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ReviewPostCardProps {
  post: FeedPost;
  isOwnPost?: boolean;
}

export function ReviewPostCard({ post, isOwnPost }: ReviewPostCardProps) {
  const handle = post.username ? `@${post.username}` : post.userDisplayName ?? 'Someone';

  return (
    <FeedPostShell
      post={post}
      sentence={
        <>
          <span className="font-semibold text-foreground">{handle}</span> reviewed{' '}
          <span className="font-medium">{post.artistName ?? 'a show'}</span>
        </>
      }
      actions={
        <>
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
              Wrap-up
            </Link>
          )}
        </>
      }
    >
      {post.rating != null && (
        <p className="font-display text-3xl font-bold tabular-nums text-review-gold">
          {formatOverallRating(post.rating)}
        </p>
      )}

      {post.photoDataUrls && post.photoDataUrls.length > 0 && (
        <div
          className={
            post.photoDataUrls.length === 1
              ? 'overflow-hidden rounded-xl'
              : 'grid grid-cols-2 gap-1.5'
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

      {post.caption && (
        <p className="text-sm leading-relaxed text-foreground/90">{post.caption}</p>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-review-soft px-2.5 py-0.5 text-xs font-medium text-review-gold"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {(post.venueName || post.eventDate) && !post.imageUrl && (
        <p className="text-xs text-muted-foreground">
          {[post.venueName, post.eventDate ? formatDate(post.eventDate) : ''].filter(Boolean).join(' · ')}
        </p>
      )}
    </FeedPostShell>
  );
}
