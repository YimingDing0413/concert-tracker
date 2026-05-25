import { Badge } from '@/components/ui/Badge';
import { StarRating } from '@/components/ui/StarRating';
import type { Concert, ConcertRating, UserConcert } from '@/types';
import { formatDate, formatLocation } from '@/utils/format';
import { Link } from 'react-router-dom';

interface ConcertCardProps {
  concert: Concert | Partial<Concert>;
  userConcert?: UserConcert;
  rating?: ConcertRating | null;
  concertId?: string;
}

export function ConcertCard({ concert, userConcert, rating, concertId }: ConcertCardProps) {
  const id = concertId ?? concert.id ?? userConcert?.concertId;
  const artist = concert.artistName ?? 'Unknown artist';
  const venue = concert.venueName ?? 'Unknown venue';
  const date = concert.date ?? '';
  const city = concert.city ?? '';

  return (
    <Link to={`/concert/${id}`} className="concert-card">
      {concert.imageUrl && (
        <img src={concert.imageUrl} alt="" className="concert-card-img" loading="lazy" />
      )}
      <div className="concert-card-body">
        <div className="concert-card-top">
          <h3>{artist}</h3>
          {userConcert && <Badge type={userConcert.status} />}
        </div>
        <p className="concert-card-meta">
          {venue} · {formatLocation(city, concert.state, concert.country)}
        </p>
        {date && <p className="concert-card-date">{formatDate(date)}</p>}
        {rating && rating.overall > 0 && (
          <StarRating value={rating.overall} readonly size="sm" />
        )}
      </div>
    </Link>
  );
}
