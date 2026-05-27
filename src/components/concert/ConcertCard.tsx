import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RatingStars } from '@/components/ui/RatingStars';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation, formatTime } from '@/utils/format';
import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, MapPin } from 'lucide-react';

interface ConcertCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
  variant?: 'poster' | 'compact';
  showCta?: boolean;
}

function sourceLabel(source?: string) {
  if (!source || source === 'mock') return 'Encore';
  if (source === 'ticketmaster') return 'Ticketmaster';
  if (source === 'setlistfm') return 'Setlist.fm';
  if (source === 'bandsintown') return 'Bandsintown';
  return source;
}

export function ConcertCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
  variant = 'poster',
  showCta = true,
}: ConcertCardProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const city = concert.city ?? '';
  const location = formatLocation(city, concert.state, concert.country);

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
            <Avatar className="size-16 shrink-0 rounded-xl">
              <AvatarFallback className="rounded-xl bg-primary/20 text-lg text-primary">
                {artist.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold text-foreground">{artist}</h3>
              {userConcert && <Badge type={userConcert.status} />}
            </div>
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
          <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground" aria-hidden />
        </article>
      </Link>
    );
  }

  return (
    <Link
      to={`/concert/${id}`}
      state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
      className="group block no-underline hover:no-underline"
    >
      <article className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-lg transition-all hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
        <div className="relative aspect-[4/5] max-h-[280px] w-full overflow-hidden sm:aspect-[16/10] sm:max-h-none">
          {concert.imageUrl ? (
            <img
              src={concert.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-card to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/10" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white/90 backdrop-blur-md">
              {sourceLabel(concert.source)}
            </span>
            {userConcert && <Badge type={userConcert.status} />}
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-2 p-4">
            <h3 className="text-xl font-bold leading-tight text-white">{artist}</h3>
            <p className="flex items-center gap-1.5 text-sm text-white/85">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {venue} · {location}
              </span>
            </p>
            {date && (
              <p className="flex items-center gap-1.5 text-sm font-medium text-white/90">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                {formatDate(date)}
                {concert.startTime ? ` · ${formatTime(concert.startTime)}` : ''}
              </p>
            )}
            {rating && rating.overall > 0 && (
              <RatingStars value={rating.overall} readonly size="sm" />
            )}
            {showCta && (
              <span className="mt-2 flex h-8 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
                View details
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
