import { useArtistDetail } from '@/components/artist/ArtistLayout';
import { SetlistDisplay } from '@/components/concert/SetlistDisplay';
import { EmptyState } from '@/components/ui/EmptyState';

export function ArtistSetlistsPage() {
  const artist = useArtistDetail();
  const setlists = artist.recentSetlists ?? [];
  const hasPredicted =
    artist.predictedSetlist && artist.upcomingConcerts.length > 0;

  if (!hasPredicted && setlists.length === 0) {
    return (
      <section className="artist-section">
        <EmptyState
          title="No setlists yet"
          description="Setlists from Setlist.fm will show up here after shows are played."
        />
      </section>
    );
  }

  return (
    <section className="artist-section artist-setlists">
      {hasPredicted && artist.predictedSetlist && (
        <SetlistDisplay setlist={artist.predictedSetlist} title="Predicted setlist (next show)" />
      )}
      {setlists.length > 0 ? (
        setlists.map((s) => (
          <SetlistDisplay
            key={s.id}
            setlist={s}
            title={`${s.eventDate ?? ''} · ${s.venueName ?? ''}${s.city ? `, ${s.city}` : ''}`}
          />
        ))
      ) : (
        hasPredicted && (
          <p className="muted">No past setlists on Setlist.fm yet.</p>
        )
      )}
    </section>
  );
}
