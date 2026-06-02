import type { RecommendedConcert } from '@/lib/recommendations/concertRecommendations';
import { formatDate, formatLocation } from '@/utils/format';
import { Calendar, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecommendedConcertCardProps {
  concert: RecommendedConcert;
  backTo?: string;
}

export function RecommendedConcertCard({
  concert,
  backTo = '/',
}: RecommendedConcertCardProps) {
  const genreLine = [concert.genreName, concert.subGenreName].filter(Boolean).join(' · ');
  const location = formatLocation(concert.city, concert.state, concert.country);

  return (
    <Link
      to={`/concert/${concert.id}`}
      state={{ backTo }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 no-underline shadow-sm transition-shadow hover:border-primary/30 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {concert.imageUrl ? (
          <img
            src={concert.imageUrl}
            alt=""
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10 text-4xl font-bold text-muted-foreground/40">
            {concert.artistName?.charAt(0) ?? '?'}
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-base font-semibold text-foreground">{concert.artistName}</p>
        {genreLine && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{genreLine}</p>
        )}
        <p className="line-clamp-1 flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          {concert.venueName}
          {location ? ` · ${location}` : ''}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" aria-hidden />
          {formatDate(concert.date)}
          {concert.startTime ? ` · ${concert.startTime}` : ''}
        </p>
      </div>
    </Link>
  );
}
