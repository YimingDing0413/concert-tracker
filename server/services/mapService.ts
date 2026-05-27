import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import { geocodePlace } from '../lib/geocode.js';
import { withFallback } from '../lib/withFallback.js';
import { mockEvents, mockVenues } from '../mock/fallbackData.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import type {
  Concert,
  ConcertEvent,
  MapNearbyPayload,
  MapNearbyVenueGroup,
  MapConcertEvent,
  MapVenue,
} from '../../shared/types/index.js';
import {
  normalizeTmEventsResponse,
  normalizeTmVenuesSearch,
} from '../normalize/ticketmaster.js';

function todayStartUtc(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
}

export function concertEventToMapConcertEvent(event: ConcertEvent): MapConcertEvent {
  const source: MapConcertEvent['source'] =
    event.source === 'ticketmaster' ? 'ticketmaster' : 'mock';
  return {
    id: event.id,
    title: event.title,
    artistName: event.artistName,
    artistId: event.artistId,
    date: event.date,
    time: event.time,
    ticketUrl: event.ticketUrl,
    imageUrl: event.imageUrl,
    source,
  };
}

/** Group normalized events by venue → map markers (coordinates required). */
export function groupConcertEventsToMapVenues(events: ConcertEvent[]): MapVenue[] {
  const byVenue = new Map<string, ConcertEvent[]>();
  for (const e of events) {
    if (!e.venueId) continue;
    if (
      e.venueLatitude === undefined ||
      e.venueLongitude === undefined ||
      Number.isNaN(e.venueLatitude) ||
      Number.isNaN(e.venueLongitude)
    ) {
      continue;
    }
    const list = byVenue.get(e.venueId) ?? [];
    list.push(e);
    byVenue.set(e.venueId, list);
  }

  const venues: MapVenue[] = [];
  for (const evList of byVenue.values()) {
    const sorted = [...evList].sort(
      (a, b) =>
        a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? '')
    );
    const first = sorted[0];
    if (!first?.venueId) continue;

    let lat = 0;
    let lng = 0;
    for (const s of sorted) {
      lat += s.venueLatitude ?? 0;
      lng += s.venueLongitude ?? 0;
    }
    lat /= sorted.length;
    lng /= sorted.length;

    const address = sorted.find((s) => s.venueAddress?.trim())?.venueAddress?.trim();

    venues.push({
      id: first.venueId,
      name: first.venueName,
      address,
      city: first.city || undefined,
      region: first.state ?? first.region,
      country: first.country,
      latitude: lat,
      longitude: lng,
      upcomingEvents: sorted.map(concertEventToMapConcertEvent),
    });
  }

  return venues.sort((a, b) => {
    const da = a.upcomingEvents[0]?.date ?? '';
    const db = b.upcomingEvents[0]?.date ?? '';
    return da.localeCompare(db);
  });
}

function buildMockMapVenues(): MapVenue[] {
  const enriched = enrichMockEventsWithVenueCoords(mockEvents);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = enriched.filter(
    (e) =>
      (e.status === 'upcoming' || e.date >= today) &&
      e.venueLatitude !== undefined &&
      e.venueLongitude !== undefined &&
      Boolean(e.venueId)
  );
  return groupConcertEventsToMapVenues(upcoming);
}

/**
 * Music events near a point → venues with upcoming concerts (Ticketmaster Discovery).
 */
export async function getMapEventsVenues(payload: {
  latitude: number;
  longitude: number;
  radiusKm: number;
  query?: string;
}) {
  const { latitude, longitude, radiusKm, query } = payload;

  return withFallback(
    async () => {
      const radius = String(Math.min(Math.max(1, Math.round(radiusKm)), 100));
      const latlong = `${latitude},${longitude}`;

      const trimmedQuery = query?.trim();
      let tmEvents: ConcertEvent[] = [];

      if (trimmedQuery) {
        // Search mode: allow jumping to other cities/venues by text.
        const [cityRaw, keywordRaw] = await Promise.all([
          tm.tmSearchEvents({
            city: trimmedQuery,
            unit: 'km',
            size: 120,
            sort: 'date,asc',
            startDateTime: todayStartUtc(),
            classificationName: 'music',
          }),
          tm.tmSearchEvents({
            keyword: trimmedQuery,
            unit: 'km',
            size: 120,
            sort: 'date,asc',
            startDateTime: todayStartUtc(),
            classificationName: 'music',
          }),
        ]);

        const merged = [
          ...normalizeTmEventsResponse(cityRaw),
          ...normalizeTmEventsResponse(keywordRaw),
        ];
        const byId = new Map<string, ConcertEvent>();
        for (const e of merged) byId.set(e.id, e);
        tmEvents = [...byId.values()];
      } else {
        const eventsRaw = await tm.tmSearchEvents({
          latlong,
          radius,
          unit: 'km',
          size: 200,
          sort: 'date,asc',
          startDateTime: todayStartUtc(),
          classificationName: 'music',
        });
        tmEvents = normalizeTmEventsResponse(eventsRaw);
      }

      const upcoming = tmEvents.filter(
        (e) => e.status === 'upcoming' || e.date >= new Date().toISOString().slice(0, 10)
      );
      const venues = groupConcertEventsToMapVenues(upcoming);
      const searchCenter = trimmedQuery ? await geocodePlace(trimmedQuery) : null;
      return {
        venues,
        ...(searchCenter ? { searchCenter } : {}),
      };
    },
    async () => {
      const trimmedQuery = query?.trim();
      const searchCenter = trimmedQuery ? await geocodePlace(trimmedQuery) : null;
      return {
        venues: buildMockMapVenues(),
        ...(searchCenter ? { searchCenter } : {}),
      };
    },
    hasTicketmaster(),
    'Ticketmaster map events'
  );
}

