import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';
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
  featured?: boolean;
}

function PosterArtFallback({ artist, compact }: { artist: string; compact?: boolean }) {
  const initial = artist.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <div className="absolute inset-0 poster-gradient">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.35),transparent_55%)]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={cn(
            'font-display font-bold text-white/[0.12] select-none',
            compact ? 'text-6xl' : 'text-7xl sm:text-8xl'
          )}
          aria-hidden
        >
          {initial}
        </span>
      </div>
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
  subtitle,
  badge,
  width = 'full',
  featured = false,
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
        'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-2 shadow-[0_12px_40px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_50px_-18px_rgba(168,85,247,0.35)]',
        isCarousel && 'w-[72vw] max-w-[280px] sm:w-[260px]',
        className
      )}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden bg-[#0a0b10]',
          isCarousel ? 'aspect-[5/6]' : featured ? 'aspect-[4/5]' : 'aspect-[5/6] sm:aspect-[4/5]'
        )}
      >
        {showImage ? (
          <>
            <img
              src={concert.imageUrl}
              alt=""
              className="absolute inset-0 size-full scale-[1.03] object-cover object-[center_20%] transition-transform duration-700 group-hover:scale-[1.06]"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
            <div className="absolute inset-0 bg-black/25" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_40%,rgba(0,0,0,0.35)_100%)]" />
          </>
        ) : (
          <PosterArtFallback artist={artist} compact={isCarousel} />
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0b10] via-[#0a0b10]/55 via-35% to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/95 via-black/70 to-transparent" />

        <Link
          to={detailTo}
          state={detailState}
          className="absolute inset-0 z-[1]"
          aria-label={`View ${artist} at ${venue}`}
        />

        {resolvedBadge && (
          <div className="pointer-events-none absolute left-3 top-3 z-[2]">
            <ConcertCardBadge type={resolvedBadge} />
          </div>
        )}

        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col',
            isCarousel ? 'gap-2 p-3.5 pt-14' : 'gap-2.5 p-4 pt-16 sm:p-5 sm:pt-20'
          )}
        >
          <div className="space-y-2">
            <h3
              className={cn(
                'font-display font-bold leading-[1.05] tracking-tight text-white line-clamp-2',
                featured ? 'text-2xl sm:text-3xl' : isCarousel ? 'text-xl' : 'text-2xl sm:text-[1.65rem]'
              )}
            >
              {artist}
            </h3>

            {subtitle && (
              <p className="line-clamp-2 text-xs font-medium leading-snug text-spotify sm:text-[0.8rem]">
                {subtitle}
              </p>
            )}

            <div className="space-y-1">
              <p className="flex items-start gap-1.5 text-sm font-medium leading-snug text-white/85">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-white/50" aria-hidden />
                <span className="line-clamp-2">{venue}</span>
              </p>
              {date && (
                <p className="flex items-center gap-1.5 text-xs text-white/60">
                  <Calendar className="size-3.5 shrink-0 text-white/45" aria-hidden />
                  <span>
                    {formatDate(date)}
                    {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
                    {location ? ` · ${location}` : ''}
                  </span>
                </p>
              )}
            </div>

            {rating && rating.overall > 0 && (
              <div className="pt-0.5">
                <RatingStars value={rating.overall} readonly size="sm" />
              </div>
            )}
          </div>

          {(showCta || footer) && (
            <div className="pointer-events-auto mt-1 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="min-w-0 flex-1">{footer}</div>
              {showCta && (
                <Link
                  to={detailTo}
                  state={detailState}
                  className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-white/80 no-underline transition-colors hover:text-primary"
                >
                  View show
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
