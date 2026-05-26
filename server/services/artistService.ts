import * as bit from '../clients/bandsintown.js';
import * as tm from '../clients/ticketmaster.js';
import * as sl from '../clients/setlistfm.js';
import { hasBandsintown, hasSetlistFm, hasTicketmaster } from '../env.js';
import { mockArtists, mockEvents, mockSetlists } from '../mock/fallbackData.js';
import { normalizeBitArtist, normalizeBitEvents } from '../normalize/bandsintown.js';
import {
  buildPredictedSetlist,
  normalizeSlSetlistsPage,
  predictSetlistFromSameTour,
  setlistToPastEvent,
} from '../normalize/setlistfm.js';
import {
  normalizeTmAttraction,
  normalizeTmAttractionsSearch,
  normalizeTmEventsResponse,
} from '../normalize/ticketmaster.js';
import { withFallback } from '../lib/withFallback.js';
import { concertEventToConcert, slugify } from '../../shared/mappers.js';
import type { Artist, ArtistDetail, ConcertEvent, Setlist } from '../../shared/types/index.js';

function buildPredictedSetlistForArtist(
  artistName: string,
  setlists: Setlist[],
  concertId: string,
  tourName?: string
): Setlist {
  const actual = setlists.filter((s) => s.source === 'actual');
  if (tourName?.trim()) {
    const fromTour = predictSetlistFromSameTour(actual, tourName, artistName, concertId);
    if (fromTour) return fromTour;
  }
  return buildPredictedSetlist(artistName, actual, concertId);
}

export function resolveArtistName(idOrName: string, artist?: Artist): string {
  if (artist?.name) return artist.name;
  const decoded = decodeURIComponent(idOrName);
  if (decoded.includes(':')) {
    return decoded.split(':').pop() ?? decoded;
  }
  return decoded.replace(/-/g, ' ');
}

export async function searchArtists(keyword: string) {
  return withFallback(
    async () => {
      const payload = await tm.tmSearchAttractions(keyword, 15);
      return normalizeTmAttractionsSearch(payload);
    },
    () => mockArtists.filter((a) => a.name.toLowerCase().includes(keyword.toLowerCase())),
    hasTicketmaster(),
    'Ticketmaster artists'
  );
}

export async function getArtistProfile(artistName: string) {
  return withFallback(
    async () => normalizeBitArtist(await bit.bitGetArtistProfile(artistName)),
    () => ({
      id: `bit:artist:${slugify(artistName)}`,
      name: artistName,
      slug: slugify(artistName),
      source: 'mock' as const,
    }),
    hasBandsintown(),
    'Bandsintown profile'
  );
}

export async function getArtistEvents(artistName: string) {
  return withFallback(
    async () => normalizeBitEvents(await bit.bitGetArtistEvents(artistName), artistName),
    () => mockEvents.filter((e) => e.artistName.toLowerCase().includes(artistName.toLowerCase())),
    hasBandsintown(),
    'Bandsintown events'
  );
}

export async function getSetlistsForArtist(artistName: string, options?: { pages?: number }) {
  return withFallback(
    async () => {
      const found = await sl.slSearchArtist(artistName);
      if (!found?.mbid) return [];
      const maxPages = options?.pages ?? 1;
      const all: Setlist[] = [];
      for (let p = 1; p <= maxPages; p++) {
        const page = await sl.slGetArtistSetlists(found.mbid, p);
        all.push(...normalizeSlSetlistsPage(page.setlist ?? []));
        const perPage = page.itemsPerPage || 20;
        const totalPages = Math.max(1, Math.ceil((page.total ?? 0) / perPage));
        if (p >= totalPages) break;
      }
      return all;
    },
    () => mockSetlists,
    hasSetlistFm(),
    'Setlist.fm'
  );
}

async function getTicketmasterArtistEvents(attractionId: string, mode: 'upcoming' | 'past') {
  const rawId = attractionId.replace('tm:attraction:', '');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (mode === 'upcoming') {
    const payload = await tm.tmSearchEvents({
      attractionId: rawId,
      size: 50,
      startDateTime: `${today}T00:00:00Z`,
      sort: 'date,asc',
    });
    return normalizeTmEventsResponse(payload);
  }

  const pastEnd = new Date(now);
  pastEnd.setDate(pastEnd.getDate() - 1);
  const pastStart = new Date(now);
  pastStart.setFullYear(pastStart.getFullYear() - 5);

  const payload = await tm.tmSearchEvents({
    attractionId: rawId,
    size: 50,
    startDateTime: pastStart.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    endDateTime: pastEnd.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    sort: 'date,desc',
  });
  return normalizeTmEventsResponse(payload).filter((e) => e.date < today);
}

