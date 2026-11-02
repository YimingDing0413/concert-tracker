import type { Concert, ConcertDetail, UserConcert, UserConcertStatus } from '@/types';

/** Local calendar YYYY-MM-DD (no UTC shift). */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today (or offset) in local calendar parts. */
export function localDateISO(offsetDays = 0, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays);
  return formatLocalDate(d);
}

/**
 * Most recent Saturday relative to today (returns today when today is Saturday).
 */
export function lastWeekendISO(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 Sun .. 6 Sat
  if (day === 6) return formatLocalDate(d);
  const daysSinceSaturday = (day + 1) % 7; // Sun=1 … Fri=6
  d.setDate(d.getDate() - daysSinceSaturday);
  return formatLocalDate(d);
}

/** Derive log status from show date (YYYY-MM-DD or ISO). Past → attended, else going. */
export function statusFromDate(dateIso: string, now = new Date()): UserConcertStatus {
  const day = dateIso.slice(0, 10);
  const today = formatLocalDate(now);
  if (!day) return 'attended';
  return day < today ? 'attended' : 'going';
}

export function concertStatusFromDate(dateIso: string, now = new Date()): 'upcoming' | 'past' {
  return statusFromDate(dateIso, now) === 'attended' ? 'past' : 'upcoming';
}

export function buildEventSnapshot(partial: {
  id?: string;
  artistName: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  date: string;
  startTime?: string;
  imageUrl?: string;
}): Partial<Concert> {
  const date = partial.date.slice(0, 10);
  return {
    id: partial.id,
    artistName: partial.artistName,
    venueName: partial.venueName ?? '',
    city: partial.city ?? '',
    state: partial.state,
    country: partial.country ?? 'USA',
    date,
    startTime: partial.startTime,
    imageUrl: partial.imageUrl,
    status: concertStatusFromDate(date),
    artistId: '',
    venueId: '',
  };
}

/** Build a ConcertDetail from a saved UserConcert when the catalog has no event. */
export function concertDetailFromUserConcert(uc: UserConcert): ConcertDetail {
  const snap = uc.manualConcert ?? uc.concertSnapshot ?? {};
  const date = (snap.date ?? uc.createdAt).slice(0, 10);
  return {
    id: uc.concertId,
    artistId: snap.artistId ?? '',
    artistName: snap.artistName ?? 'Unknown artist',
    venueId: snap.venueId ?? '',
    venueName: snap.venueName ?? '',
    city: snap.city ?? '',
    state: snap.state,
    country: snap.country ?? 'USA',
    date,
    startTime: snap.startTime,
    status: concertStatusFromDate(date),
    openers: snap.openers,
    imageUrl: snap.imageUrl,
    source: snap.source,
  };
}

export function userConcertArtistName(uc: UserConcert): string {
  return (uc.concertSnapshot?.artistName ?? uc.manualConcert?.artistName ?? '').trim();
}

export function userConcertDate(uc: UserConcert): string {
  return (uc.concertSnapshot?.date ?? uc.manualConcert?.date ?? '').slice(0, 10);
}

/** Match artist (case-insensitive) + calendar date. */
export function findDuplicateUserConcert(
  list: UserConcert[],
  artistName: string,
  date: string
): UserConcert | undefined {
  const artist = artistName.trim().toLowerCase();
  const day = date.slice(0, 10);
  if (!artist || !day) return undefined;
  return list.find((uc) => {
    return userConcertArtistName(uc).toLowerCase() === artist && userConcertDate(uc) === day;
  });
}
