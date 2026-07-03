import { getMapEventsVenues } from './mapService.js';
import { searchTicketmasterEventsForSpotifyArtist, type TicketmasterAttractionCache } from './ticketmasterArtistLookup.js';
import type { Concert } from '../../shared/types/index.js';
import type { ArtistRecommendationDebug, SpotifyTasteProfile } from '../../shared/types/spotify.js';
import {
  buildSpotifyArtistPool,
  targetedArtistPool,
  type SpotifyArtistPoolEntry,
} from '../../src/lib/recommendations/spotifyArtistPool.js';
import {
  ARTIST_SEARCH_CONCURRENCY,
  getRecommendationWindowDays,
  getTargetedArtistSearchLimit,
  MAX_CANDIDATE_POOL,
} from '../../src/lib/recommendations/config.js';
import { normalizeArtistName } from '../../src/lib/recommendations/artistMatching.js';
import type { MapConcertEvent, MapVenue } from '../../shared/types/index.js';

function mapEventToConcert(venue: MapVenue, e: MapConcertEvent): Concert {
  return {
    id: e.id,
    artistId: e.artistId ?? e.id,
    artistName: e.artistName ?? e.title,
    title: e.title,
    venueId: venue.id,
    venueName: venue.name,
    city: venue.city ?? '',
    state: venue.region,
    country: venue.country ?? 'USA',
    date: e.date,
    startTime: e.time,
    status: 'upcoming',
    ticketUrl: e.ticketUrl,
    imageUrl: e.imageUrl,
    source: e.source === 'ticketmaster' ? 'ticketmaster' : 'mock',
    venueLatitude: venue.latitude,
    venueLongitude: venue.longitude,
    venueAddress: venue.address,
    segmentName: e.segmentName,
    genreName: e.genreName,
    subGenreName: e.subGenreName,
  };
}

function concertsFromMapVenues(venues: MapVenue[]): Concert[] {
  const list: Concert[] = [];
  for (const venue of venues) {
    for (const event of venue.upcomingEvents) {
      list.push(mapEventToConcert(venue, event));
    }
  }
  return list;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

function dedupeConcerts(concerts: Concert[]): Concert[] {
  const byId = new Map<string, Concert>();
  const byFallback = new Map<string, Concert>();

  for (const concert of concerts) {
    if (concert.id) {
      if (!byId.has(concert.id)) byId.set(concert.id, concert);
      continue;
    }
    const fallbackKey = [
      normalizeArtistName(concert.artistName ?? ''),
      normalizeArtistName(concert.venueName ?? ''),
      concert.date,
      normalizeArtistName(concert.city ?? ''),
    ].join('|');
    if (!byFallback.has(fallbackKey)) byFallback.set(fallbackKey, concert);
  }

  return [...byId.values(), ...byFallback.values()];
}

export interface SpotifyCandidatePool {
  candidates: Concert[];
  nearbyCandidateCount: number;
  artistSearchCandidateCount: number;
  uniqueSpotifyArtistPoolCount: number;
  targetedArtistSearchCount: number;
  artistPool: SpotifyArtistPoolEntry[];
  artistDebug: Map<string, ArtistRecommendationDebug>;
}

function initArtistDebug(entry: SpotifyArtistPoolEntry, inSearchPool: boolean): ArtistRecommendationDebug {
  return {
    spotifyArtistName: entry.spotifyArtistName,
    normalizedName: entry.normalizedName,
    artistWeight: entry.artistWeight,
    recentlyPlayedWeight: entry.recentlyPlayedWeight,
    sourceSignals: { ...entry.sourceSignals },
    wasInTargetedSearchPool: inSearchPool,
    ticketmasterEventsFound: 0,
    nearbyEventsFound: 0,
    finalRecommendationsForArtist: 0,
    excludedReasons: [],
  };
}

export async function buildSpotifyRecommendationCandidates(payload: {
  taste: SpotifyTasteProfile;
  latitude: number;
  longitude: number;
  radiusKm: number;
}): Promise<SpotifyCandidatePool> {
  const { taste, latitude, longitude, radiusKm } = payload;
  const artistPool = buildSpotifyArtistPool(taste);
  const searchPool = targetedArtistPool(taste, getTargetedArtistSearchLimit());
  const searchPoolKeys = new Set(searchPool.map((entry) => entry.normalizedName));
  const artistDebug = new Map<string, ArtistRecommendationDebug>();

  for (const entry of artistPool) {
    artistDebug.set(
      entry.normalizedName,
      initArtistDebug(entry, searchPoolKeys.has(entry.normalizedName))
    );
  }

  const mapResult = await getMapEventsVenues({ latitude, longitude, radiusKm });
  const nearby = concertsFromMapVenues(mapResult.data?.venues ?? []);
  const nearbyCandidateCount = nearby.length;

  for (const concert of nearby) {
    for (const entry of artistPool) {
      const names = [
        concert.artistName,
        ...(concert.attractionNames ?? []),
        ...(concert.openers ?? []),
      ].filter(Boolean) as string[];
      if (names.some((name) => normalizeArtistName(name) === entry.normalizedName)) {
        const debug = artistDebug.get(entry.normalizedName);
        if (debug) debug.nearbyEventsFound = (debug.nearbyEventsFound ?? 0) + 1;
      }
    }
  }

  const byId = new Map<string, Concert>();
  for (const concert of nearby) {
    byId.set(concert.id, concert);
  }

  const attractionCache: TicketmasterAttractionCache = new Map();
  let artistSearchCandidateCount = 0;

  if (searchPool.length > 0) {
    const searchResults = await mapWithConcurrency(
      searchPool,
      ARTIST_SEARCH_CONCURRENCY,
      async (entry) => {
        const result = await searchTicketmasterEventsForSpotifyArtist({
          spotifyArtistName: entry.spotifyArtistName,
          latitude,
          longitude,
          radiusKm,
          attractionCache,
        });
        return { entry, result };
      }
    );

    for (const { entry, result } of searchResults) {
      const debug = artistDebug.get(entry.normalizedName);
      if (debug) {
        debug.ticketmasterAttractionFound = result.attractionFound;
        debug.ticketmasterAttractionId = result.attractionId;
        debug.ticketmasterEventsFound = result.eventsFound;
        if (!result.attractionFound) {
          debug.excludedReasons?.push('no_ticketmaster_attraction_match');
        }
        if (result.eventsFound === 0) {
          debug.excludedReasons?.push('no_ticketmaster_events_found');
        }
      }

      for (const concert of result.concerts) {
        if (byId.has(concert.id)) continue;
        byId.set(concert.id, concert);
        artistSearchCandidateCount += 1;
        if (byId.size >= MAX_CANDIDATE_POOL) break;
      }
      if (byId.size >= MAX_CANDIDATE_POOL) break;
    }
  }

  for (const entry of artistPool) {
    if (!searchPoolKeys.has(entry.normalizedName)) {
      artistDebug.get(entry.normalizedName)?.excludedReasons?.push('not_in_targeted_search_pool');
    }
  }

  return {
    candidates: dedupeConcerts([...byId.values()]).slice(0, MAX_CANDIDATE_POOL),
    nearbyCandidateCount,
    artistSearchCandidateCount,
    uniqueSpotifyArtistPoolCount: artistPool.length,
    targetedArtistSearchCount: searchPool.length,
    artistPool,
    artistDebug,
  };
}
