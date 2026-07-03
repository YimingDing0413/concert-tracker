import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { Calendar, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ConcertPosterCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  showCta?: boolean;
  className?: string;
  footer?: ReactNode;
  /** Fixed width for carousels */
  width?: 'full' | 'carousel';
}

function posterPlaceholder(artist: string) {
  return (
    <div className="poster-gradient absolute inset-0 flex items-end p-4">
      <span className="font-display text-5xl font-bold text-white/15">{artist.slice(0, 1)}</span>
    </div>
  );
}

export function ConcertPosterCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  showCta = false,
  className,
  footer,
  width = 'full',
}: ConcertPosterCardProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const location = formatLocation(concert.city ?? '', concert.state, concert.country);

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-2xl bg-surface-2',
        width === 'carousel' && 'w-[72vw] max-w-[280px] sm:w-[260px]',
        className
      )}
    >
      <Link
        to={`/concert/${id}`}
        state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
        className="block no-underline"
      >
        <div className="relative aspect-[3/4] max-h-[320px] overflow-hidden sm:aspect-[4/5]">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            posterPlaceholder(artist)
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
          {userConcert && (
            <div className="absolute right-3 top-3">
              <Badge type={userConcert.status} />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 space-y-1 p-4">
            <h3 className="font-display text-xl font-bold leading-tight text-white sm:text-2xl">
              {artist}
            </h3>
            <p className="flex items-center gap-1 text-sm text-white/75">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {venue}
                {location ? ` · ${location}` : ''}
              </span>
            </p>
            {date && (
              <p className="flex items-center gap-1 text-xs text-white/65">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {formatDate(date)}
                {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
              </p>
            )}
            {rating && rating.overall > 0 && (
              <RatingStars value={rating.overall} readonly size="sm" />
            )}
          </div>
        </div>
      </Link>
      {(showCta || footer) && (
        <div className="flex items-center gap-2 px-3 py-2.5">
          {footer}
          {showCta && !footer && (
            <span className="text-xs font-medium text-primary">View details →</span>
          )}
        </div>
      )}
    </article>
  );
}
