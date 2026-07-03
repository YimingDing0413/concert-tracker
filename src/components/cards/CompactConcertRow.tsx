import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { ChevronRight } from 'lucide-react';
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

/** Compact horizontal concert card for dense lists. */
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
  const location = formatLocation(concert.city ?? '', concert.state, concert.country);
  const showImage = Boolean(concert.imageUrl) && !imageFailed;
  const resolvedBadge = badge ?? badgeFromUserConcertStatus(userConcert?.status);

  return (
    <Link
      to={`/concert/${id}`}
      state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
      className={cn(
        'group flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-surface-2 px-2 py-2 no-underline transition-colors hover:border-white/[0.12] hover:bg-surface-3',
        className
      )}
    >
      <div className="relative h-14 w-[3.75rem] shrink-0 overflow-hidden rounded-lg bg-[#0a0b10]">
        {showImage ? (
          <img
            src={concert.imageUrl}
            alt=""
            className="size-full object-cover object-center"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="poster-gradient flex size-full items-center justify-center font-display text-base font-bold text-white/50">
            {artist.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-display text-sm font-semibold text-foreground">{artist}</p>
          {resolvedBadge && <ConcertCardBadge type={resolvedBadge} className="scale-[0.8]" />}
        </div>
        <p className="truncate text-[0.7rem] text-muted-foreground">
          {venue}
          {location ? ` · ${location}` : ''}
        </p>
        {date && (
          <p className="mt-0.5 text-[0.7rem] text-muted-foreground/90">
            {formatDate(date)}
            {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
          </p>
        )}
        {rating && rating.overall > 0 && (
          <div className="mt-1">
            <RatingStars value={rating.overall} readonly size="sm" />
          </div>
        )}
      </div>

      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}
