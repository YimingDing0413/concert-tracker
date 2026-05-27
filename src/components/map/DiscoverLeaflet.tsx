import { createVenuePinIcon } from '@/components/map/venuePinIcon';
import type { MapNearbyVenueGroup } from '@/types';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

const DAY_MAP_TILES =
  'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const NIGHT_MAP_TILES =
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

function isLocalNight(date: Date): boolean {
  const hour = date.getHours();
  return hour < 6 || hour >= 18;
}

/** Near-me mode: pan to user/default center. */
function MapRecenter({
  latitude,
  longitude,
  enabled,
}: {
  latitude: number;
  longitude: number;
  enabled: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return;
    map.setView([latitude, longitude], 12, {
      animate: true,
      duration: 0.4,
    });
  }, [latitude, longitude, enabled, map]);
  return null;
}

/** Search mode: fit all venue markers in view. */
function FitVenueBounds({
  venueGroups,
  enabled,
  searchKey,
}: {
  venueGroups: MapNearbyVenueGroup[];
  enabled: boolean;
  /** Changes when a new search is submitted so bounds refit. */
  searchKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || venueGroups.length === 0) return;
    const points = venueGroups.map((g) => [g.latitude, g.longitude] as [number, number]);
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true, duration: 0.45 });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [56, 56],
      maxZoom: 14,
      animate: true,
      duration: 0.45,
    });
  }, [venueGroups, enabled, searchKey, map]);
  return null;
}

/** Search mode with no venues: pan to geocoded city. */
function FlyToSearchCenter({
  center,
  enabled,
  searchKey,
}: {
  center: { latitude: number; longitude: number } | null;
  enabled: boolean;
  searchKey: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!enabled || !center) return;
    map.setView([center.latitude, center.longitude], 11, {
      animate: true,
      duration: 0.45,
    });
  }, [center, enabled, searchKey, map]);
  return null;
}

function FlyToVenue({
  group,
  searchActive,
}: {
  group: MapNearbyVenueGroup | null;
  searchActive: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!group) return;
    map.flyTo([group.latitude, group.longitude], searchActive ? 14 : 15, {
      animate: true,
      duration: 0.55,
    });
  }, [group, searchActive, map]);
  return null;
}

interface DiscoverLeafletProps {
  center: { latitude: number; longitude: number };
  venueGroups: MapNearbyVenueGroup[];
  selectedVenueId: string | null;
  onVenueSelect: (group: MapNearbyVenueGroup) => void;
  searchActive: boolean;
  searchKey: string;
  searchCenter: { latitude: number; longitude: number } | null;
}

export function DiscoverLeaflet({
  center,
  venueGroups,
  selectedVenueId,
  onVenueSelect,
  searchActive,
  searchKey,
  searchCenter,
}: DiscoverLeafletProps) {
  const [nightMode, setNightMode] = useState<boolean>(() => isLocalNight(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNightMode(isLocalNight(new Date()));
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tileUrl = useMemo(
    () => (nightMode ? NIGHT_MAP_TILES : DAY_MAP_TILES),
    [nightMode]
  );

  const selectedGroup =
    venueGroups.find((g) => g.venueId === selectedVenueId) ?? null;

  const fitBounds = searchActive && venueGroups.length > 0;
  const flyCity =
    searchActive && venueGroups.length === 0 && searchCenter !== null;

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={12}
      className="discover-map z-0 h-full w-full"
      scrollWheelZoom
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url={tileUrl}
      />
      <MapRecenter
        latitude={center.latitude}
        longitude={center.longitude}
        enabled={!searchActive}
      />
      <FitVenueBounds
        venueGroups={venueGroups}
        enabled={fitBounds}
        searchKey={searchKey}
      />
      <FlyToSearchCenter
        center={searchCenter}
        enabled={flyCity}
        searchKey={searchKey}
      />
      <FlyToVenue group={selectedGroup} searchActive={searchActive} />
      {venueGroups.map((group) => (
        <Marker
          key={group.venueId}
          position={[group.latitude, group.longitude]}
          icon={createVenuePinIcon(group, selectedVenueId === group.venueId)}
          eventHandlers={{
            click: () => onVenueSelect(group),
          }}
          zIndexOffset={
            selectedVenueId === group.venueId
              ? 1000
              : group.upcomingShows.length > 0
                ? 500
                : 0
          }
        />
      ))}
    </MapContainer>
  );
}
