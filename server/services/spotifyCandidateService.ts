import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import { normalizeTmEventsResponse } from '../normalize/ticketmaster.js';
import { getMapEventsVenues } from './mapService.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { Concert } from '../../shared/types/index.js';
import type { SpotifyTasteProfile } from '../../shared/types/spotify.js';
import { normalizeArtistName } from '../../src/lib/recommendations/artistMatching.js';
import type { MapConcertEvent, MapVenue } from '../../shared/types/index.js';

const MAX_CANDIDATE_POOL = 250;
const TOP_ARTIST_SEARCH_COUNT = 25;
const EVENTS_PER_ARTIST_SEARCH = 6;
const ARTIST_SEARCH_CONCURRENCY = 5;

function todayStartUtc(): string {
  return `${new Date().toISOString().slice(0, 10)}T00:00:00Z`;
}

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

function topSpotifyArtistsByWeight(taste: SpotifyTasteProfile, limit: number): string[] {
  const weights = taste.artistWeights ?? {};
  const names = new Map<string, string>();

  for (const artist of taste.topArtists) {
    const key = normalizeArtistName(artist.name);
    if (key && !names.has(key)) names.set(key, artist.name);
  }

  return [...names.entries()]
    .map(([key, displayName]) => ({
      key,
      displayName,
      weight: weights[key] ?? 0,
    }))
    .sort((a, b) => b.weight - a.weight || a.displayName.localeCompare(b.displayName))
    .slice(0, limit)
    .map((entry) => entry.displayName);
}

async function searchEventsForArtist(
  artistName: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<Concert[]> {
  if (!hasTicketmaster()) return [];

  const latlong = `${latitude},${longitude}`;
  const radius = String(Math.min(100, Math.max(10, Math.round(radiusKm))));

  try {
    const payload = await tm.tmSearchEvents({
      keyword: artistName,
      latlong,
      radius,
      unit: 'km',
      size: EVENTS_PER_ARTIST_SEARCH,
      sort: 'date,asc',
      startDateTime: todayStartUtc(),
      classificationName: 'music',
    });

    return normalizeTmEventsResponse(payload)
      .filter((e) => e.status !== 'past')
      .map(concertEventToConcert);
  } catch {
    return [];
  }
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

export interface SpotifyCandidatePool {
  candidates: Concert[];
  nearbyCandidateCount: number;
  artistSearchCandidateCount: number;
}

export async function buildSpotifyRecommendationCandidates(payload: {
  taste: SpotifyTasteProfile;
  latitude: number;
  longitude: number;
  radiusKm: number;
}): Promise<SpotifyCandidatePool> {
  const { taste, latitude, longitude, radiusKm } = payload;

  const mapResult = await getMapEventsVenues({ latitude, longitude, radiusKm });
  const nearby = concertsFromMapVenues(mapResult.data?.venues ?? []);

  const byId = new Map<string, Concert>();
  for (const concert of nearby) {
    byId.set(concert.id, concert);
  }
  const nearbyCandidateCount = byId.size;

  const topArtists = topSpotifyArtistsByWeight(taste, TOP_ARTIST_SEARCH_COUNT);
  let artistSearchCandidateCount = 0;

  if (hasTicketmaster() && topArtists.length > 0) {
    const searchResults = await mapWithConcurrency(
      topArtists,
      ARTIST_SEARCH_CONCURRENCY,
      (artistName) => searchEventsForArtist(artistName, latitude, longitude, radiusKm)
    );

    for (const concerts of searchResults) {
      for (const concert of concerts) {
        if (byId.has(concert.id)) continue;
        byId.set(concert.id, concert);
        artistSearchCandidateCount += 1;
        if (byId.size >= MAX_CANDIDATE_POOL) break;
      }
      if (byId.size >= MAX_CANDIDATE_POOL) break;
    }
  }

  return {
    candidates: [...byId.values()].slice(0, MAX_CANDIDATE_POOL),
    nearbyCandidateCount,
    artistSearchCandidateCount,
  };
}
