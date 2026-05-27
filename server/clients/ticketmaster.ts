import { env } from '../env.js';
import { fetchJson } from '../lib/http.js';

const BASE = 'https://app.ticketmaster.com/discovery/v2';

function apiUrl(path: string, params: Record<string, string | undefined> = {}) {
  const url = new URL(`${BASE}${path}`);
  url.searchParams.set('apikey', env.ticketmasterApiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }
  return url.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TmPayload = any;

export async function tmSearchEvents(params: {
  keyword?: string;
  city?: string;
  attractionId?: string;
  venueId?: string;
  size?: number;
  startDateTime?: string;
  endDateTime?: string;
  sort?: string;
  /** Latitude,Longitude e.g. 40.7,-73.98 */
  latlong?: string;
  radius?: string;
  /** miles | km */
  unit?: string;
  /** e.g. music — Discovery API classificationName */
  classificationName?: string;
}) {
  return fetchJson<TmPayload>(
    apiUrl('/events.json', {
      keyword: params.keyword,
      city: params.city,
      attractionId: params.attractionId,
      venueId: params.venueId,
      size: String(params.size ?? 20),
      sort: params.sort ?? 'date,asc',
      startDateTime: params.startDateTime,
      endDateTime: params.endDateTime,
      latlong: params.latlong,
      radius: params.radius,
      unit: params.unit,
      classificationName: params.classificationName,
    })
  );
}

export async function tmGetEvent(id: string) {
  const rawId = id.replace(/^tm:event:/, '');
  return fetchJson<TmPayload>(apiUrl(`/events/${rawId}.json`));
}

export async function tmSearchAttractions(keyword: string, size = 10) {
  return fetchJson<TmPayload>(
    apiUrl('/attractions.json', { keyword, size: String(size) })
  );
}

export async function tmGetAttraction(id: string) {
  const rawId = id.replace(/^tm:attraction:/, '');
  return fetchJson<TmPayload>(apiUrl(`/attractions/${rawId}.json`));
}

export async function tmSearchVenues(params: {
  keyword: string;
  size?: number;
  latlong?: string;
  radius?: string;
  unit?: string;
}) {
  return fetchJson<TmPayload>(
    apiUrl('/venues.json', {
      keyword: params.keyword,
      size: String(params.size ?? 10),
      latlong: params.latlong,
      radius: params.radius,
      unit: params.unit,
    })
  );
}

export async function tmGetVenue(id: string) {
  const rawId = id.replace(/^tm:venue:/, '');
  return fetchJson<TmPayload>(apiUrl(`/venues/${rawId}.json`));
}

export async function tmVenueEvents(venueId: string, size = 30) {
  const rawId = venueId.replace(/^tm:venue:/, '');
  return fetchJson<TmPayload>(
    apiUrl('/events.json', { venueId: rawId, size: String(size), sort: 'date,asc' })
  );
}
