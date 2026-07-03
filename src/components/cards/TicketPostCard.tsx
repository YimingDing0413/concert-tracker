import { Button } from '@/components/ui/app-button';
import { buttonVariants } from '@/components/ui/button';
import { FeedPostShell } from '@/components/cards/FeedPostShell';
import { cn } from '@/lib/utils';
import type { FeedPost } from '@/types';
import { formatDate } from '@/utils/format';
import { MessageCircle, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TicketPostCardProps {
  post: FeedPost;
  onHaveTickets: () => void;
  isOwnPost?: boolean;
}

export function TicketPostCard({ post, onHaveTickets, isOwnPost }: TicketPostCardProps) {
  const handle = post.username ? `@${post.username}` : post.userDisplayName ?? 'Someone';

  return (
    <FeedPostShell
      post={post}
      sentence={
        <>
          <span className="font-semibold text-foreground">{handle}</span>{' '}
          <span className="text-ticket">is looking for tickets</span>
        </>
      }
      actions={
        <>
          {!isOwnPost && (
            <Button variant="primary" size="sm" onClick={onHaveTickets}>
              <MessageCircle className="size-4" aria-hidden />
              Message
            </Button>
          )}
          {post.eventId && (
            <Link
              to={`/concert/${post.eventId}`}
              className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
            >
              View concert
            </Link>
          )}
        </>
      }
    >
      <div className="overflow-hidden rounded-xl bg-ticket-soft">
        <div className="flex gap-3 p-3">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt="" className="size-16 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[var(--encore-surface-3)]">
              <Ticket className="size-6 text-ticket" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-display font-semibold text-foreground">{post.artistName ?? 'Concert'}</p>
            {post.venueName && (
              <p className="text-xs text-muted-foreground">{post.venueName}</p>
            )}
            {post.eventDate && (
              <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(post.eventDate)}</p>
            )}
            {(post.ticketQuantity != null || post.maxBudget) && (
              <p className="mt-1.5 text-xs text-ticket">
                {post.ticketQuantity != null && `${post.ticketQuantity} ticket${post.ticketQuantity === 1 ? '' : 's'}`}
                {post.ticketQuantity != null && post.maxBudget && ' · '}
                {post.maxBudget && `Budget ${post.maxBudget}`}
              </p>
            )}
            {post.ticketNote && (
              <p className="mt-1 text-xs text-foreground/80">{post.ticketNote}</p>
            )}
          </div>
        </div>
      </div>
      <p className="text-[0.65rem] text-muted-foreground">
        Encore does not verify ticket sellers or process payments.
      </p>
    </FeedPostShell>
  );
}
