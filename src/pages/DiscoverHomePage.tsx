import { apiFetch } from '@/api/http';
import { api } from '@/api';
import { CompactConcertRow } from '@/components/cards/CompactConcertRow';
import { ConcertPosterCard } from '@/components/cards/ConcertPosterCard';
import { SpotifyForYouSection } from '@/components/spotify/SpotifyForYouSection';
import { LocationChip } from '@/components/location/LocationChip';
import { SearchAutocomplete } from '@/components/search/SearchAutocomplete';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConcertCardSkeleton, ListRowSkeleton } from '@/components/ui/LoadingSkeleton';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import {
  getAllConcertReviews,
  REVIEWS_SYNCED_EVENT,
  syncConcertReviewsFromServer,
} from '@/lib/concertReviewsLocal';
import { getEffectiveLocation, type StoredLocation } from '@/lib/location';
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
import { formatDate, formatLocation } from '@/utils/format';
import { MapPin, Sparkles, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const BACK_TO = '/discover';

function concertsFromMapPayload(data: MapEventsPayload): Concert[] {
  const list: Concert[] = [];
  for (const venue of data.venues) {
    const group = mapVenueToNearbyGroup(venue);
    list.push(...group.upcomingShows);
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

function takeUnseen<T extends { id: string }>(items: T[], shown: Set<string>, limit?: number): T[] {
  const out: T[] = [];
  for (const item of items) {
    if (shown.has(item.id)) continue;
    out.push(item);
    shown.add(item.id);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

function FeaturedHero({
  concert,
  label,
}: {
  concert: RecommendedConcert | Concert;
  label: string;
}) {
  const location = formatLocation(concert.city, concert.state, concert.country);

  return (
    <Link
      to={`/concert/${concert.id}`}
      state={{ backTo: BACK_TO, concertSnapshot: concert }}
      className="group relative block overflow-hidden rounded-3xl no-underline"
    >
      <div className="relative aspect-[16/11] sm:aspect-[21/9]">
        {concert.imageUrl ? (
          <img
            src={concert.imageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="poster-gradient absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 space-y-2 p-5 sm:p-7">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            {label}
          </span>
          <h2 className="text-display-lg text-white">{concert.artistName}</h2>
          <p className="flex items-center gap-1.5 text-sm text-white/75">
            <MapPin className="size-4 shrink-0" aria-hidden />
            {concert.venueName}
            {location ? ` · ${location}` : ''}
          </p>
          {concert.date && (
            <p className="text-sm font-medium text-white/90">{formatDate(concert.date)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function DiscoverHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const requireAuth = useRequireAuth();
  const [location, setLocation] = useState<StoredLocation>(() => getEffectiveLocation());
  const [nearbyConcerts, setNearbyConcerts] = useState<Concert[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(true);
  const [userConcerts, setUserConcerts] = useState<UserConcert[]>([]);
  const [reviews, setReviews] = useState<ConcertReview[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [nearbySource, setNearbySource] = useState<'live' | 'mock' | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadNearby() {
      setLoadingNearby(true);
      try {
        const res = await apiFetch<MapEventsPayload>(
          `/api/map/events?lat=${location.latitude}&lng=${location.longitude}&radius=50`
        );
        if (!cancelled) {
          setNearbyConcerts(concertsFromMapPayload(res.data));
          setNearbySource(res.meta?.source === 'live' ? 'live' : 'mock');
        }
      } catch {
        if (!cancelled) {
          setNearbyConcerts([]);
          setNearbySource(null);
        }
      } finally {
        if (!cancelled) setLoadingNearby(false);
      }
    }
    void loadNearby();
    return () => {
      cancelled = true;
    };
  }, [location.latitude, location.longitude]);

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
      } catch {
        if (cancelled) return;
        const ucs = await api.getUserConcerts(user.id);
        if (cancelled) return;
        setUserConcerts(ucs);
        setReviews(getAllConcertReviews(user.id));
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
    return getRecommendedConcerts(nearbyConcerts, concertHistory, 8);
  }, [historyReady, hasTasteProfile, loadingNearby, nearbyConcerts, concertHistory]);

  const sections = useMemo(() => {
    const shown = new Set<string>();
    // Hero only when personalized pick is real (not a nearby fallback).
    const featured = forYou[0] ?? null;
    if (featured) shown.add(featured.id);

    const forYouRest = hasTasteProfile
      ? takeUnseen(forYou.slice(featured ? 1 : 0), shown, 6)
      : [];

    const upcoming = takeUnseen(nearbyConcerts, shown, 8);

    return { featured, forYouRest, upcoming };
  }, [forYou, hasTasteProfile, nearbyConcerts]);

  const trendingArtists = useMemo(() => {
    if (nearbySource === 'mock') return [];
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
  }, [nearbyConcerts, nearbySource]);

  return (
    <div className="space-y-10 pb-6">
      <section className="relative -mx-4 overflow-hidden rounded-b-3xl bg-surface-2 px-4 pb-6 pt-2 sm:-mx-0 sm:rounded-3xl sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5" />
        <div className="relative space-y-4">
          <div>
            <h1 className="text-display-md text-foreground">Discover</h1>
            <p className="mt-1 text-sm text-muted-foreground">Find your next night out</p>
          </div>
          <SearchAutocomplete placeholder="Search artists, venues, cities…" />
          <LocationChip location={location} onChange={setLocation} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => requireAuth(() => navigate('/log'), { next: '/log' })}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Log a show
            </button>
            <Link
              to="/map"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-3 px-3.5 py-1.5 text-xs font-semibold text-foreground no-underline transition-colors hover:bg-primary/15 hover:text-primary"
            >
              <MapPin className="size-3.5" aria-hidden />
              Explore near me
            </Link>
          </div>
        </div>
      </section>

      {nearbySource === 'mock' && (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
          Showing sample listings right now. Live shows will be back shortly.
          {import.meta.env.DEV && (
            <>
              {' '}
              <a href="/api/health" className="font-medium text-amber-50 underline">
                /api/health
              </a>
            </>
          )}
        </p>
      )}

      {!loadingNearby && sections.featured && (
        <section>
          <FeaturedHero concert={sections.featured} label="Picked for you" />
        </section>
      )}
      {loadingNearby && (
        <ConcertCardSkeleton className="aspect-[16/11] rounded-3xl sm:aspect-[21/9]" />
      )}

      {user && (
        <SpotifyForYouSection
          userId={user.id}
          latitude={location.latitude}
          longitude={location.longitude}
          nearbyFallback={[]}
          loadingNearby={loadingNearby}
          layout="carousel"
          backTo={BACK_TO}
          hideWhenDisconnected
          excludeIds={
            sections.featured
              ? new Set([sections.featured.id, ...sections.forYouRest.map((c) => c.id)])
              : new Set(sections.forYouRest.map((c) => c.id))
          }
        />
      )}

      {hasTasteProfile && (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-display-md text-foreground">For you</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Based on shows you’ve been to</p>
            </div>
            <Link to="/map" className="shrink-0 text-xs font-semibold text-primary no-underline">
              Map →
            </Link>
          </div>

          {!historyReady || loadingNearby ? (
            <div className="carousel-scroll">
              {Array.from({ length: 3 }).map((_, i) => (
                <ConcertCardSkeleton key={`for-you-${i}`} />
              ))}
            </div>
          ) : sections.forYouRest.length > 0 ? (
            <div className="carousel-scroll">
              {sections.forYouRest.map((c) => (
                <ConcertPosterCard
                  key={c.id}
                  concert={c}
                  backTo={BACK_TO}
                  width="carousel"
                  badge="nearby"
                />
              ))}
            </div>
          ) : !sections.featured ? (
            <EmptyState
              title="No strong matches yet"
              description="Try the map or browse upcoming shows below."
              action={
                <Link to="/map" className="text-sm font-medium text-primary">
                  Explore map →
                </Link>
              }
            />
          ) : null}
        </section>
      )}

      {trendingArtists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-display-md text-foreground">Trending artists</h2>
          <div className="flex flex-wrap gap-2">
            {trendingArtists.map((name) => (
              <button
                key={name}
                type="button"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-surface-2 px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => navigate(`/search?q=${encodeURIComponent(name)}`)}
              >
                <TrendingUp className="size-3.5 text-accent" aria-hidden />
                {name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-display-md text-foreground">Upcoming near you</h2>
          <Link to="/map" className="shrink-0 text-xs font-semibold text-primary no-underline">
            View all →
          </Link>
        </div>
        {loadingNearby ? (
          <ListRowSkeleton count={4} />
        ) : sections.upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on the calendar nearby"
            description="Search a city or widen your map radius."
          />
        ) : (
          <div className="space-y-2">
            {sections.upcoming.map((c) => (
              <CompactConcertRow key={c.id} concert={c} backTo={BACK_TO} badge="nearby" />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
