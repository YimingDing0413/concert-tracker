import { OVERALL_VIBE_LABELS } from '@/types/concertReview';
import type { ConcertReview } from '@/types/concertReview';
import { formatDate } from '@/utils/format';
import { ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileReviewListItemProps {
  review: ConcertReview;
}

export function ProfileReviewListItem({ review }: ProfileReviewListItemProps) {
  const subtitle = [review.venueName, review.eventDate ? formatDate(review.eventDate) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/40 bg-card/50 transition-colors hover:border-primary/25">
      <Link
        to={`/concert/${review.eventId}`}
        className="flex flex-1 items-start gap-4 p-4 no-underline"
      >
        {review.photoDataUrls?.[0] ? (
          <img
            src={review.photoDataUrls[0]}
            alt=""
            className="size-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-fuchsia-900/30 text-2xl font-black text-white/90">
            {review.overallRating}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{review.artistName}</h3>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          <p className="mt-1 text-xs font-medium text-primary">
            {OVERALL_VIBE_LABELS[review.overallRating]} · {review.overallRating}/10
          </p>
          {review.tags && review.tags.length > 0 && (
            <p className="mt-1 truncate text-xs capitalize text-muted-foreground">
              {review.tags.slice(0, 3).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-2xl font-black tabular-nums text-foreground">
            {review.overallRating}
          </span>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
      </Link>
      <div className="flex border-t border-border/40">
        <Link
          to={`/concert/${review.eventId}/review`}
          className="flex-1 py-2.5 text-center text-xs font-semibold text-muted-foreground no-underline hover:bg-muted/30 hover:text-primary"
        >
          Edit review
        </Link>
        <Link
          to={`/concert/${review.eventId}/wrap-up`}
          className="flex flex-1 items-center justify-center gap-1 border-l border-border/40 py-2.5 text-center text-xs font-semibold text-muted-foreground no-underline hover:bg-muted/30 hover:text-primary"
        >
          <Sparkles className="size-3.5" />
          Wrap-up
        </Link>
      </div>
    </article>
  );
}
