import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { RatingStars } from '@/components/ui/RatingStars';
import { cn } from '@/lib/utils';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';

interface ConcertCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  variant?: 'poster' | 'compact' | 'memory';
  showCta?: boolean;
  /** Show data-source pill on poster/memory cards */
  showSource?: boolean;
  /** Rendered below the card (e.g. Rate button) — outside the nav link */
  footer?: ReactNode;
  /** @deprecated Use footer */
  action?: ReactNode;
}

function sourceLabel(source?: string) {
  if (!source || source === 'mock') return null;
  if (source === 'ticketmaster') return 'Ticketmaster';
  if (source === 'setlistfm') return 'Setlist.fm';
  if (source === 'bandsintown') return 'Bandsintown';
  return source;
}

function posterPlaceholder(artist: string) {
  const initial = artist.slice(0, 1).toUpperCase() || '?';
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-600/50 via-fuchsia-900/35 to-background">
      <span className="select-none text-6xl font-black tracking-tighter text-white/20 sm:text-7xl">
        {initial}
      </span>
    </div>
  );
}

export function ConcertCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  variant = 'poster',
  showCta = true,
  showSource = true,
  footer,
  action,
}: ConcertCardProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const city = concert.city ?? '';
  const location = formatLocation(city, concert.state, concert.country);
  const source = showSource ? sourceLabel(concert.source) : null;
  const cardFooter = footer ?? action;

  if (variant === 'compact') {
    return (
      <Link
        to={`/concert/${id}`}
        state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
        className="block no-underline hover:no-underline"
      >
        <article className="flex gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 transition-colors hover:border-primary/30 hover:bg-card">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="size-16 shrink-0 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/40 to-fuchsia-900/30 text-lg font-bold text-white/90">
              {artist.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-foreground">{artist}</h3>
            <p className="truncate text-sm text-muted-foreground">{venue}</p>
            {date && (
              <p className="mt-1 text-xs text-muted-foreground">
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
          <div
            className={cn(
              'flex shrink-0 flex-col items-end gap-2',
              !userConcert && !cardFooter && 'justify-center'
            )}
          >
            {userConcert && <Badge type={userConcert.status} />}
            {cardFooter ?? <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
          </div>
        </article>
      </Link>
    );
  }

  const isMemory = variant === 'memory';

  return (
    <article className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 transition-colors hover:border-border/70">
      <Link
        to={`/concert/${id}`}
        state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
        className="group block no-underline hover:no-underline"
      >
        <div
          className={cn(
            'relative w-full overflow-hidden',
            isMemory ? 'aspect-[4/3] sm:aspect-[16/10]' : 'aspect-[4/5] max-h-[280px] sm:aspect-[16/10] sm:max-h-none'
          )}
        >
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            posterPlaceholder(artist)
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            {source ? (
              <span className="rounded-full bg-black/30 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-white/60 backdrop-blur-sm">
                {source}
              </span>
            ) : (
              <span />
            )}
            {userConcert && <Badge type={userConcert.status} />}
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-1.5 p-4">
            <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">{artist}</h3>
            <p className="flex items-center gap-1.5 text-sm text-white/80">
              <MapPin className="size-3.5 shrink-0 opacity-80" aria-hidden />
              <span className="truncate">
                {venue}
                {location ? ` · ${location}` : ''}
              </span>
            </p>
            {date && (
              <p className="flex items-center gap-1.5 text-sm text-white/75">
                <Calendar className="size-3.5 shrink-0 opacity-80" aria-hidden />
                {formatDate(date)}
                {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
              </p>
            )}
            {rating && rating.overall > 0 && (
              <RatingStars value={rating.overall} readonly size="sm" />
            )}
            {showCta && !isMemory && (
              <span className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
                View details
              </span>
            )}
          </div>
        </div>
      </Link>
      {cardFooter && (
        <div className="border-t border-border/40 bg-card/80 px-3 py-2.5">{cardFooter}</div>
      )}
    </article>
  );
}
