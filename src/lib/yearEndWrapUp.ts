import { getAllConcertReviews } from '@/lib/concertReviewsLocal';
import type { ConcertReview, YearEndStats } from '@/types/concertReview';

/**
 * The year a review belongs to. Prefers the concert's eventDate, falling back
 * to when the review was created if the event date is missing or unparseable.
 */
export function getReviewYear(review: ConcertReview): number | null {
  const fromEvent = parseYear(review.eventDate);
  if (fromEvent != null) return fromEvent;
  return parseYear(review.createdAt);
}

function parseYear(value?: string): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).getFullYear();
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

export function getYearEndStats(reviews: ConcertReview[], year: number): YearEndStats {
  const ratings = reviews.map((r) => r.overallRating).filter((n) => typeof n === 'number');
  const averageRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((sum, n) => sum + n, 0) / ratings.length) * 10) / 10
      : undefined;

  const topArtists = rankCounts(
    reviews.map((r) => r.artistName).filter(Boolean) as string[],
    5
  );
  const topVenues = rankCounts(
    reviews.map((r) => r.venueName).filter(Boolean) as string[],
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

  const totalPhotos = reviews.reduce((sum, r) => sum + (r.photoDataUrls?.length ?? 0), 0);

  return {
    year,
    totalConcerts: reviews.length,
    averageRating,
    topArtists,
    topVenues,
    topTags,
    favoriteSongs,
    totalPhotos,
  };
}
