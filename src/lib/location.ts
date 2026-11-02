import { DISCOVER_DEFAULT_CENTER } from '@/lib/geolocation';

export const LOCATION_STORAGE_KEY = 'encore.location';

export type StoredLocation = {
  label: string;
  latitude: number;
  longitude: number;
};

/** Major cities for the location picker (Phase 0). */
export const LOCATION_CITY_PRESETS: StoredLocation[] = [
  { label: 'Toronto', latitude: 43.6532, longitude: -79.3832 },
  { label: 'New York', latitude: 40.7128, longitude: -74.006 },
  { label: 'Los Angeles', latitude: 34.0522, longitude: -118.2437 },
  { label: 'Chicago', latitude: 41.8781, longitude: -87.6298 },
  { label: 'London', latitude: 51.5074, longitude: -0.1278 },
  { label: 'Vancouver', latitude: 49.2827, longitude: -123.1207 },
  { label: 'Montreal', latitude: 45.5017, longitude: -73.5673 },
  { label: 'Austin', latitude: 30.2672, longitude: -97.7431 },
];

export const DEFAULT_STORED_LOCATION: StoredLocation = {
  label: 'Toronto',
  latitude: DISCOVER_DEFAULT_CENTER.latitude,
  longitude: DISCOVER_DEFAULT_CENTER.longitude,
};

export function readStoredLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocation>;
    if (
      typeof parsed.label !== 'string' ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number' ||
      Number.isNaN(parsed.latitude) ||
      Number.isNaN(parsed.longitude)
    ) {
      return null;
    }
    return {
      label: parsed.label,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
    };
  } catch {
    return null;
  }
}

export function writeStoredLocation(location: StoredLocation): void {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {
    /* private mode / quota */
  }
}

/** Stored location, or Toronto when nothing is saved. */
export function getEffectiveLocation(): StoredLocation {
  return readStoredLocation() ?? DEFAULT_STORED_LOCATION;
}
