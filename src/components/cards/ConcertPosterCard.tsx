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

/** Ticketmaster event images are selected at 16:9 in server/normalize/ticketmaster.ts */
const TM_EVENT_IMAGE_ASPECT = 'aspect-[16/9]' as const;
/** Carousel card width — 75% of the 8.75rem / 9.25rem baseline, image stays 16:9 */
const CAROUSEL_CARD_WIDTH = 'w-[6.5625rem] sm:w-[6.9375rem]';

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
        className="absolute inset-0 size-full object-cover object-center"
        loading="lazy"
        onError={onError}
      />
    );
  }

  return (
    <div className="poster-gradient absolute inset-0 flex items-center justify-center">
      <span className="font-display text-base font-bold text-white/25">{artist.slice(0, 1).toUpperCase()}</span>
    </div>
  );
}

/** Compact vertical concert card — TM 16:9 poster on top, metadata below. */
export function ConcertPosterCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  showCta = true,
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
        'flex flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-surface-2 text-left transition-colors hover:border-white/[0.12] hover:bg-surface-3',
        isCarousel ? cn(CAROUSEL_CARD_WIDTH, 'shrink-0') : 'w-full min-w-0',
        className
      )}
    >
      <Link to={detailTo} state={detailState} className="group flex flex-col no-underline">
        <div className={cn('relative w-full shrink-0 overflow-hidden bg-[#0a0b10]', TM_EVENT_IMAGE_ASPECT)}>
          <CompactCardMedia
            artist={artist}
            imageUrl={showImage ? concert.imageUrl : undefined}
            onError={() => setImageFailed(true)}
          />
          {resolvedBadge && (
            <div className="absolute left-1.5 top-1.5 z-[1]">
              <ConcertCardBadge type={resolvedBadge} className="scale-[0.72] origin-top-left" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-0.5 px-1.5 py-1">
          {subtitle && (
            <p className="line-clamp-1 text-[0.625rem] font-medium leading-tight text-spotify">{subtitle}</p>
          )}

          <h3 className="font-display text-xs font-semibold leading-tight text-foreground line-clamp-1">
            {artist}
          </h3>

          <p className="text-[0.6875rem] leading-tight text-muted-foreground line-clamp-1">
            {venue}
            {location ? ` · ${location}` : ''}
          </p>

          {date && (
            <p className="text-[0.6875rem] leading-tight text-muted-foreground/90 line-clamp-1">
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
            <p className="pt-0.5 text-[0.6875rem] font-medium leading-tight text-primary/90 group-hover:text-primary">
              View details →
            </p>
          )}
        </div>
      </Link>

      {footer && <div className="border-t border-white/[0.06] px-1.5 py-1">{footer}</div>}
    </article>
  );
}
