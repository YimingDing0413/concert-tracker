import { SpotifyPickCard } from '@/components/cards/SpotifyPickCard';
import { ConcertPosterCard } from '@/components/cards/ConcertPosterCard';
import { Button } from '@/components/ui/app-button';
import { ConcertCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { HorizontalCarousel } from '@/components/ui/HorizontalCarousel';
import {
  getSpotifyConcertRecommendations,
  getSpotifyStatus,
  startSpotifyConnect,
  syncSpotifyTaste,
  type SpotifyRecommendationsResponse,
} from '@/lib/social/spotifyApi';
import type { Concert } from '@/types';
import type { SpotifyConnectionStatus } from '@/types/spotify';
import { ChevronRight, Music2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

interface SpotifyForYouSectionProps {
  userId?: string;
  latitude: number;
  longitude: number;
  nearbyFallback: Concert[];
  loadingNearby: boolean;
  layout?: 'grid' | 'carousel';
}

export function SpotifyForYouSection({
  userId,
  latitude,
  longitude,
  nearbyFallback,
  loadingNearby,
  layout = 'grid',
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
          limit: 12,
        });
        setRecs(data);
      } else {
        setRecs(null);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not load Spotify recommendations.';
      setError(message);
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
  const sparseRecommendations =
    recs?.sparseRecommendations ||
    (synced && recommendations.length > 0 && recommendations.length <= 2);
  const showSeeAll = connected && synced && recommendations.length > 0;

  const cardList =
    layout === 'carousel' ? (
      <HorizontalCarousel>
        {recommendations.map((c) => (
          <SpotifyPickCard key={c.id} concert={c} backTo="/" width="carousel" />
        ))}
      </HorizontalCarousel>
    ) : (
      <div className="grid gap-4 sm:grid-cols-2">
        {recommendations.map((c) => (
          <SpotifyPickCard key={c.id} concert={c} backTo="/" />
        ))}
      </div>
    );

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-display-md text-foreground">For you from Spotify</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Concerts near you based on what you listen to
          </p>
        </div>
        {showSeeAll && (
          <Link
            to="/discover/spotify"
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-primary no-underline hover:underline"
          >
            See all
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading || loadingNearby ? (
        layout === 'carousel' ? (
          <HorizontalCarousel>
            {Array.from({ length: 3 }).map((_, i) => (
              <ConcertCardSkeleton key={`spotify-${i}`} />
            ))}
          </HorizontalCarousel>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <ConcertCardSkeleton key={`spotify-${i}`} />
            ))}
          </div>
        )
      ) : !connected ? (
        <div className="rounded-2xl bg-spotify-soft p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-spotify/15 text-spotify">
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
        <div className="rounded-2xl bg-spotify-soft p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-spotify/15 text-spotify">
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
        <>
          {sparseRecommendations && (
            <p className="rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
              Only a few exact artist matches found near you. Try increasing radius or syncing Spotify
              again.
            </p>
          )}
          {cardList}
        </>
      ) : (
        <div className="space-y-4">
          <EmptyState
            title="Only a few exact artist matches found nearby"
            description="Try increasing your search radius on the map or sync Spotify again to refresh your taste profile."
          />
          {nearbyFallback.length > 0 &&
            (layout === 'carousel' ? (
              <HorizontalCarousel>
                {nearbyFallback.slice(0, 4).map((c) => (
                  <ConcertPosterCard key={`spotify-fallback-${c.id}`} concert={c} backTo="/" width="carousel" />
                ))}
              </HorizontalCarousel>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {nearbyFallback.slice(0, 4).map((c) => (
                  <ConcertPosterCard key={`spotify-fallback-${c.id}`} concert={c} backTo="/" />
                ))}
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
