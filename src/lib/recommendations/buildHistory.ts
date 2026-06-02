import type { Concert, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import type { ConcertHistoryEntry } from '@/lib/recommendations/concertRecommendations';

function snapshotFields(snap?: Partial<Concert>): Pick<
  ConcertHistoryEntry,
  'artistName' | 'venueName' | 'city' | 'segmentName' | 'genreName' | 'subGenreName' | 'eventDate'
> {
  if (!snap) {
    return { artistName: 'Unknown artist' };
  }
  return {
    artistName: snap.artistName?.trim() || 'Unknown artist',
    venueName: snap.venueName,
    city: snap.city,
    segmentName: snap.segmentName,
    genreName: snap.genreName,
    subGenreName: snap.subGenreName,
    eventDate: snap.date,
  };
}

/**
 * Merge user concerts + reviews into a single history list for taste profiling.
 * Reviews enrich attended/saved rows with ratings; standalone reviews are included too.
 */
export function buildConcertHistory(
  userConcerts: UserConcert[],
  reviews: ConcertReview[]
): ConcertHistoryEntry[] {
  const reviewByEvent = new Map<string, ConcertReview>();
  for (const r of reviews) {
    reviewByEvent.set(r.eventId, r);
  }

  const byConcertId = new Map<string, ConcertHistoryEntry>();

  for (const uc of userConcerts) {
    const snap = uc.concertSnapshot ?? uc.manualConcert;
    const review = reviewByEvent.get(uc.concertId);
    const fields = snapshotFields(snap);
    if (review?.artistName?.trim()) {
      fields.artistName = review.artistName.trim();
    }
    if (review?.venueName) fields.venueName = review.venueName;
    if (review?.eventDate) fields.eventDate = review.eventDate;

    byConcertId.set(uc.concertId, {
      concertId: uc.concertId,
      ...fields,
      status: uc.status,
      overallRating: review?.overallRating,
      tags: review?.tags,
    });
  }

  for (const review of reviews) {
    if (byConcertId.has(review.eventId)) continue;
    byConcertId.set(review.eventId, {
      concertId: review.eventId,
      artistName: review.artistName?.trim() || 'Unknown artist',
      venueName: review.venueName,
      eventDate: review.eventDate,
      status: 'attended',
      overallRating: review.overallRating,
      tags: review.tags,
    });
  }

  return [...byConcertId.values()];
}
