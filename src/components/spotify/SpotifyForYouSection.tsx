import { SpotifyRecommendedConcertCard } from '@/components/discover/SpotifyRecommendedConcertCard';
import { Button } from '@/components/ui/app-button';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { ConcertCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import {
  getSpotifyConcertRecommendations,
  getSpotifyStatus,
  startSpotifyConnect,
  syncSpotifyTaste,
  type SpotifyRecommendationsResponse,
} from '@/lib/social/spotifyApi';
import type { Concert } from '@/types';
import type { SpotifyConnectionStatus } from '@/types/spotify';
import { Music2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface SpotifyForYouSectionProps {
  userId?: string;
  latitude: number;
  longitude: number;
  nearbyFallback: Concert[];
  loadingNearby: boolean;
}

export function SpotifyForYouSection({
  userId,
  latitude,
  longitude,
  nearbyFallback,
  loadingNearby,
}: SpotifyForYouSectionProps) {
  const [status, setStatus] = useState<SpotifyConnectionStatus | null>(null);
  const [recs, setRecs] = useState<SpotifyRecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');
    try {
      const s = await getSpotifyStatus();
      setStatus(s);
      if (s.connected && s.hasTasteProfile) {
        const data = await getSpotifyConcertRecommendations({
          lat: latitude,
          lng: longitude,
          radius: 50,
        });
        setRecs(data);
      } else {
        setRecs(null);
      }
    } catch {
      setError('Could not load Spotify recommendations.');
    } finally {
      setLoading(false);
    }
  }, [userId, latitude, longitude]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    try {
      await startSpotifyConnect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect Spotify.');
    }
  }

  async function handleSync() {
    setSyncing(true);
    setError('');
    try {
      await syncSpotifyTaste();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spotify sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  if (!userId) return null;

  const connected = status?.connected ?? false;
  const synced = status?.hasTasteProfile ?? false;
  const recommendations = recs?.recommendations ?? [];

  return (
    <section>
      <SectionHeader
        title="For You from Spotify"
        subtitle="Concerts near you based on what you listen to"
        actionLabel="Profile"
        actionTo="/profile"
      />

      {error && (
        <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading || loadingNearby ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <ConcertCardSkeleton key={`spotify-${i}`} />
          ))}
        </div>
      ) : !connected ? (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1DB954]/15 text-[#1DB954]">
              <Music2 className="size-5" aria-hidden />
            </span>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect Spotify to get concert recommendations based on what you actually listen to.
              </p>
              <Button variant="primary" size="sm" onClick={() => void handleConnect()}>
                Connect Spotify
              </Button>
            </div>
          </div>
        </div>
      ) : !synced ? (
        <div className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#1DB954]/15 text-[#1DB954]">
              <Music2 className="size-5" aria-hidden />
            </span>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Spotify is connected. Sync your taste to unlock recommendations.
              </p>
              <Button variant="primary" size="sm" disabled={syncing} onClick={() => void handleSync()}>
                {syncing ? 'Syncing…' : 'Sync Spotify'}
              </Button>
            </div>
          </div>
        </div>
      ) : recommendations.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {recommendations.map((c) => (
            <SpotifyRecommendedConcertCard key={c.id} concert={c} backTo="/" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <EmptyState
            title="No Spotify-based matches nearby yet"
            description="We couldn't find nearby shows that match your Spotify taste right now."
          />
          {nearbyFallback.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {nearbyFallback.slice(0, 4).map((c) => (
                <ConcertCard key={`spotify-fallback-${c.id}`} concert={c} backTo="/" variant="poster" />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