export async function getArtistDetail(idOrName: string): Promise<{
  data: ArtistDetail;
  meta?: { source: string; message?: string };
}> {
  const decoded = decodeURIComponent(idOrName);
  let artist: Artist | null = null;

  if (decoded.startsWith('tm:attraction:') && hasTicketmaster()) {
    try {
      const raw = await tm.tmGetAttraction(decoded);
      artist = normalizeTmAttraction(raw);
    } catch {
      /* fall through */
    }
  }

  if (!artist) {
    const searchRes = await searchArtists(resolveArtistName(decoded));
    artist = searchRes.data[0] ?? {
      id: `name:${slugify(decoded)}`,
      name: resolveArtistName(decoded),
      slug: slugify(decoded),
      source: 'mock',
    };
  }

  const artistName = artist.name;
  const tmAttractionId = decoded.startsWith('tm:attraction:')
    ? decoded
    : artist.id.startsWith('tm:attraction:')
      ? artist.id
      : artist.externalIds?.ticketmaster
        ? `tm:attraction:${artist.externalIds.ticketmaster}`
        : null;

  const [bitEventsRes, tmUpcomingRes, tmPastRes, setlistsRes] = await Promise.all([
    getArtistEvents(artistName),
    tmAttractionId && hasTicketmaster()
      ? withFallback(
          () => getTicketmasterArtistEvents(tmAttractionId, 'upcoming'),
          () => [],
          true,
          'TM upcoming'
        )
      : Promise.resolve({ data: [] as ConcertEvent[], meta: { source: 'live' as const } }),
    tmAttractionId && hasTicketmaster()
      ? withFallback(
          () => getTicketmasterArtistEvents(tmAttractionId, 'past'),
          () => [],
          true,
          'TM past'
        )
      : Promise.resolve({ data: [] as ConcertEvent[], meta: { source: 'live' as const } }),
    getSetlistsForArtist(artistName),
  ]);

  const setlists = setlistsRes.data;
  const pastFromSetlists = setlists
    .filter((s) => s.eventDate && s.eventDate < new Date().toISOString().slice(0, 10))
    .map((s) => setlistToPastEvent(s, artistName))
    .map((s) => enrichSetlistPastEvent(s, tmPastRes.data));

  const allPastEvents = [...bitEventsRes.data, ...tmPastRes.data, ...pastFromSetlists];
  const allUpcomingEvents = [...bitEventsRes.data, ...tmUpcomingRes.data];

  const upcoming = dedupeEvents(allUpcomingEvents)
    .filter((e) => e.status === 'upcoming' || e.date >= new Date().toISOString().slice(0, 10))
    .map(concertEventToConcert)
    .sort((a, b) => a.date.localeCompare(b.date));

  const past = dedupeEvents(allPastEvents)
    .filter((e) => e.status === 'past' || e.date < new Date().toISOString().slice(0, 10))
    .map(concertEventToConcert)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);

  const profileRes = await getArtistProfile(artistName);
  const mergedArtist: Artist = {
    ...artist,
    ...profileRes.data,
    imageUrl: artist.imageUrl ?? profileRes.data.imageUrl,
    source: artist.source ?? profileRes.data.source,
  };

  const upcomingTour = upcoming[0]?.tourName;
  const predicted = buildPredictedSetlistForArtist(
    artistName,
    setlists,
    `predicted:${artist.id}`,
    upcomingTour
  );

  const messages = [
    bitEventsRes.meta?.message,
    setlistsRes.meta?.message,
    (tmPastRes.meta as { message?: string } | undefined)?.message,
  ].filter(Boolean);

  return {
    data: {
      ...mergedArtist,
      upcomingConcerts: upcoming,
      pastConcerts: past,
      recentSetlists: setlists.slice(0, 8),
      predictedSetlist: predicted.songs.length > 0 ? predicted : undefined,
    },
    meta: {
      source: messages.length ? 'partial' : 'live',
      message: messages.join(' · ') || undefined,
    },
  };
}

function dedupeEvents<T extends { id: string; date: string; venueName: string }>(events: T[]): T[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = `${e.date}|${e.venueName.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function enrichSetlistPastEvent(
  setlistEvent: ConcertEvent,
  tmPastEvents: ConcertEvent[]
): ConcertEvent {
  const tmMatch = tmPastEvents.find(
    (tmEvent) =>
      tmEvent.date === setlistEvent.date &&
      sameVenueName(tmEvent.venueName, setlistEvent.venueName)
  );

  if (!tmMatch) return setlistEvent;

  return {
    ...setlistEvent,
    // Keep Setlist.fm event id so setlist linking still works.
    artistName: tmMatch.artistName ?? setlistEvent.artistName,
    artistId: tmMatch.artistId ?? setlistEvent.artistId,
    venueId: tmMatch.venueId ?? setlistEvent.venueId,
    city: tmMatch.city || setlistEvent.city,
    state: tmMatch.state ?? setlistEvent.state,
    country: tmMatch.country ?? setlistEvent.country,
    time: tmMatch.time ?? setlistEvent.time,
    openers: tmMatch.openers ?? setlistEvent.openers,
    imageUrl: tmMatch.imageUrl ?? setlistEvent.imageUrl,
    ticketUrl: tmMatch.ticketUrl ?? setlistEvent.ticketUrl,
  };
}

function sameVenueName(a: string, b: string): boolean {
  const na = normalizeVenueName(a);
  const nb = normalizeVenueName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function normalizeVenueName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
