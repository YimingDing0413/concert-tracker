import { StatusBadge as Badge } from '@/components/ui/status-badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StarRating } from '@/components/ui/StarRating';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation } from '@/utils/format';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ConcertCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
  backTo?: string;
}

export function ConcertCard({
  concert,
  userConcert,
  rating,
  concertId,
  backTo,
}: ConcertCardProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const city = concert.city ?? '';

  return (
    <Link
      to={`/concert/${id}`}
      state={{ concertSnapshot: concert, ...(backTo ? { backTo } : {}) }}
      className="block no-underline hover:no-underline"
    >
      <Card
        className={cn(
          'gap-0 overflow-hidden py-0 transition-colors hover:bg-accent/30',
          concert.imageUrl ? 'grid grid-cols-[88px_1fr]' : ''
        )}
      >
        {concert.imageUrl && (
          <img
            src={concert.imageUrl}
            alt=""
            className="h-full min-h-[88px] w-full object-cover"
            loading="lazy"
          />
        )}
        <CardContent className="flex items-center gap-3 p-4">
          {!concert.imageUrl && (
            <Avatar className="size-11 shrink-0">
              <AvatarImage src={undefined} alt="" />
              <AvatarFallback className="bg-primary/15 text-primary">
                {artist.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-start justify-between gap-2">
              <h3 className="truncate text-base font-semibold text-foreground">{artist}</h3>
              {userConcert && <Badge type={userConcert.status} />}
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {venue} · {formatLocation(city, concert.state, concert.country)}
            </p>
            {date && <p className="mt-1 text-sm text-foreground/80">{formatDate(date)}</p>}
            {rating && rating.overall > 0 && (
              <div className="mt-2">
                <StarRating value={rating.overall} readonly size="sm" />
              </div>
            )}
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </CardContent>
      </Card>
    </Link>
  );
}
