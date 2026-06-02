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

export type RecommendationReason = {
  type:
    | 'same_artist'
    | 'same_genre'
    | 'same_subgenre'
    | 'similar_to_attended'
    | 'high_rating_match'
    | 'nearby'
    | 'soon';
  label: string;
};

export type RecommendedConcert = Concert & {
  recommendationScore: number;
  recommendationReasons: RecommendationReason[];
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

function topMatchLabel(
  map: Record<string, number>,
  key: string | undefined
): { score: number; display?: string } {
  const k = normKey(key);
  if (!k) return { score: 0 };
  const score = map[k] ?? 0;
  if (score <= 0) return { score: 0 };
  const display =
    Object.entries(map).find(([name]) => normKey(name) === k)?.[0] ?? key;
  return { score, display };
}

function pickTopReason(
  reasons: RecommendationReason[],
  limit = 2
): RecommendationReason[] {
  const priority: RecommendationReason['type'][] = [
    'same_artist',
    'high_rating_match',
    'same_subgenre',
    'same_genre',
    'similar_to_attended',
    'soon',
    'nearby',
  ];
  const sorted = [...reasons].sort(
    (a, b) => priority.indexOf(a.type) - priority.indexOf(b.type)
  );
  const seen = new Set<string>();
  const out: RecommendationReason[] = [];
  for (const r of sorted) {
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export function scoreConcertForUser(
  candidate: Concert,
  profile: UserTasteProfile
): RecommendedConcert {
  const reasons: RecommendationReason[] = [];
  let score = 0;

  const artistKey = normKey(candidate.artistName);

  if (profile.attendedConcertIds.has(candidate.id)) {
    return {
      ...candidate,
      recommendationScore: -100,
      recommendationReasons: [],
    };
  }

  const artistMatch = topMatchLabel(profile.topArtists, candidate.artistName);
  if (artistMatch.score > 0) {
    score += 50 * Math.min(artistMatch.score, 3);
    reasons.push({
      type: 'same_artist',
      label: `Because you saw ${artistMatch.display ?? candidate.artistName}`,
    });
  }

  const subMatch = topMatchLabel(profile.topSubGenres, candidate.subGenreName);
  if (subMatch.score > 0 && candidate.subGenreName) {
    score += 30 * Math.min(subMatch.score, 2.5);
    reasons.push({
      type: 'same_subgenre',
      label: `More ${candidate.subGenreName} near you`,
    });
  }

  const genreMatch = topMatchLabel(profile.topGenres, candidate.genreName);
  if (genreMatch.score > 0 && candidate.genreName) {
    score += 20 * Math.min(genreMatch.score, 2.5);
    reasons.push({
      type: 'same_genre',
      label: `More ${candidate.genreName} near you`,
    });
  }

  const venueMatch = topMatchLabel(profile.topVenues, candidate.venueName);
  if (venueMatch.score > 0 && candidate.venueName) {
    score += 8 * Math.min(venueMatch.score, 2);
    reasons.push({
      type: 'similar_to_attended',
      label: `You go to a lot of shows at ${venueMatch.display ?? candidate.venueName}`,
    });
  }

  const cityMatch = topMatchLabel(profile.topCities, candidate.city);
  if (cityMatch.score > 0) {
    score += 5 * Math.min(cityMatch.score, 2);
    reasons.push({
      type: 'nearby',
      label: `More shows in ${cityMatch.display ?? candidate.city}`,
    });
  }

  if (
    profile.averageRating != null &&
    profile.averageRating >= 8 &&
    (genreMatch.score > 0 || subMatch.score > 0 || artistMatch.score > 0)
  ) {
    score += 10;
    reasons.push({
      type: 'high_rating_match',
      label: 'Similar to your top-rated concerts',
    });
  }

  if (candidate.imageUrl) {
    score += 3;
  }

  const today = new Date().toISOString().slice(0, 10);
  if (candidate.date > today) {
    score += 3;
    reasons.push({ type: 'soon', label: 'Coming up soon' });
  }

  if (artistKey && profile.upcomingArtistKeys.has(artistKey)) {
    score -= 10;
  }

  return {
    ...candidate,
    recommendationScore: score,
    recommendationReasons: pickTopReason(reasons),
  };
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
