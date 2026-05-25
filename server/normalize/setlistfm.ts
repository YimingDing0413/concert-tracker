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

export function normalizeSlSetlist(raw: SlSetlist, concertId?: string): Setlist {
  const date = parseSlDate(raw.eventDate);
  return {
    id: `sl:${raw.id}`,
    concertId: concertId ?? `sl:event:${raw.id}`,
    source: 'actual',
    songs: extractSongs(raw),
    setlistFmUrl: raw.url,
    eventDate: date,
    venueName: raw.venue.name,
    city: raw.venue.city.name,
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
    date,
    status: 'past',
    rawSourceUrl: setlist.setlistFmUrl,
  };
}

/** Build predicted setlist from recent actual setlists */
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
    songs,
    updatedAt: new Date().toISOString(),
  };
}
