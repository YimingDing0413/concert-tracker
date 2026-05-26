import { useArtistDetail } from '@/components/artist/ArtistLayout';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLocation } from 'react-router-dom';

export function ArtistPastPage() {
  const artist = useArtistDetail();
  const { pathname } = useLocation();
  const concerts = artist.pastConcerts;

  return (
    <section className="artist-section">
      {concerts.length === 0 ? (
        <EmptyState title="No past shows" description="Past concerts will appear here when available." />
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
