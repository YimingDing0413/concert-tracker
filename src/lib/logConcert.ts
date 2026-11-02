import type { Concert, ConcertDetail, UserConcert, UserConcertStatus } from '@/types';

/** Derive log status from show date (YYYY-MM-DD or ISO). Past → attended, else going. */
export function statusFromDate(dateIso: string, now = new Date()): UserConcertStatus {
  const day = dateIso.slice(0, 10);
  const today = now.toISOString().slice(0, 10);
  if (!day) return 'attended';
  return day < today ? 'attended' : 'going';
}

export function concertStatusFromDate(dateIso: string): 'upcoming' | 'past' {
  return statusFromDate(dateIso) === 'attended' ? 'past' : 'upcoming';
}

export function buildEventSnapshot(partial: {
  id?: string;
  artistName: string;
  venueName?: string;
  city?: string;
  state?: string;
  country?: string;
  date?: string;
  startTime?: string;
  imageUrl?: string;
}): Partial<Concert> {
  const date = partial.date ?? new Date().toISOString().slice(0, 10);
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
  const date = snap.date ?? uc.createdAt.slice(0, 10);
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

export function localDateISO(offsetDays = 0): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** Most recent Saturday relative to today (0 if today is Saturday). */
export function lastWeekendISO(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const daysSinceSaturday = (day + 1) % 7;
  d.setDate(d.getDate() - (daysSinceSaturday === 0 ? 7 : daysSinceSaturday));
  return d.toISOString().slice(0, 10);
}
