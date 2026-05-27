import { apiFetch } from '@/api/http';
import { HttpApiError } from '@/api/http';
import { DiscoverLeaflet } from '@/components/map/DiscoverLeaflet';
import { VenueCarousel } from '@/components/map/VenueCarousel';
import { VenueDetailSheet } from '@/components/map/VenueDetailSheet';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SolidBackButton } from '@/components/ui/SolidBackButton';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/FilterChip';
import { SearchBar } from '@/components/ui/SearchBar';
import { DISCOVER_DEFAULT_CENTER, requestUserPosition } from '@/lib/geolocation';
import { mapVenueToNearbyGroup } from '@/lib/mapVenueAdapters';
import type { ApiMeta, MapEventsPayload, MapNearbyVenueGroup } from '@/types';
import { Crosshair, MapPinned } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const RADIUS_OPTIONS = [10, 25, 50, 100] as const;

function sortVenueGroups(groups: MapNearbyVenueGroup[]): MapNearbyVenueGroup[] {
  return [...groups].sort((a, b) => {
    const aCount = a.upcomingShows.length;
    const bCount = b.upcomingShows.length;
    if (aCount !== bCount) return bCount - aCount;
    return a.venueName.localeCompare(b.venueName);
  });
}

export function DiscoverMapPage() {
  const [mounted, setMounted] = useState(false);
  const [center, setCenter] = useState<{ latitude: number; longitude: number }>(() => ({
    ...DISCOVER_DEFAULT_CENTER,
  }));
  const [searchCenter, setSearchCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationHint, setLocationHint] = useState('Finding your location…');

  const [venueGroups, setVenueGroups] = useState<MapNearbyVenueGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [radiusKm, setRadiusKm] = useState<number>(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [dataMeta, setDataMeta] = useState<Pick<ApiMeta, 'source' | 'message'> | null>(null);

  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return venueGroups;
    return venueGroups.filter((g) => {
      const hay = [g.venueName, g.city, g.state, g.address, g.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [venueGroups, searchQuery]);

  useEffect(() => {
    if (!selectedVenueId) return;
    if (!filteredGroups.some((g) => g.venueId === selectedVenueId)) {
      setSelectedVenueId(null);
    }
  }, [filteredGroups, selectedVenueId]);

  useEffect(() => {
    setMounted(true);
    requestUserPosition()
      .then((pos) => {
        const nextCenter = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setCenter(nextCenter);
        setLocationHint('Near you');
      })
      .catch(() => {
        setLocationHint('Location access denied. Showing Toronto by default.');
      });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const queryParam = debouncedSearchQuery
          ? `&q=${encodeURIComponent(debouncedSearchQuery)}`
          : '';
        const res = await apiFetch<MapEventsPayload>(
          `/api/map/events?lat=${encodeURIComponent(center.latitude)}&lng=${encodeURIComponent(center.longitude)}&radius=${encodeURIComponent(radiusKm)}${queryParam}`
        );
        if (cancelled) return;
        const groups = sortVenueGroups(res.data.venues.map(mapVenueToNearbyGroup));
        setVenueGroups(groups);
        setSelectedVenueId(null);
        setDataMeta(res.meta ? { source: res.meta.source, message: res.meta.message } : null);
        setSearchCenter(
          debouncedSearchQuery && res.data.searchCenter ? res.data.searchCenter : null
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof HttpApiError ? e.message : 'Could not load nearby venues');
          setVenueGroups([]);
          setDataMeta(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [center.latitude, center.longitude, radiusKm, debouncedSearchQuery]);

  async function handleLocateAgain() {
    try {
      const pos = await requestUserPosition();
      const nextCenter = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      setSearchQuery('');
      setCenter(nextCenter);
      setSearchCenter(null);
      setLocationHint('Near you');
    } catch {
      setLocationHint('Location access denied. Showing Toronto by default.');
    }
  }

  function handleVenueSelect(group: MapNearbyVenueGroup) {
    setSelectedVenueId(group.venueId);
  }

  const selectedVenue = filteredGroups.find((g) => g.venueId === selectedVenueId) ?? null;

  const venuesWithShows = filteredGroups.filter((g) => g.upcomingShows.length > 0).length;
  const isSearchMode = debouncedSearchQuery.length > 0;
  const locationStatusText = isSearchMode
    ? `Showing results for “${debouncedSearchQuery}”`
    : locationHint;

  const navOffset = 'calc(4rem + env(safe-area-inset-bottom, 0px))';

  const carouselEmptyTitle =
    venueGroups.length > 0 && filteredGroups.length === 0
      ? 'No venues match your search'
      : undefined;
  const carouselEmptySubtitle =
    venueGroups.length > 0 && filteredGroups.length === 0
      ? 'Try another venue or city name.'
      : venueGroups.length === 0 && !loading && !error
        ? 'No upcoming music events at mapped venues in this radius. Try increasing the radius or moving the map.'
        : undefined;

  return (
    <div className="discover-page">
      <div className="discover-map-frame" style={{ bottom: navOffset }}>
        {mounted ? (
          <DiscoverLeaflet
            center={center}
            venueGroups={filteredGroups}
            selectedVenueId={selectedVenueId}
            onVenueSelect={handleVenueSelect}
            searchActive={isSearchMode}
            searchKey={debouncedSearchQuery}
            searchCenter={searchCenter}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted">
            <LoadingSpinner label="Preparing map…" />
          </div>
        )}

        {loading && mounted && (
          <div className="discover-map-loading">
            <span>Loading venues…</span>
          </div>
        )}
      </div>

      <SolidBackButton to="/" label="Discover" className="discover-back-btn pointer-events-auto" />

      <header className="discover-topbar pointer-events-none">
        <div className="discover-topbar__stack pointer-events-auto">
          <div className="discover-topbar__pill glass-panel mx-auto flex max-w-none flex-wrap items-center justify-center gap-2 px-3 py-2">
            <span className="logo text-lg leading-none">Encore</span>
            <span className="discover-topbar__divider hidden sm:block" aria-hidden />
            <span className="discover-topbar__stat shrink-0 text-center">
              <MapPinned className="mx-auto size-3.5 text-primary sm:mx-0 sm:inline sm:mr-1" aria-hidden />
              {filteredGroups.length > 0 ? (
                <>
                  <strong>{filteredGroups.length}</strong> venues
                  {venuesWithShows > 0 && (
                    <span className="text-muted-foreground"> · {venuesWithShows} with shows</span>
                  )}
                </>
              ) : (
                'Discover venues'
              )}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-center">
            <div className="flex flex-wrap justify-center gap-1.5">
              {(RADIUS_OPTIONS as readonly number[]).map((r) => (
                <FilterChip key={r} active={radiusKm === r} onClick={() => setRadiusKm(r)}>
                  {r} km
                </FilterChip>
              ))}
            </div>
            <SearchBar
              placeholder="Search city or venue…"
              value={searchQuery}
              onChange={setSearchQuery}
              className="max-w-md"
            />
          </div>

          {(locationStatusText || dataMeta?.message) && (
            <div className="mt-2 max-w-xl px-3 text-center text-xs leading-snug wrap-break-word">
              <p className="discover-topbar__hint text-balance break-words">{locationStatusText}</p>
              {dataMeta?.source === 'mock' && dataMeta.message && (
                <p className="mt-0.5 text-amber-200/90 text-balance break-words">{dataMeta.message}</p>
              )}
            </div>
          )}
        </div>
      </header>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        className="discover-locate-btn pointer-events-auto shadow-lg"
        title="Center on your location"
        aria-label="Center on your location"
        onClick={() => void handleLocateAgain()}
      >
        <Crosshair className="size-4" />
      </Button>

      {error && mounted && (
        <div className="discover-error" role="alert">
          {error}
        </div>
      )}

      <div className="discover-bottom pointer-events-none" style={{ bottom: navOffset }}>
        {selectedVenue ? (
          <VenueDetailSheet venue={selectedVenue} onClose={() => setSelectedVenueId(null)} />
        ) : (
          <VenueCarousel
            venues={filteredGroups}
            selectedVenueId={selectedVenueId}
            onSelect={handleVenueSelect}
            emptyTitle={carouselEmptyTitle}
            emptySubtitle={carouselEmptySubtitle}
            isInitialLoading={loading && venueGroups.length === 0}
          />
        )}
      </div>
    </div>
  );
}
