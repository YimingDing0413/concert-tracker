import { apiFetch } from '@/api/http';
import { api } from '@/api';
import { ConcertCard } from '@/components/concert/ConcertCard';
import { RecommendedConcertCard } from '@/components/discover/RecommendedConcertCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConcertCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import { DISCOVER_DEFAULT_CENTER, requestUserPosition } from '@/lib/geolocation';
import {
  getAllConcertReviews,
  REVIEWS_SYNCED_EVENT,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { mapVenueToNearbyGroup } from '@/lib/mapVenueAdapters';
import { buildConcertHistory } from '@/lib/recommendations/buildHistory';
import {
  getRecommendedConcerts,
  tasteProfileHasSignals,
  buildUserTasteProfile,
  type RecommendedConcert,
} from '@/lib/recommendations/concertRecommendations';
import type { Concert, MapEventsPayload, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { sortUserConcertsByDate } from '@/utils/userConcert';
import { TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function concertsFromMapPayload(data: MapEventsPayload): Concert[] {
  const list: Concert[] = [];
  for (const venue of data.venues) {
    const group = mapVenueToNearbyGroup(venue);
    list.push(...group.upcomingShows);
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

export function DiscoverHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(() => ({
    ...DISCOVER_DEFAULT_CENTER,
  }));
  const [nearbyConcerts, setNearbyConcerts] = useState<Concert[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [recentUserConcerts, setRecentUserConcerts] = useState<UserConcert[]>([]);
  const [recentConcertMap, setRecentConcertMap] = useState<Record<string, Partial<Concert>>>({});
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [reviews, setReviews] = useState<ConcertReview[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function loadNearby() {
      setLoadingNearby(true);
      try {
        const res = await apiFetch<MapEventsPayload>(
          `/api/map/events?lat=${center.latitude}&lng=${center.longitude}&radius=50`
        );
        if (!cancelled) setNearbyConcerts(concertsFromMapPayload(res.data));
      } catch {
        if (!cancelled) setNearbyConcerts([]);
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    }
    loadNearby();
    return () => {
      cancelled = true;
    };
  }, [center.latitude, center.longitude]);

  useEffect(() => {
    if (!user) {
      setUserConcerts([]);
      setReviews([]);
      setHistoryReady(true);
      return;
    }
    let cancelled = false;
    setHistoryReady(false);
    (async () => {
      try {
        const [ucs, syncedReviews] = await Promise.all([
          api.getUserConcerts(user.id),
          syncConcertReviewsFromServer(user.id),
        ]);
        if (cancelled) return;
        setUserConcerts(ucs);
        setReviews(syncedReviews);
        setRecentUserConcerts(sortUserConcertsByDate(ucs, {}).slice(0, 6));
        const map: Record<string, Partial<Concert>> = {};
        for (const uc of ucs) {
          if (uc.concertSnapshot) map[uc.concertId] = uc.concertSnapshot;
        }
        setRecentConcertMap(map);
      } catch {
        if (cancelled) return;
        const ucs = await api.getUserConcerts(user.id);
        if (cancelled) return;
        setUserConcerts(ucs);
        setReviews(getAllConcertReviews(user.id));
        setRecentUserConcerts(sortUserConcertsByDate(ucs, {}).slice(0, 6));
        const map: Record<string, Partial<Concert>> = {};
        for (const uc of ucs) {
          if (uc.concertSnapshot) map[uc.concertId] = uc.concertSnapshot;
        }
        setRecentConcertMap(map);
      } finally {
        if (!cancelled) setHistoryReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const onSynced = (e: Event) => {
      const detail = (e as CustomEvent<{ userId: string }>).detail;
      if (detail?.userId === user.id) {
        setReviews(getAllConcertReviews(user.id));
      }
    };
    window.addEventListener(REVIEWS_SYNCED_EVENT, onSynced);
    return () => window.removeEventListener(REVIEWS_SYNCED_EVENT, onSynced);
  }, [user]);

  const trendingArtists = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of nearbyConcerts) {
      const name = c.artistName?.trim();
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);
  }, [nearbyConcerts]);

  const concertHistory = useMemo(
    () => buildConcertHistory(userConcerts, reviews),
    [userConcerts, reviews]
  );

  const hasTasteProfile = useMemo(() => {
    if (!historyReady || concertHistory.length === 0) return false;
    return tasteProfileHasSignals(buildUserTasteProfile(concertHistory));
  }, [historyReady, concertHistory]);

  const forYou = useMemo((): RecommendedConcert[] => {
    if (!historyReady || !hasTasteProfile || loadingNearby) return [];
    return getRecommendedConcerts(nearbyConcerts, concertHistory, 6);
  }, [historyReady, hasTasteProfile, loadingNearby, nearbyConcerts, concertHistory]);

  const nearbyFallback = nearbyConcerts.slice(0, 6);
  const upcoming = nearbyConcerts.slice(0, 12);

  return (
    <div className="space-y-10 pb-4">
      <section className="space-y-3 pt-2">
        <SearchAutocomplete placeholder="Search artists, venues, cities…" />
        <div className="flex flex-wrap gap-2">
          <Link
            to="/search"
            className="rounded-full border border-border/60 bg-card/80 px-3.5 py-1.5 text-xs font-semibold text-foreground no-underline transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            Browse all concerts
          </Link>
          <Link
            to="/search?mode=members"
            className="rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:bg-primary/15"
          >
            Find members
          </Link>
        </div>
      </section>

      <section>
        <SectionHeader
          title="For you"
          subtitle={
            hasTasteProfile
              ? 'Based on concerts you’ve attended and rated'
              : 'Upcoming shows around you'
          }
          actionLabel="See map"
          actionTo="/map"
        />
        {!historyReady || loadingNearby ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <ConcertCardSkeleton key={`for-you-${i}`} />
            ))}
          </div>
        ) : hasTasteProfile && forYou.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {forYou.map((c) => (
              <RecommendedConcertCard key={c.id} concert={c} backTo="/" />
            ))}
          </div>
        ) : hasTasteProfile && forYou.length === 0 ? (
          <EmptyState
            title="No strong matches yet"
            description="We couldn’t find nearby shows that match your taste right now. Browse Upcoming near you below or try the map."
            action={
              <Link to="/map" className="text-sm font-medium text-primary">
                Explore map →
              </Link>
            }
          />
        ) : nearbyFallback.length === 0 ? (
          <EmptyState
            title="No nearby shows yet"
            description="Try the map or search another city."
            action={
              <Link to="/map" className="text-sm font-medium text-primary">
                Explore map →
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {!hasTasteProfile && (
              <p className="text-sm text-muted-foreground">
                Rate or attend a few concerts to unlock personalized picks.{' '}
                <Link to="/profile" className="font-medium text-primary">
                  Go to profile →
                </Link>
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {nearbyFallback.map((c) => (
                <ConcertCard key={c.id} concert={c} backTo="/" variant="poster" />
              ))}
            </div>
          </div>
        )}
      </section>

      {trendingArtists.length > 0 && (
        <section>
          <SectionHeader title="Trending artists" subtitle="Popular in your area" />
          <div className="flex flex-wrap gap-2">
            {trendingArtists.map((name) => (
              <button
                key={name}
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/80 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
                onClick={() => navigate(`/search?q=${encodeURIComponent(name)}`)}
              >
                <TrendingUp className="size-3.5 text-accent" aria-hidden />
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeader title="Upcoming near you" actionLabel="View all" actionTo="/map" />
        {loadingNearby ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ConcertCardSkeleton key={i} className="max-h-24" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState title="Nothing on the calendar nearby" description="Search a city or widen your map radius." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <ConcertCard key={c.id} concert={c} backTo="/" variant="compact" showCta={false} />
            ))}
          </div>
        )}
      </section>

      {user && recentUserConcerts.length > 0 && (
        <section>
          <SectionHeader title="Recently added" subtitle="From your concert diary" actionTo="/profile" actionLabel="Profile" />
          <div className="space-y-3">
            {recentUserConcerts.map((uc) => (
              <ConcertCard
                key={uc.id}
                concert={recentConcertMap[uc.concertId] ?? { id: uc.concertId }}
                userConcert={uc}
                concertId={uc.concertId}
                backTo="/"
                variant="compact"
                showCta={false}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
