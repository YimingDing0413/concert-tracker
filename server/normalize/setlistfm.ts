import type { ConcertEvent, Setlist, SetlistSong } from '../../shared/types/index.js';
import type { SlSetlist } from '../clients/setlistfm.js';
import { slugify } from '../../shared/mappers.js';

function parseSlDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('-');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/** Setlist.fm returns sets as { set: [...] } or sometimes an array */
function getSetBlocks(setlist: SlSetlist): { name?: string; encore?: number; song?: SlSetlist['song'] }[] {
  const sets = setlist.sets;
  if (!sets) return [];
  if (Array.isArray(sets)) return sets;
  if (typeof sets === 'object' && 'set' in sets && Array.isArray(sets.set)) {
    return sets.set;
  }
  return [];
}

function extractSongs(setlist: SlSetlist): SetlistSong[] {
  const songs: SetlistSong[] = [];
  let position = 1;

  for (const block of getSetBlocks(setlist)) {
    const isEncore = block.encore === 1 || block.encore === 2;
    for (const song of block.song ?? []) {
      const name = song.name?.trim();
      if (!name) continue;
      songs.push({
        position: position++,
        name,
        encore: isEncore,
        info: song.info,
      });
    }
  }

  if (songs.length > 0) return songs;

  for (const song of setlist.song ?? []) {
    const name = song.name?.trim();
    if (!name) continue;
    songs.push({
      position: position++,
      name,
      encore: Boolean(song.encore?.encore),
      info: song.info,
    });
  }
  return songs;
}

function parseLocation(raw: SlSetlist): { city?: string; state?: string; country?: string } {
  const city = raw.venue?.city?.name;
  const state = raw.venue?.city?.stateCode ?? raw.venue?.city?.state;
  const country =
    raw.venue?.city?.country?.name ??
    raw.venue?.country?.name;
  return { city, state, country };
}

export function normalizeTourName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\btour\b$/i, '')
    .trim();
}

export interface TourContext {
  tourName?: string;
  date?: string;
  city?: string;
  venueName?: string;
}

function normalizeCity(value?: string): string {
  return value?.trim().toLowerCase().replace(/\s+/g, ' ') ?? '';
}

/**
 * Ticketmaster often omits tour names. Setlist.fm lists upcoming shows with tour
 * metadata, and recent past shows reveal the active tour leg.
 */
export function resolveTourNameForEvent(context: TourContext, setlists: Setlist[]): string | undefined {
  if (context.tourName?.trim()) return context.tourName.trim();

  const eventDate = context.date;
  const cityNorm = normalizeCity(context.city);

  if (eventDate) {
    const sameDate = setlists.filter((s) => s.eventDate === eventDate && s.tourName?.trim());
    if (sameDate.length) {
      if (cityNorm) {
        const cityMatch = sameDate.find((s) => normalizeCity(s.city) === cityNorm);
        if (cityMatch?.tourName) return cityMatch.tourName;
      }
      return sameDate[0].tourName;
    }
  }

  const cutoff = eventDate ?? new Date().toISOString().slice(0, 10);
  const recentPastWithTour = setlists
    .filter(
      (s) =>
        s.source === 'actual' &&
        s.tourName?.trim() &&
        s.eventDate &&
        s.eventDate < cutoff
    )
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  return recentPastWithTour[0]?.tourName;
}

export function buildPredictedSetlistWithTourFallback(
  artistName: string,
  recent: Setlist[],
  concertId: string,
  context: TourContext = {}
): Setlist {
  const resolvedTour = resolveTourNameForEvent(context, recent);
  if (resolvedTour) {
    const fromTour = predictSetlistFromSameTour(
      recent,
      resolvedTour,
      artistName,
      concertId,
      context.date
    );
    if (fromTour) return fromTour;
  }
  return buildPredictedSetlist(artistName, recent, concertId);
}

