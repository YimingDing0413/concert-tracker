import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  badgeFromUserConcertStatus,
  ConcertCardBadge,
  type ConcertCardBadgeType,
} from './ConcertCardBadge';

interface ConcertPosterCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  showCta?: boolean;
  className?: string;
  footer?: ReactNode;
  subtitle?: string;
  badge?: ConcertCardBadgeType;
  width?: 'full' | 'carousel';
  /** @deprecated compact cards ignore featured sizing */
  featured?: boolean;
}

function CompactCardMedia({
  artist,
  imageUrl,
  onError,
}: {
  artist: string;
  imageUrl?: string;
  onError: () => void;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="size-full object-cover object-center"
        loading="lazy"
        onError={onError}
      />
    );
  }

  return (
    <div className="poster-gradient flex size-full items-center justify-center">
      <span className="font-display text-2xl font-bold text-white/30">{artist.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

/** Compact vertical concert card — small poster on top, metadata below. */
export function ConcertPosterCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  showCta = false,
  className,
  footer,
  subtitle,
  badge,
  width = 'full',
}: ConcertPosterCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const location = formatLocation(concert.city ?? '', concert.state, concert.country);
  const showImage = Boolean(concert.imageUrl) && !imageFailed;
  const resolvedBadge = badge ?? badgeFromUserConcertStatus(userConcert?.status);
  const isCarousel = width === 'carousel';
  const detailTo = `/concert/${id}`;
  const detailState = { concertSnapshot: concert, ...(backTo ? { backTo } : {}) };

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border border-white/[0.07] bg-surface-2 transition-colors hover:border-white/[0.12] hover:bg-surface-3',
        isCarousel && 'w-[11.75rem] shrink-0 sm:w-[12.5rem]',
        className
      )}
    >
      <Link
        to={detailTo}
        state={detailState}
        className="group block no-underline"
      >
        <div className="relative h-[4.75rem] w-full overflow-hidden bg-[#0a0b10]">
          <CompactCardMedia
            artist={artist}
            imageUrl={showImage ? concert.imageUrl : undefined}
            onError={() => setImageFailed(true)}
          />
          {resolvedBadge && (
            <div className="absolute left-2 top-2">
              <ConcertCardBadge type={resolvedBadge} className="scale-[0.85] origin-top-left" />
            </div>
          )}
        </div>

        <div className="space-y-1 px-2.5 py-2">
          {subtitle && (
            <p className="line-clamp-1 text-[0.65rem] font-medium leading-tight text-spotify">
              {subtitle}
            </p>
          )}

          <h3 className="font-display text-sm font-semibold leading-snug text-foreground line-clamp-1">
            {artist}
          </h3>

          <p className="text-[0.7rem] leading-snug text-muted-foreground line-clamp-1">
            {venue}
            {location ? ` · ${location}` : ''}
          </p>

          {date && (
            <p className="text-[0.7rem] text-muted-foreground/90">
              {formatDate(date)}
              {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
            </p>
          )}

          {rating && rating.overall > 0 && (
            <div className="pt-0.5">
              <RatingStars value={rating.overall} readonly size="sm" />
            </div>
          )}

          {showCta && (
            <p className="pt-0.5 text-[0.7rem] font-medium text-primary/90 group-hover:text-primary">
              View details →
            </p>
          )}
        </div>
      </Link>

      {footer && <div className="border-t border-white/[0.06] px-2.5 py-2">{footer}</div>}
    </article>
  );
}
