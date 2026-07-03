import { SpotifyPickCard } from '@/components/cards/SpotifyPickCard';
import { Button } from '@/components/ui/app-button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { useAuth } from '@/context/AuthContext';
import { DISCOVER_DEFAULT_CENTER, requestUserPosition } from '@/lib/geolocation';
import {
  getSpotifyConcertRecommendations,
  getSpotifyStatus,
  startSpotifyConnect,
  syncSpotifyTaste,
} from '@/lib/social/spotifyApi';
import type { SpotifyConcertRecommendation } from '@/types/spotify';
import { Music2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export function SpotifyRecommendationsPage() {
  const { user } = useAuth();
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(() => ({
    ...DISCOVER_DEFAULT_CENTER,
  }));
  const [recommendations, setRecommendations] = useState<SpotifyConcertRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    requestUserPosition()
      .then((pos) =>
        setCenter({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
      )
      .catch(() => setCenter({ ...DISCOVER_DEFAULT_CENTER }));
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const status = await getSpotifyStatus();
      setConnected(status.connected);
      setSynced(status.hasTasteProfile);
      if (status.connected && status.hasTasteProfile) {
        const data = await getSpotifyConcertRecommendations({
          lat: center.latitude,
          lng: center.longitude,
          radius: 50,
          limit: 24,
        });
        setRecommendations(data.recommendations);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load recommendations.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [user, center.latitude, center.longitude]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <div className="space-y-6 pb-8">
      <SolidBackButton to="/" label="Discover" />

      <header>
        <h1 className="text-display-lg text-foreground">Spotify picks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Concerts near you based on what you listen to
        </p>
      </header>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}

      {loading ? (
        <ListRowSkeleton count={4} />
      ) : !connected ? (
        <EmptyState
          title="Connect Spotify"
          description="Link your account to see personalized concert picks."
          action={
            <Button variant="primary" size="sm" onClick={() => void startSpotifyConnect()}>
              Connect Spotify
            </Button>
          }
        />
      ) : !synced ? (
        <EmptyState
          title="Sync your taste"
          description="Spotify is connected. Sync your listening history to unlock picks."
          action={
            <Button
              variant="primary"
              size="sm"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true);
                try {
                  await syncSpotifyTaste();
                  await load();
                } finally {
                  setSyncing(false);
                }
              }}
            >
              {syncing ? 'Syncing…' : 'Sync Spotify'}
            </Button>
          }
        />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No matches nearby"
          description="We couldn't find upcoming shows that match your Spotify taste in this area."
          action={
            <Link to="/map" className="text-sm font-medium text-primary">
              Explore map →
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {recommendations.map((c) => (
            <li key={c.id}>
              <SpotifyPickCard concert={c} backTo="/discover/spotify" />
            </li>
          ))}
        </ul>
      )}

      {!loading && connected && synced && recommendations.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Music2 className="size-3.5 text-spotify" aria-hidden />
          {recommendations.length} show{recommendations.length === 1 ? '' : 's'} matched to your taste
        </p>
      )}
    </div>
  );
}
