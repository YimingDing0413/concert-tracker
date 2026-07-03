import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import { normalizeTmAttractionsSearch, normalizeTmEventsResponse } from '../normalize/ticketmaster.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { Concert } from '../../shared/types/index.js';
import {
  getConcertAttractionNames,
  isExactArtistNameMatch,
  normalizeArtistName,
} from '../../src/lib/recommendations/artistMatching.js';
import {
  getEventsPerArtistLimit,
  getRecommendationWindowDays,
} from '../../src/lib/recommendations/config.js';

export type TicketmasterAttractionCache = Map<string, string | null>;

function todayStartUtc(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
}

function horizonEndUtc(windowDays: number): string {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + windowDays);
  return `${end.toISOString().slice(0, 10)}T23:59:59Z`;
}

export async function resolveTicketmasterAttractionId(
  spotifyArtistName: string,
  cache: TicketmasterAttractionCache
): Promise<{ found: boolean; attractionId?: string }> {
  if (!hasTicketmaster()) return { found: false };

  const normalized = normalizeArtistName(spotifyArtistName);
  if (!normalized) return { found: false };

  if (cache.has(normalized)) {
    const cached = cache.get(normalized);
    return cached ? { found: true, attractionId: cached } : { found: false };
  }

  try {
    const payload = await tm.tmSearchAttractions(spotifyArtistName, 10);
    const attractions = normalizeTmAttractionsSearch(payload);
    const exact = attractions.find(
      (artist) => normalizeArtistName(artist.name) === normalized
    );
    const rawId = exact?.externalIds?.ticketmaster ?? exact?.id?.replace('tm:attraction:', '');
    if (rawId) {
      cache.set(normalized, rawId);
      return { found: true, attractionId: rawId };
    }
    cache.set(normalized, null);
    return { found: false };
  } catch {
    cache.set(normalized, null);
    return { found: false };
  }
}

function concertMatchesSpotifyArtist(concert: Concert, spotifyArtistName: string): boolean {
  if (isExactArtistNameMatch(concert.artistName ?? '', spotifyArtistName)) return true;
  return getConcertAttractionNames(concert).some((name) =>
    isExactArtistNameMatch(name, spotifyArtistName)
  );
}

export async function searchTicketmasterEventsForSpotifyArtist(payload: {
  spotifyArtistName: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  attractionCache: TicketmasterAttractionCache;
  windowDays?: number;
  eventsLimit?: number;
}): Promise<{
  concerts: Concert[];
  attractionFound: boolean;
  attractionId?: string;
  eventsFound: number;
}> {
  const {
    spotifyArtistName,
    latitude,
    longitude,
    radiusKm,
    attractionCache,
    windowDays = getRecommendationWindowDays(),
    eventsLimit = getEventsPerArtistLimit(),
  } = payload;

  if (!hasTicketmaster()) {
    return { concerts: [], attractionFound: false, eventsFound: 0 };
  }

  const latlong = `${latitude},${longitude}`;
  const radius = String(Math.min(100, Math.max(10, Math.round(radiusKm))));
  const startDateTime = todayStartUtc();
  const endDateTime = horizonEndUtc(windowDays);

  const attraction = await resolveTicketmasterAttractionId(spotifyArtistName, attractionCache);
  const byId = new Map<string, Concert>();

  const ingestEvents = (events: ReturnType<typeof normalizeTmEventsResponse>) => {
    for (const event of events) {
      if (event.status === 'past') continue;
      const concert = concertEventToConcert(event);
      if (!concertMatchesSpotifyArtist(concert, spotifyArtistName)) continue;
      byId.set(concert.id, concert);
    }
  };

  if (attraction.attractionId) {
    try {
      const payload = await tm.tmSearchEvents({
        attractionId: attraction.attractionId,
        latlong,
        radius,
        unit: 'km',
        size: eventsLimit,
        sort: 'date,asc',
        startDateTime,
        endDateTime,
        classificationName: 'music',
      });
      ingestEvents(normalizeTmEventsResponse(payload));
    } catch {
      /* fall through to keyword search */
    }
  }

  if (byId.size < eventsLimit) {
    try {
      const payload = await tm.tmSearchEvents({
        keyword: spotifyArtistName,
        latlong,
        radius,
        unit: 'km',
        size: eventsLimit,
        sort: 'date,asc',
        startDateTime,
        endDateTime,
        classificationName: 'music',
      });
      ingestEvents(normalizeTmEventsResponse(payload));
    } catch {
      /* ignore */
    }
  }

  const concerts = [...byId.values()].slice(0, eventsLimit);
  return {
    concerts,
    attractionFound: attraction.found,
    attractionId: attraction.attractionId,
    eventsFound: concerts.length,
  };
}
