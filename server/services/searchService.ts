import * as sl from '../clients/setlistfm.js';
import * as tm from '../clients/ticketmaster.js';
import { hasSetlistFm, hasTicketmaster } from '../env.js';
import {
  artistDedupeKey,
  scoreSearchMatch,
  sortBySearchRelevance,
} from '../lib/searchRank.js';
import { filterMockSearch } from '../mock/fallbackData.js';
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

const MIN_ARTIST_MATCH = 35;

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

function dedupeById(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = `${r.type}:${r.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
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

async function fetchArtistCandidates(query: string): Promise<Artist[]> {
  const [attractionsPayload, eventsPayload, suggestPayload, slArtistsRaw] = await Promise.all([
    hasTicketmaster()
      ? safeFetch(() => tm.tmSearchAttractions(query, 15), 'Ticketmaster attractions')
      : null,
    hasTicketmaster()
      ? safeFetch(() => tm.tmSearchEvents({ keyword: query, size: 25 }), 'Ticketmaster events')
      : null,
    hasTicketmaster()
      ? safeFetch(() => tm.tmSuggest(query, 5), 'Ticketmaster suggest')
      : null,
    hasSetlistFm() ? safeFetch(() => sl.slSearchArtists(query, 15), 'Setlist.fm artists') : null,
  ]);

  const tmArtists = attractionsPayload ? normalizeTmAttractionsSearch(attractionsPayload) : [];
  const tmEvents = eventsPayload ? normalizeTmEventsResponse(eventsPayload) : [];
  const eventArtists = extractArtistsFromEvents(tmEvents);
  // /suggest does prefix matching (e.g. "joj" -> "Joji") that keyword search misses.
  const suggestArtists = suggestPayload ? normalizeTmAttractionsSearch(suggestPayload) : [];
  const suggestEventArtists = suggestPayload
    ? extractArtistsFromEvents(normalizeTmEventsResponse(suggestPayload))
    : [];
  const slArtists = slArtistsRaw ? normalizeSlArtistsSearch(slArtistsRaw) : [];

  return mergeArtists(tmArtists, suggestArtists, eventArtists, suggestEventArtists, slArtists);
}

function buildArtistResults(candidates: Artist[], query: string): SearchResult[] {
  const ranked = sortBySearchRelevance(candidates.map(artistToSearchResult), query);
  const wordCount = query.trim().split(/\s+/).filter(Boolean).length;
  const minScore = wordCount > 1 ? 50 : MIN_ARTIST_MATCH;
  return ranked.filter((r) => scoreSearchMatch(r.title, query) >= minScore);
}

function expansionQueries(query: string): string[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [];

  const expansions: string[] = [];
  expansions.push(words[0]);

  if (words.length > 2) {
    expansions.push(words.slice(0, -1).join(' '));
  }

  return [...new Set(expansions)].filter((candidate) => candidate !== query);
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

  const [venuesPayload, eventsPayload, suggestPayload] = await Promise.all([
    hasTicketmaster() ? safeFetch(() => tm.tmSearchVenues({ keyword: q, size: 8 }), 'Ticketmaster venues') : null,
    hasTicketmaster()
      ? safeFetch(() => tm.tmSearchEvents({ keyword: q, size: 25 }), 'Ticketmaster events')
      : null,
    hasTicketmaster() ? safeFetch(() => tm.tmSuggest(q, 5), 'Ticketmaster suggest') : null,
  ]);

  let artistCandidates = await fetchArtistCandidates(q);
  for (const broader of expansionQueries(q)) {
    const extra = await fetchArtistCandidates(broader);
    artistCandidates = mergeArtists(artistCandidates, extra);
  }
  const artists = buildArtistResults(artistCandidates, q);

  const tmEvents = [
    ...(eventsPayload ? normalizeTmEventsResponse(eventsPayload) : []),
    ...(suggestPayload ? normalizeTmEventsResponse(suggestPayload) : []),
  ];

  const venueResults = [
    ...(venuesPayload ? normalizeTmVenuesSearch(venuesPayload) : []),
    ...(suggestPayload ? normalizeTmVenuesSearch(suggestPayload) : []),
  ];

  const venues = dedupeById(
    sortBySearchRelevance(venuesToSearchResults(venueResults), q)
  );

  const events = dedupeById(sortBySearchRelevance(eventsToSearchResults(tmEvents), q));

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
        usedSources.size > 1 ? `Results from ${[...usedSources].join(', ')}` : undefined,
    },
  };
}