export function normalizeSlSetlist(raw: SlSetlist, concertId?: string): Setlist {
  const date = parseSlDate(raw.eventDate);
  const location = parseLocation(raw);
  const tourName = raw.tour?.name?.trim() || undefined;
  return {
    id: `sl:${raw.id}`,
    concertId: concertId ?? `sl:event:${raw.id}`,
    source: 'actual',
    songs: extractSongs(raw),
    setlistFmUrl: raw.url,
    eventDate: date,
    venueName: raw.venue.name,
    city: location.city,
    state: location.state,
    country: location.country,
    tourName,
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeSlSetlistsPage(setlists: SlSetlist[]): Setlist[] {
  return setlists.map((s) => normalizeSlSetlist(s));
}

export function setlistToPastEvent(setlist: Setlist, artistName: string): ConcertEvent {
  const date = setlist.eventDate ?? '';
  return {
    id: setlist.concertId,
    source: 'setlistfm',
    title: `${artistName} — ${setlist.venueName ?? 'Live'}`,
    artistName,
    venueName: setlist.venueName ?? 'Unknown venue',
    venueId: `sl:venue:${slugify(setlist.venueName ?? 'venue')}`,
    city: setlist.city ?? '',
    state: setlist.state,
    country: setlist.country,
    date,
    status: 'past',
    rawSourceUrl: setlist.setlistFmUrl,
  };
}

/** Use the latest past show on the same tour as the prediction. */
export function predictSetlistFromSameTour(
  recent: Setlist[],
  tourName: string,
  artistName: string,
  concertId: string,
  beforeDate?: string
): Setlist | null {
  const target = normalizeTourName(tourName);
  if (!target) return null;

  const cutoff = beforeDate ?? new Date().toISOString().slice(0, 10);

  const sameTour = recent
    .filter(
      (s) =>
        s.source === 'actual' &&
        s.tourName &&
        normalizeTourName(s.tourName) === target &&
        s.songs.length > 0 &&
        s.eventDate &&
        s.eventDate < cutoff
    )
    .sort((a, b) => (b.eventDate ?? '').localeCompare(a.eventDate ?? ''));

  const latest = sameTour[0];
  if (!latest) return null;

  return {
    ...latest,
    id: `predicted:${slugify(artistName)}:tour:${slugify(tourName)}`,
    concertId,
    source: 'predicted',
    predictionBasis: 'same-tour',
    tourName: latest.tourName ?? tourName,
    songs: latest.songs.map((song) => ({ ...song })),
    updatedAt: new Date().toISOString(),
  };
}

/** Build predicted setlist from recent actual setlists (frequency fallback). */
export function buildPredictedSetlist(
  artistName: string,
  recent: Setlist[],
  concertId = 'predicted'
): Setlist {
  const songCounts = new Map<string, { count: number; encoreCount: number }>();

  for (const setlist of recent.slice(0, 8)) {
    for (const song of setlist.songs) {
      const key = song.name.toLowerCase();
      const entry = songCounts.get(key) ?? { count: 0, encoreCount: 0 };
      entry.count += 1;
      if (song.encore) entry.encoreCount += 1;
      songCounts.set(key, entry);
    }
  }

  const ranked = [...songCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 18);

  const main = ranked.filter(([, s]) => s.count > 0 && s.encoreCount / s.count < 0.5);
  const encore = ranked.filter(([, s]) => s.count > 0 && s.encoreCount / s.count >= 0.5);

  const songs: SetlistSong[] = [];
  let pos = 1;
  for (const [name] of main) {
    const original = recent.flatMap((s) => s.songs).find((x) => x.name.toLowerCase() === name);
    songs.push({ position: pos++, name: original?.name ?? name, encore: false });
  }
  for (const [name] of encore.slice(0, 3)) {
    const original = recent.flatMap((s) => s.songs).find((x) => x.name.toLowerCase() === name);
    songs.push({ position: pos++, name: original?.name ?? name, encore: true });
  }

  return {
    id: `predicted:${slugify(artistName)}`,
    concertId,
    source: 'predicted',
    predictionBasis: 'recent-frequency',
    songs,
    updatedAt: new Date().toISOString(),
  };
}
