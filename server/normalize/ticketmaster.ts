import type { Artist, ConcertEvent, SearchResult, Venue } from '../../shared/types/index.js';
import { slugify } from '../../shared/mappers.js';

/** Best-effort tour name from a Ticketmaster event payload */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTourNameFromTmEvent(raw: any): string | undefined {
  const direct = raw?.tour?.name ?? raw?.attractions?.[0]?.tour?.name;
  if (typeof direct === 'string' && direct.trim()) return direct.trim();

  const eventName = raw?.name;
  if (typeof eventName !== 'string') return undefined;

  const dash = eventName.match(/\s[-–—|]\s+(.+)$/);
  if (dash?.[1]) {
    const candidate = dash[1].trim();
    if (candidate.length > 2 && !/tickets?/i.test(candidate)) return candidate;
  }
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pickImage(images: any[] | undefined, preferred = 16 / 9): string | undefined {
  if (!images?.length) return undefined;
  const sorted = [...images].sort(
    (a, b) => Math.abs((a.ratio ?? 1) - preferred) - Math.abs((b.ratio ?? 1) - preferred)
  );
  return sorted.find((i) => i.url)?.url ?? images[0]?.url;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmEvent(raw: any): ConcertEvent | null {
  const e = raw;
  if (!e?.id) return null;
  const attraction = e._embedded?.attractions?.[0];
  const venue = e._embedded?.venues?.[0];
  const date = e.dates?.start?.localDate;
  if (!date) return null;

  const openers =
    e._embedded?.attractions
      ?.slice(1)
      ?.map((a: { name: string }) => a.name)
      .filter(Boolean) ?? [];

  return {
    id: `tm:event:${e.id}`,
    source: 'ticketmaster',
    title: e.name ?? attraction?.name ?? 'Event',
    artistName: attraction?.name ?? e.name ?? 'Unknown',
    artistId: attraction?.id ? `tm:attraction:${attraction.id}` : undefined,
    venueName: venue?.name ?? 'TBA',
    venueId: venue?.id ? `tm:venue:${venue.id}` : undefined,
    city: venue?.city?.name ?? '',
    region: venue?.state?.stateCode,
    state: venue?.state?.stateCode,
    country: venue?.country?.countryCode ?? venue?.country?.name,
    date,
    time: e.dates?.start?.localTime,
    ticketUrl: e.url,
    imageUrl: pickImage(e.images),
    openers: openers.length ? openers : undefined,
    tourName: extractTourNameFromTmEvent(e),
    rawSourceUrl: e.url,
    status: date >= new Date().toISOString().slice(0, 10) ? 'upcoming' : 'past',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmEventsResponse(payload: any): ConcertEvent[] {
  const events = payload?._embedded?.events ?? [];
  return events
    .map(normalizeTmEvent)
    .filter(
      (e: ConcertEvent | null): e is ConcertEvent => e !== null
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmAttraction(raw: any): Artist | null {
  if (!raw?.id || !raw?.name) return null;
  return {
    id: `tm:attraction:${raw.id}`,
    name: raw.name,
    slug: slugify(raw.name),
    imageUrl: pickImage(raw.images, 1),
    genres: raw.classifications?.map((c: { segment?: { name: string } }) => c.segment?.name).filter(Boolean),
    externalIds: { ticketmaster: raw.id },
    source: 'ticketmaster',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmAttractionsSearch(payload: any): Artist[] {
  return (payload?._embedded?.attractions ?? [])
    .map(normalizeTmAttraction)
    .filter(
      (a: Artist | null): a is Artist => a !== null
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmVenue(raw: any): Venue | null {
  if (!raw?.id || !raw?.name) return null;
  return {
    id: `tm:venue:${raw.id}`,
    name: raw.name,
    slug: slugify(raw.name),
    address: raw.address?.line1,
    city: raw.city?.name ?? '',
    state: raw.state?.stateCode,
    region: raw.state?.stateCode,
    country: raw.country?.countryCode ?? raw.country?.name ?? 'USA',
    latitude: raw.location?.latitude ? Number(raw.location.latitude) : undefined,
    longitude: raw.location?.longitude ? Number(raw.location.longitude) : undefined,
    imageUrl: pickImage(raw.images),
    externalIds: { ticketmaster: raw.id },
    source: 'ticketmaster',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeTmVenuesSearch(payload: any): Venue[] {
  return (payload?._embedded?.venues ?? [])
    .map(normalizeTmVenue)
    .filter(
      (v: Venue | null): v is Venue => v !== null
    );
}

/** Pull headliners from event search when attraction search misses partial names. */
export function extractArtistsFromEvents(events: ConcertEvent[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const e of events) {
    if (!e.artistName) continue;
    const id =
      e.artistId ??
      (e.source === 'ticketmaster' ? `name:${slugify(e.artistName)}` : `name:${slugify(e.artistName)}`);
    const key = e.artistName.toLowerCase().trim();
    if (map.has(key)) continue;
    map.set(key, {
      id,
      name: e.artistName,
      slug: slugify(e.artistName),
      imageUrl: e.imageUrl,
      source: e.source === 'mock' ? 'mock' : 'ticketmaster',
      externalIds: e.artistId?.startsWith('tm:attraction:')
        ? { ticketmaster: e.artistId.replace('tm:attraction:', '') }
        : undefined,
    });
  }
  return [...map.values()];
}

export function normalizeTmSearchResults(
  attractions: Artist[],
  venues: Venue[],
  events: ConcertEvent[]
): SearchResult[] {
  const artistResults: SearchResult[] = attractions.map((a) => ({
    id: a.id,
    type: 'artist',
    title: a.name,
    subtitle: a.genres?.join(' · ') ?? 'Artist',
    imageUrl: a.imageUrl,
    source: 'ticketmaster',
  }));
  const venueResults: SearchResult[] = venues.map((v) => ({
    id: v.id,
    type: 'venue',
    title: v.name,
    subtitle: `${v.city}${v.state ? `, ${v.state}` : ''}`,
    imageUrl: v.imageUrl,
    source: 'ticketmaster',
  }));
  const eventResults: SearchResult[] = events.map((e) => ({
    id: e.id,
    type: 'event',
    title: `${e.artistName} @ ${e.venueName}`,
    subtitle: `${e.date} · ${e.city}`,
    imageUrl: e.imageUrl,
    source: 'ticketmaster',
  }));
  return [...artistResults, ...venueResults, ...eventResults].slice(0, 20);
}
