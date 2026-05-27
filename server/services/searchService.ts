import * as sl from '../clients/setlistfm.js';
import * as tm from '../clients/ticketmaster.js';
import { hasSetlistFm, hasTicketmaster } from '../env.js';
import { artistDedupeKey, sortBySearchRelevance } from '../lib/searchRank.js';
import {
  filterMockSearch,
} from '../mock/fallbackData.js';
import { normalizeSlArtistsSearch } from '../normalize/setlistfm.js';
import {
  extractArtistsFromEvents,
  normalizeTmAttractionsSearch,
  normalizeTmEventsResponse,
  normalizeTmVenuesSearch,
} from '../normalize/ticketmaster.js';
import type {
  ApiResponse,
  Artist,
  ConcertEvent,
  SearchResult,
  Venue,
} from '../../shared/types/index.js';

async function safeFetch<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[search] ${label} failed:`, err);
    return null;
  }
}

function mergeArtists(...groups: Artist[][]): Artist[] {
  const map = new Map<string, Artist>();
  for (const group of groups) {
    for (const artist of group) {
      const key = artistDedupeKey(artist.name);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, artist);
        continue;
      }
      const preferTm =
        existing.id.startsWith('tm:attraction:')
          ? existing
          : artist.id.startsWith('tm:attraction:')
            ? artist
            : existing;
      const other = preferTm === existing ? artist : existing;
      map.set(key, {
        ...preferTm,
        imageUrl: preferTm.imageUrl ?? other.imageUrl,
        genres: preferTm.genres ?? other.genres,
        externalIds: { ...other.externalIds, ...preferTm.externalIds },
      });
    }
  }
  return [...map.values()];
}

function artistToSearchResult(artist: Artist): SearchResult {
  const id = artist.id.startsWith('tm:attraction:')
    ? artist.id
    : artist.id.startsWith('sl:artist:')
      ? artist.id
      : `name:${artist.slug}`;
  return {
    id,
    type: 'artist',
    title: artist.name,
    subtitle: artist.genres?.join(' · ') ?? 'Artist',
    imageUrl: artist.imageUrl,
    source: artist.source,
  };
}

function venuesToSearchResults(venues: Venue[]): SearchResult[] {
  return venues.map((v) => ({
    id: v.id,
    type: 'venue',
    title: v.name,
    subtitle: `${v.city}${v.state ? `, ${v.state}` : ''}`,
    imageUrl: v.imageUrl,
    source: v.source ?? 'ticketmaster',
  }));
}

function eventsToSearchResults(events: ConcertEvent[]): SearchResult[] {
  return events.map((e) => ({
    id: e.id,
    type: 'event',
    title: `${e.artistName} @ ${e.venueName}`,
    subtitle: `${e.date} · ${e.city}`,
    imageUrl: e.imageUrl,
    source: e.source,
  }));
}

export async function searchAll(query: string): Promise<ApiResponse<SearchResult[]>> {
  const q = query.trim();
  if (!q) {
    return { data: [], meta: { source: 'live' } };
  }

  if (!hasTicketmaster() && !hasSetlistFm()) {
    return {
      data: filterMockSearch(q),
      meta: { source: 'mock', message: 'Search APIs not configured — using mock data' },
    };
  }

  const [attractionsPayload, venuesPayload, eventsPayload, slArtistsRaw] = await Promise.all([
    hasTicketmaster() ? safeFetch(() => tm.tmSearchAttractions(q, 12), 'Ticketmaster attractions') : null,
    hasTicketmaster() ? safeFetch(() => tm.tmSearchVenues(q, 8), 'Ticketmaster venues') : null,
    hasTicketmaster()
      ? safeFetch(() => tm.tmSearchEvents({ keyword: q, size: 25 }), 'Ticketmaster events')
      : null,
    hasSetlistFm() ? safeFetch(() => sl.slSearchArtists(q, 12), 'Setlist.fm artists') : null,
  ]);

  const tmArtists = attractionsPayload ? normalizeTmAttractionsSearch(attractionsPayload) : [];
  const tmEvents = eventsPayload ? normalizeTmEventsResponse(eventsPayload) : [];
  const eventArtists = extractArtistsFromEvents(tmEvents);
  const slArtists = slArtistsRaw ? normalizeSlArtistsSearch(slArtistsRaw) : [];

  const artists = sortBySearchRelevance(
    mergeArtists(tmArtists, eventArtists, slArtists).map(artistToSearchResult),
    q
  );

  const venues = sortBySearchRelevance(
    venuesToSearchResults(venuesPayload ? normalizeTmVenuesSearch(venuesPayload) : []),
    q
  );

  const events = sortBySearchRelevance(eventsToSearchResults(tmEvents), q);

  const data = [
    ...artists.slice(0, 10),
    ...venues.slice(0, 5),
    ...events.slice(0, 8),
  ].slice(0, 25);

  if (data.length === 0) {
    return { data: [], meta: { source: 'live' } };
  }

  const usedSources = new Set(data.map((r) => r.source).filter(Boolean));
  return {
    data,
    meta: {
      source: 'live',
      message:
        usedSources.size > 1
          ? `Results from ${[...usedSources].join(', ')}`
          : undefined,
    },
  };
}
