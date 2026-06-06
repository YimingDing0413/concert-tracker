import { Button } from '@/components/ui/app-button';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FeedEventPreview } from '@/components/feed/FeedEventPreview';
import { FeedPostHeader } from '@/components/feed/FeedPostHeader';
import type { FeedPost } from '@/types';
import { MessageCircle, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LookingForTicketsPostCardProps {
  post: FeedPost;
  onHaveTickets: () => void;
  isOwnPost?: boolean;
}

export function LookingForTicketsPostCard({
  post,
  onHaveTickets,
  isOwnPost,
}: LookingForTicketsPostCardProps) {
  const handle = post.username ? `@${post.username}` : post.userDisplayName ?? 'Someone';

  return (
    <article className="space-y-4 rounded-2xl border border-border/40 bg-card/50 p-4">
      <FeedPostHeader post={post} />

      <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm">
        <Ticket className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
        <p>
          <span className="font-semibold">{handle}</span> is looking for tickets
        </p>
      </div>

      <FeedEventPreview post={post} />

      {(post.ticketQuantity != null || post.maxBudget || post.ticketNote) && (
        <dl className="grid gap-1.5 text-sm text-muted-foreground">
          {post.ticketQuantity != null && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">Qty</dt>
              <dd>{post.ticketQuantity}</dd>
            </div>
          )}
          {post.maxBudget && (
            <div className="flex gap-2">
              <dt className="font-medium text-foreground">Budget</dt>
              <dd>{post.maxBudget}</dd>
            </div>
          )}
          {post.ticketNote && (
            <div>
              <dt className="sr-only">Note</dt>
              <dd className="text-foreground/90">{post.ticketNote}</dd>
            </div>
          )}
        </dl>
      )}

      <p className="text-xs text-muted-foreground">
        Encore does not verify ticket sellers or process payments.
      </p>

      <div className="flex flex-wrap gap-2">
        {!isOwnPost && (
          <Button variant="primary" size="sm" onClick={onHaveTickets}>
            <MessageCircle className="size-4" aria-hidden />
            Message
          </Button>
        )}
        {isOwnPost && (
          <p className="text-xs text-muted-foreground">Your post — others can message you from their feed.</p>
        )}
        {post.eventId && (
          <Link
            to={`/concert/${post.eventId}`}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
          >
            View concert
          </Link>
        )}
      </div>
    </article>
  );
}
