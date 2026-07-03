import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatTime } from '@/utils/format';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CompactConcertRowProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  className?: string;
}

export function CompactConcertRow({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  className,
}: CompactConcertRowProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';

  return (
    <Link
      to={`/concert/${id}`}
      state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
      className={cn(
        'group flex items-center gap-3 rounded-xl bg-surface-2/80 px-3 py-2.5 no-underline transition-colors hover:bg-surface-3',
        className
      )}
    >
      {concert.imageUrl ? (
        <img
          src={concert.imageUrl}
          alt=""
          className="size-14 shrink-0 rounded-lg object-cover"
          loading="lazy"
        />
      ) : (
        <div className="poster-gradient flex size-14 shrink-0 items-center justify-center rounded-lg font-display text-lg font-bold text-white/80">
          {artist.slice(0, 1)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-foreground">{artist}</p>
        <p className="truncate text-xs text-muted-foreground">{venue}</p>
        {date && (
          <p className="mt-0.5 text-xs text-muted-foreground">
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
      <div className="flex shrink-0 items-center gap-2">
        {userConcert && <Badge type={userConcert.status} />}
        <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
    </Link>
  );
}
