import type { Concert } from '@/types';

/** Normalized past interaction used for taste profiling (client-side MVP). */
export type ConcertHistoryEntry = {
  concertId: string;
  artistName: string;
  venueName?: string;
  city?: string;
  segmentName?: string;
  genreName?: string;
  subGenreName?: string;
  eventDate?: string;
  status?: 'going' | 'attended' | 'saved';
  overallRating?: number;
  tags?: string[];
};

export type UserTasteProfile = {
  topArtists: Record<string, number>;
  topGenres: Record<string, number>;
  topSubGenres: Record<string, number>;
  topVenues: Record<string, number>;
  topCities: Record<string, number>;
  averageRating?: number;
  /** Artists the user is already tracking as going/saved (for duplicate penalty). */
  upcomingArtistKeys: Set<string>;
  /** Concert ids already attended (hard exclude). */
  attendedConcertIds: Set<string>;
};

export type RecommendedConcert = Concert & {
  recommendationScore: number;
};

function normKey(value?: string): string {
  return (value ?? '').trim().toLowerCase();
}

function ratingWeight(rating?: number): number {
  if (rating == null || rating <= 0) return 1;
  const base = rating / 10;
  if (rating <= 4) return base * 0.25;
  if (rating >= 8) return base * 1.35;
  return base;
}

function statusWeight(status?: ConcertHistoryEntry['status']): number {
  switch (status) {
    case 'attended':
      return 1;
    case 'saved':
      return 0.75;
    case 'going':
      return 0.5;
    default:
      return 0.9;
  }
}

function addWeighted(
  map: Record<string, number>,
  key: string | undefined,
  delta: number
): void {
  const k = normKey(key);
  if (!k) return;
  map[k] = (map[k] ?? 0) + delta;
}

function tasteMatchScore(
  map: Record<string, number>,
  key: string | undefined
): number {
  const k = normKey(key);
  if (!k) return 0;
  return map[k] ?? 0;
}

export function tasteProfileHasSignals(profile: UserTasteProfile): boolean {
  return (
    Object.keys(profile.topArtists).length > 0 ||
    Object.keys(profile.topGenres).length > 0 ||
    Object.keys(profile.topSubGenres).length > 0
  );
}

export function buildUserTasteProfile(history: ConcertHistoryEntry[]): UserTasteProfile {
  const topArtists: Record<string, number> = {};
  const topGenres: Record<string, number> = {};
  const topSubGenres: Record<string, number> = {};
  const topVenues: Record<string, number> = {};
  const topCities: Record<string, number> = {};
  const upcomingArtistKeys = new Set<string>();
  const attendedConcertIds = new Set<string>();

  let ratingSum = 0;
  let ratingCount = 0;

  for (const entry of history) {
    const w = ratingWeight(entry.overallRating) * statusWeight(entry.status);

    if (entry.status === 'going' || entry.status === 'saved') {
      const artistKey = normKey(entry.artistName);
      if (artistKey) upcomingArtistKeys.add(artistKey);
    }
    if (entry.status === 'attended') {
      attendedConcertIds.add(entry.concertId);
    }

    addWeighted(topArtists, entry.artistName, w);
    addWeighted(topGenres, entry.genreName, w);
    addWeighted(topSubGenres, entry.subGenreName, w);
    addWeighted(topVenues, entry.venueName, w);
    addWeighted(topCities, entry.city, w);

    if (entry.overallRating != null && entry.overallRating > 0) {
      ratingSum += entry.overallRating;
      ratingCount += 1;
    }
  }

  return {
    topArtists,
    topGenres,
    topSubGenres,
    topVenues,
    topCities,
    averageRating: ratingCount > 0 ? ratingSum / ratingCount : undefined,
    upcomingArtistKeys,
    attendedConcertIds,
  };
}

export function scoreConcertForUser(
  candidate: Concert,
  profile: UserTasteProfile
): RecommendedConcert {
  let score = 0;
  const artistKey = normKey(candidate.artistName);

  if (profile.attendedConcertIds.has(candidate.id)) {
    return { ...candidate, recommendationScore: -100 };
  }

  const artistMatch = tasteMatchScore(profile.topArtists, candidate.artistName);
  if (artistMatch > 0) {
    score += 50 * Math.min(artistMatch, 3);
  }

  const subMatch = tasteMatchScore(profile.topSubGenres, candidate.subGenreName);
  if (subMatch > 0 && candidate.subGenreName) {
    score += 30 * Math.min(subMatch, 2.5);
  }

  const genreMatch = tasteMatchScore(profile.topGenres, candidate.genreName);
  if (genreMatch > 0 && candidate.genreName) {
    score += 20 * Math.min(genreMatch, 2.5);
  }

  const venueMatch = tasteMatchScore(profile.topVenues, candidate.venueName);
  if (venueMatch > 0 && candidate.venueName) {
    score += 8 * Math.min(venueMatch, 2);
  }

  const cityMatch = tasteMatchScore(profile.topCities, candidate.city);
  if (cityMatch > 0) {
    score += 5 * Math.min(cityMatch, 2);
  }

  if (
    profile.averageRating != null &&
    profile.averageRating >= 8 &&
    (genreMatch > 0 || subMatch > 0 || artistMatch > 0)
  ) {
    score += 10;
  }

  if (candidate.imageUrl) {
    score += 3;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (candidate.date > today) {
    score += 3;
  }

  if (artistKey && profile.upcomingArtistKeys.has(artistKey)) {
    score -= 10;
  }

  return { ...candidate, recommendationScore: score };
}

export function getRecommendedConcerts(
  candidates: Concert[],
  history: ConcertHistoryEntry[],
  limit = 6
): RecommendedConcert[] {
  const profile = buildUserTasteProfile(history);
  if (!tasteProfileHasSignals(profile)) {
    return [];
  }

  const scored = candidates
    .map((c) => scoreConcertForUser(c, profile))
    .filter((c) => c.recommendationScore > 0)
    .sort((a, b) => {
      if (b.recommendationScore !== a.recommendationScore) {
        return b.recommendationScore - a.recommendationScore;
      }
      return a.date.localeCompare(b.date);
    });

  return scored.slice(0, limit);
}
