import type { Concert, UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { averageOverallRating, formatOverallRating } from '@/utils/format';

/** Profile stats only — no favorite artist or venue calculations. */
export interface ProfileActivityStats {
  concerts: number;
  attended: number;
  going: number;
  reviews: number;
  wrapUps: number;
  concertsThisYear: number;
  avgRating: number | null;
  avgRatingDisplay: string;
}

export function getConcertYear(concert: Partial<Concert>, uc: UserConcert): number | null {
  const raw = concert.date ?? uc.concertSnapshot?.date ?? uc.manualConcert?.date;
  if (!raw) return null;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return null;
  return new Date(t).getFullYear();
}

export function countConcertsThisYear(
  userConcerts: UserConcert[],
  concertMap: Record<string, Partial<Concert>>
): number {
  const year = new Date().getFullYear();
  return userConcerts.filter((uc) => {
    if (uc.status !== 'attended') return false;
    const y = getConcertYear(concertMap[uc.concertId] ?? {}, uc);
    return y === year;
  }).length;
}

export function buildProfileActivityStats(
  userConcerts: UserConcert[],
  concertMap: Record<string, Partial<Concert>>,
  reviews: ConcertReview[]
): ProfileActivityStats {
  const attended = userConcerts.filter((uc) => uc.status === 'attended').length;
  const going = userConcerts.filter((uc) => uc.status === 'going').length;
  const avg = averageOverallRating(reviews.map((r) => r.overallRating));

  return {
    concerts: attended + going,
    attended,
    going,
    reviews: reviews.length,
    wrapUps: reviews.length,
    concertsThisYear: countConcertsThisYear(userConcerts, concertMap),
    avgRating: avg,
    avgRatingDisplay: formatOverallRating(avg),
  };
}
