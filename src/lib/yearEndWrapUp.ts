import { getAllConcertReviews } from '@/lib/concertReviewsLocal';
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

/** All locally saved reviews for the given user whose year matches `year`. */
export function getReviewsForYear(userId: string, year: number): ConcertReview[] {
  return getAllConcertReviews(userId).filter((review) => getReviewYear(review) === year);
}

/** Flattened photo data URLs from every review in the given year. */
export function getPhotosForYear(userId: string, year: number): string[] {
  return getReviewsForYear(userId, year).flatMap((review) => review.photoDataUrls ?? []);
}

/** Distinct years that have at least one review, most recent first. */
export function getYearsWithReviews(userId: string): number[] {
  const years = new Set<number>();
  for (const review of getAllConcertReviews(userId)) {
    const year = getReviewYear(review);
    if (year != null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
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
 * Legacy reviews with no matching UserConcert are included (deduped by eventId).
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

  const entries: YearEndEntry[] = [];
  const seen = new Set<string>();

  for (const uc of userConcerts) {
    if (uc.status !== 'attended') continue;
    const concert = concertMap[uc.concertId];
    const resolved = resolveConcertForUserConcert(uc, concert);
    const date = resolveAttendedDate(uc, concert);
    if (entryDateYear(date) !== year) continue;

    const review = reviewsByEvent.get(uc.concertId);
    entries.push({
      concertId: uc.concertId,
      artistName: resolved.artistName ?? review?.artistName ?? 'Unknown artist',
      venueName: resolved.venueName || review?.venueName,
      city: resolved.city,
      date,
      imageUrl: resolved.imageUrl ?? review?.photoDataUrls?.[0],
      review,
    });
    seen.add(uc.concertId);
  }

  for (const review of reviews) {
    if (seen.has(review.eventId)) continue;
    if (getReviewYear(review) !== year) continue;
    const date = (review.eventDate ?? review.createdAt).slice(0, 10);
    entries.push({
      concertId: review.eventId,
      artistName: review.artistName,
      venueName: review.venueName,
      date,
      imageUrl: review.photoDataUrls?.[0],
      review,
    });
    seen.add(review.eventId);
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function rankCounts(values: string[], limit: number): { name: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function uniqueCount(values: string[]): number {
  const set = new Set<string>();
  for (const raw of values) {
    const v = raw.trim().toLowerCase();
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

  const topArtists = rankCounts(
    entries.map((e) => e.artistName).filter(Boolean),
    5
  );
  const topVenues = rankCounts(
    entries.map((e) => e.venueName).filter((v): v is string => Boolean(v)),
    5
  );
  const topTags = rankCounts(
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
