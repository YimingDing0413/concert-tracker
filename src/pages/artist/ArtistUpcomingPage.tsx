import { useArtistDetail } from '@/components/artist/ArtistLayout';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLocation } from 'react-router-dom';

export function ArtistUpcomingPage() {
  const artist = useArtistDetail();
  const { pathname } = useLocation();
  const concerts = artist.upcomingConcerts;

  return (
    <section className="artist-section">
      {concerts.length === 0 ? (
        <EmptyState title="No upcoming shows" description="Check back later for new tour dates." />
      ) : (
        <div className="card-list">
          {concerts.map((c) => (
            <ConcertCard key={c.id} concert={c} backTo={pathname} />
          ))}
        </div>
      )}
    </section>
  );
}