function groupVenues(concerts: Concert[]): MapNearbyVenueGroup[] {
  const byVenue = new Map<string, Concert[]>();
  for (const c of concerts) {
    if (
      c.venueLatitude === undefined ||
      c.venueLongitude === undefined ||
      Number.isNaN(c.venueLatitude) ||
      Number.isNaN(c.venueLongitude)
    ) {
      continue;
    }
    const key = c.venueId;
    const list = byVenue.get(key) ?? [];
    list.push(c);
    byVenue.set(key, list);
  }

  const groups: MapNearbyVenueGroup[] = [];
  for (const shows of byVenue.values()) {
    const sorted = [...shows].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    if (!first?.venueLatitude || !first.venueLongitude) continue;

    let lat = 0;
    let lng = 0;
    for (const s of sorted) {
      lat += s.venueLatitude ?? 0;
      lng += s.venueLongitude ?? 0;
    }
    lat /= sorted.length;
    lng /= sorted.length;

    const address = sorted.find((s) => s.venueAddress?.trim())?.venueAddress?.trim();

    groups.push({
      venueId: first.venueId,
      venueName: first.venueName,
      address,
      city: first.city,
      state: first.state,
      country: first.country,
      latitude: lat,
      longitude: lng,
      upcomingShows: sorted,
    });
  }

  return groups.sort((a, b) => {
    const da = a.upcomingShows[0]?.date ?? '';
    const db = b.upcomingShows[0]?.date ?? '';
    return da.localeCompare(db);
  });
}

function enrichMockEventsWithVenueCoords(events: ConcertEvent[]): ConcertEvent[] {
  return events.map((e) => {
    if (e.source !== 'mock' || !e.venueId) return e;
    const v = mockVenues.find((mv) => mv.id === e.venueId);
    if (!v?.latitude || !v?.longitude) return e;
    return {
      ...e,
      venueLatitude: v.latitude,
      venueLongitude: v.longitude,
    };
  });
}

export async function getNearbyMap(payload: {
  latitude: number;
  longitude: number;
  radiusKm: number;
}) {
  const { latitude, longitude, radiusKm } = payload;

  return withFallback(
    async () => {
      const radius = String(Math.min(Math.max(1, Math.round(radiusKm)), 150));
      const latlong = `${latitude},${longitude}`;

      let venuesRaw: Record<string, unknown> = {};
      try {
        venuesRaw = await tm.tmSearchVenues({
          keyword: 'music',
          size: 40,
          latlong,
          radius,
          unit: 'km',
        });
      } catch {
        venuesRaw = { _embedded: { venues: [] } };
      }

      const eventsRaw = await tm.tmSearchEvents({
        latlong,
        radius,
        unit: 'km',
        size: 80,
        sort: 'date,asc',
        startDateTime: todayStartUtc(),
      });

      const tmEvents = normalizeTmEventsResponse(eventsRaw).filter(
        (e) => e.status === 'upcoming' || e.date >= new Date().toISOString().slice(0, 10)
      );

      const concerts = tmEvents.map(concertEventToConcert);

      const venueOnly = normalizeTmVenuesSearch(venuesRaw);
      const venueIdsWithShows = new Set(concerts.filter((c) => c.venueId).map((c) => c.venueId));

      const extraGroups: MapNearbyVenueGroup[] = venueOnly
        .filter(
          (v) =>
            v.latitude !== undefined &&
            v.longitude !== undefined &&
            !venueIdsWithShows.has(v.id)
        )
        .slice(0, 25)
        .map((v) => ({
          venueId: v.id,
          venueName: v.name,
          address: v.address,
          city: v.city,
          state: v.state,
          country: v.country,
          latitude: v.latitude!,
          longitude: v.longitude!,
          upcomingShows: [],
        }));

      const fromEvents = groupVenues(concerts);
      const venueGroups = [...fromEvents, ...extraGroups];

      const data: MapNearbyPayload = {
        center: { latitude, longitude },
        radiusKm,
        venueGroups,
        concerts: [...concerts].sort((a, b) => a.date.localeCompare(b.date)),
      };

      return data;
    },
    () => {
      const enriched = enrichMockEventsWithVenueCoords(mockEvents);
      const concerts = enriched
        .filter(
          (e) =>
            (e.status === 'upcoming' || e.date >= new Date().toISOString().slice(0, 10)) &&
            e.venueLatitude !== undefined
        )
        .map(concertEventToConcert);

      const data: MapNearbyPayload = {
        center: { latitude, longitude },
        radiusKm,
        venueGroups: groupVenues(concerts),
        concerts,
      };
      return data;
    },
    hasTicketmaster(),
    'Ticketmaster map nearby'
  );
}
