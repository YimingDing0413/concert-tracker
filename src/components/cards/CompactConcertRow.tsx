import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatTime } from '@/utils/format';
import { ArrowRight, Calendar } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  badgeFromUserConcertStatus,
  ConcertCardBadge,
  type ConcertCardBadgeType,
} from './ConcertCardBadge';

interface CompactConcertRowProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  badge?: ConcertCardBadgeType;
  className?: string;
}

export function CompactConcertRow({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  badge,
  className,
}: CompactConcertRowProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const showImage = Boolean(concert.imageUrl) && !imageFailed;
  const resolvedBadge = badge ?? badgeFromUserConcertStatus(userConcert?.status);

  return (
    <Link
      to={`/concert/${id}`}
      state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-surface-2/90 p-2.5 no-underline transition-all hover:border-primary/25 hover:bg-surface-3',
        className
      )}
    >
      <div className="relative size-[4.25rem] shrink-0 overflow-hidden rounded-xl bg-[#0a0b10] sm:size-[4.75rem]">
        {showImage ? (
          <img
            src={concert.imageUrl}
            alt=""
            className="size-full object-cover object-center"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="poster-gradient flex size-full items-center justify-center font-display text-xl font-bold text-white/70">
            {artist.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 py-0.5">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <p className="truncate font-display text-sm font-semibold text-foreground">{artist}</p>
          {resolvedBadge && <ConcertCardBadge type={resolvedBadge} className="scale-90" />}
        </div>
        <p className="truncate text-xs text-muted-foreground">{venue}</p>
        {date && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0 opacity-70" aria-hidden />
            {formatDate(date)}
            {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
          </p>
        )}
        {rating && rating.overall > 0 && (
          <div className="mt-1.5">
            <RatingStars value={rating.overall} readonly size="sm" />
          </div>
        )}
      </div>

      <ArrowRight
        className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
