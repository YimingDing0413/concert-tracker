import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { PageHeader } from '@/components/layout/PageHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ArtistDetail } from '@/types';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    api
      .getArtist(id)
      .then(setArtist)
      .catch(() => setError('Could not load artist'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (error || !artist) return <p className="muted">{error || 'Artist not found.'}</p>;

  return (
    <div className="page detail-page">
      <PageHeader title={artist.name} subtitle={artist.genres?.join(' · ')} backTo="/" />
      {artist.imageUrl && (
        <img src={artist.imageUrl} alt="" className="detail-hero-img" />
      )}
      <section>
        <h2>Upcoming shows</h2>
        {artist.upcomingConcerts.length === 0 ? (
          <p className="muted">No upcoming dates listed.</p>
        ) : (
          <div className="card-list">
            {artist.upcomingConcerts.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2>Past shows</h2>
        {artist.pastConcerts.length === 0 ? (
          <p className="muted">No past shows in catalog.</p>
        ) : (
          <div className="card-list">
            {artist.pastConcerts.map((c) => (
              <ConcertCard key={c.id} concert={c} />
            ))}
          </div>
        )}
      </section>
      <section>
        <h2>Recent setlists</h2>
        {artist.recentSetlists && artist.recentSetlists.length > 0 ? (
          artist.recentSetlists.slice(0, 5).map((s) => (
            <SetlistDisplay
              key={s.id}
              setlist={s}
              title={`${s.eventDate ?? ''} · ${s.venueName ?? ''}${s.city ? `, ${s.city}` : ''}`}
            />
          ))
        ) : (
          <p className="muted">No setlists found on Setlist.fm for this artist.</p>
        )}
      </section>
      {artist.predictedSetlist && artist.upcomingConcerts.length > 0 && (
        <section>
          <SetlistDisplay setlist={artist.predictedSetlist} />
        </section>
      )}
    </div>
  );
}
