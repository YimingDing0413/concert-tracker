import { RatingStars } from '@/components/ui/RatingStars';
import { BREAKDOWN_LABELS, OVERALL_VIBE_LABELS } from '@/types/concertReview';
import type { ConcertReview } from '@/types/concertReview';
import { formatDate } from '@/utils/format';
import { Sparkles } from 'lucide-react';

interface ConcertReviewCardProps {
  review: ConcertReview;
  compact?: boolean;
}

export function ConcertReviewCard({ review, compact }: ConcertReviewCardProps) {
  const breakdown = BREAKDOWN_LABELS.filter(
    ({ key }) => review[key] != null && review[key]! > 0
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/15 via-card to-card shadow-xl">
      <div className="border-b border-border/40 bg-gradient-to-r from-primary/20 to-transparent px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Your review
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">{review.artistName}</h3>
            {(review.venueName || review.eventDate) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {[review.venueName, review.eventDate ? formatDate(review.eventDate) : '']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black tabular-nums text-foreground">
              {review.overallRating}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 10</span>
          </div>
        </div>
        <p className="mt-2 text-sm font-medium text-primary">
          {OVERALL_VIBE_LABELS[review.overallRating]}
        </p>
      </div>

      <div className="space-y-4 p-5">
        {!compact && breakdown.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {breakdown.map(({ key, label, emoji }) => (
              <div
                key={key}
                className="rounded-xl border border-border/40 bg-background/40 px-3 py-2"
              >
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {emoji} {label}
                </p>
                <RatingStars value={review[key] as number} readonly max={5} />
              </div>
            ))}
          </div>
        )}

        {review.tags && review.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium capitalize text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {(review.favoriteSong || review.bestMoment) && (
          <div className="space-y-2 text-sm">
            {review.favoriteSong && (
              <p>
                <span className="text-muted-foreground">Favorite song: </span>
                <span className="font-medium">{review.favoriteSong}</span>
              </p>
            )}
            {review.bestMoment && (
              <p>
                <span className="text-muted-foreground">Best moment: </span>
                <span className="font-medium">{review.bestMoment}</span>
              </p>
            )}
          </div>
        )}

        {review.wouldSeeAgain != null && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3.5" />
            {review.wouldSeeAgain ? 'Would see again' : 'Probably skip next time'}
          </p>
        )}

        {review.reviewText && (
          <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{review.reviewText}&rdquo;</p>
        )}

        {review.photoDataUrls && review.photoDataUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {review.photoDataUrls.slice(0, compact ? 3 : 6).map((url, i) => (
              <img
                key={`${i}-${url.slice(0, 20)}`}
                src={url}
                alt=""
                className="aspect-square rounded-xl object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
