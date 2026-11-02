import type { Concert, UserConcert } from '@/types';
import type { ConcertReview, YearEndEntry, YearEndStats } from '@/types/concertReview';
import { resolveConcertForUserConcert } from '@/utils/userConcert';

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * The year a review belongs to. Prefers the concert's eventDate, falling back
 * to when the review was created if the event date is missing or unparseable.
 */
export function getReviewYear(review: ConcertReview): number | null {
  const fromEvent = parseYear(review.eventDate);
  if (fromEvent != null) return fromEvent;
  return parseYear(review.createdAt);
}

/** Calendar year from YYYY-MM-DD (local) or a parseable timestamp. */
export function parseYear(value?: string): number | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return Number(day.slice(0, 4));
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).getFullYear();
}

function entryDateYear(date: string): number | null {
  return parseYear(date);
}

function resolveAttendedDate(uc: UserConcert, concert?: Partial<Concert>): string {
  const resolved = resolveConcertForUserConcert(uc, concert);
  const fromShow = (resolved.date ?? uc.concertSnapshot?.date ?? uc.manualConcert?.date ?? '').slice(
    0,
    10
  );
  if (fromShow) return fromShow;
  return (uc.createdAt ?? '').slice(0, 10);
}

/** Trim, lowercase, strip diacritics — used for dedupe + ranking keys. */
export function normalizeLabelKey(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

function artistDateKey(artistName: string, date: string): string {
  return `${normalizeLabelKey(artistName)}|${date.slice(0, 10)}`;
}

function entryHasImage(entry: YearEndEntry): boolean {
  return Boolean(entry.imageUrl || entry.review?.photoDataUrls?.[0]);
}

/** Prefer the entry that carries a review, else one with an image. */
function preferEntry(a: YearEndEntry, b: YearEndEntry): YearEndEntry {
  const aReview = Boolean(a.review);
  const bReview = Boolean(b.review);
  if (aReview !== bReview) return aReview ? a : b;
  const aImg = entryHasImage(a);
  const bImg = entryHasImage(b);
  if (aImg !== bImg) return aImg ? a : b;
  return a;
}

function upsertByKey(map: Map<string, YearEndEntry>, key: string, entry: YearEndEntry): void {
  const existing = map.get(key);
  map.set(key, existing ? preferEntry(existing, entry) : entry);
}

/**
 * Years that have ≥1 attended show or review (legacy), newest first.
 */
export function getYearsWithEntries(
  userConcerts: UserConcert[],
  reviews: ConcertReview[],
  concertMap: Record<string, Partial<Concert>> = {}
): number[] {
  const years = new Set<number>();

  for (const uc of userConcerts) {
    if (uc.status !== 'attended') continue;
    const date = resolveAttendedDate(uc, concertMap[uc.concertId]);
    const year = entryDateYear(date);
    if (year != null) years.add(year);
  }

  for (const review of reviews) {
    const year = getReviewYear(review);
    if (year != null) years.add(year);
  }

  return [...years].sort((a, b) => b - a);
}

/**
 * Attended shows for `year`, enriched with matching reviews.
 * Deduped by concertId, then by normalized artist + date.
 * Legacy reviews with no matching UserConcert are included.
 */
export function getYearEntries(
  userConcerts: UserConcert[],
  reviews: ConcertReview[],
  year: number,
  concertMap: Record<string, Partial<Concert>> = {}
): YearEndEntry[] {
  const reviewsByEvent = new Map<string, ConcertReview>();
  for (const review of reviews) {
    if (!review.eventId) continue;
    const existing = reviewsByEvent.get(review.eventId);
    if (!existing || review.updatedAt > existing.updatedAt) {
      reviewsByEvent.set(review.eventId, review);
    }
  }

  const byConcertId = new Map<string, YearEndEntry>();

  for (const uc of userConcerts) {
    if (uc.status !== 'attended') continue;
    const concert = concertMap[uc.concertId];
    const resolved = resolveConcertForUserConcert(uc, concert);
    const date = resolveAttendedDate(uc, concert);
    if (entryDateYear(date) !== year) continue;

    const review = reviewsByEvent.get(uc.concertId);
    const entry: YearEndEntry = {
      concertId: uc.concertId,
      artistName: resolved.artistName ?? review?.artistName ?? 'Unknown artist',
      venueName: resolved.venueName || review?.venueName,
      city: resolved.city,
      date,
      imageUrl: resolved.imageUrl ?? review?.photoDataUrls?.[0],
      review,
    };
    upsertByKey(byConcertId, uc.concertId, entry);
  }

  for (const review of reviews) {
    if (byConcertId.has(review.eventId)) continue;
    if (getReviewYear(review) !== year) continue;
    const date = (review.eventDate ?? review.createdAt).slice(0, 10);
    const entry: YearEndEntry = {
      concertId: review.eventId,
      artistName: review.artistName,
      venueName: review.venueName,
      date,
      imageUrl: review.photoDataUrls?.[0],
      review,
    };
    upsertByKey(byConcertId, review.eventId, entry);
  }

  // Collapse same artist (normalized) + same calendar date across catalog/manual ids.
  const byArtistDate = new Map<string, YearEndEntry>();
  for (const entry of byConcertId.values()) {
    upsertByKey(byArtistDate, artistDateKey(entry.artistName, entry.date), entry);
  }

  return [...byArtistDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Group by normalized key; display the most frequent original spelling.
 */
export function rankCountsNormalized(
  values: string[],
  limit: number
): { name: string; count: number }[] {
  const byKey = new Map<string, { count: number; spellings: Map<string, number> }>();

  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = normalizeLabelKey(trimmed);
    if (!key) continue;
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = { count: 0, spellings: new Map() };
      byKey.set(key, bucket);
    }
    bucket.count += 1;
    bucket.spellings.set(trimmed, (bucket.spellings.get(trimmed) ?? 0) + 1);
  }

  return [...byKey.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([, bucket]) => {
      const name = [...bucket.spellings.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
      )[0][0];
      return { name, count: bucket.count };
    });
}

function uniqueCount(values: string[]): number {
  const set = new Set<string>();
  for (const raw of values) {
    const v = normalizeLabelKey(raw);
    if (v) set.add(v);
  }
  return set.size;
}

export function getYearEndStats(entries: YearEndEntry[], year: number): YearEndStats {
  const reviews = entries.map((e) => e.review).filter((r): r is ConcertReview => Boolean(r));

  const ratings = reviews
    .map((r) => r.overallRating)
    .filter((n): n is number => typeof n === 'number' && n > 0);
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
      : undefined;

  const topArtists = rankCountsNormalized(
    entries.map((e) => e.artistName).filter(Boolean),
    5
  );
  const topVenues = rankCountsNormalized(
    entries.map((e) => e.venueName).filter((v): v is string => Boolean(v)),
    5
  );
  const topTags = rankCountsNormalized(
    reviews.flatMap((r) => r.tags ?? []),
    6
  ).map(({ name, count }) => ({ tag: name, count }));

  const favoriteSongs = [
    ...new Set(
      reviews
        .map((r) => r.favoriteSong?.trim())
        .filter((s): s is string => Boolean(s))
    ),
  ].slice(0, 8);

  const photos = reviews.flatMap((r) => r.photoDataUrls ?? []);
  const totalPhotos = photos.length;
  const totalShows = entries.length;

  const monthCounts = new Map<number, number>();
  for (const entry of entries) {
    const day = entry.date.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const month = Number(day.slice(5, 7)) - 1;
    if (month < 0 || month > 11) continue;
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }
  let busiestMonth: YearEndStats['busiestMonth'];
  if (monthCounts.size > 0) {
    const [month, count] = [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    busiestMonth = { month, label: MONTH_LABELS[month], count };
  }

  return {
    year,
    totalShows,
    totalConcerts: totalShows,
    uniqueArtists: uniqueCount(entries.map((e) => e.artistName)),
    uniqueVenues: uniqueCount(entries.map((e) => e.venueName ?? '')),
    uniqueCities: uniqueCount(entries.map((e) => e.city ?? '')),
    topArtists,
    topVenues,
    firstShow: entries[0],
    lastShow: entries.length > 0 ? entries[entries.length - 1] : undefined,
    mostSeenArtist: topArtists[0],
    busiestMonth,
    averageRating,
    topTags,
    favoriteSongs,
    totalPhotos,
    photos,
  };
}
