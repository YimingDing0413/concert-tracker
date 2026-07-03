import type { Concert, UserConcert } from '../../../shared/types/index.js';
import type {
  SpotifyConcertRecommendation,
  SpotifyRecommendationScoreBreakdown,
  SpotifyTasteProfile,
} from '../../../shared/types/spotify.js';
import {
  allowsExactArtistMatch,
  isNonArtistPerformance,
  matchSpotifyArtist,
  normalizeArtistName,
  type ArtistMatchKind,
} from './artistMatching.js';
import {
  bucketDisplayLabel,
  buildSpotifyBucketWeights,
  scoreGenreMatch,
} from './genreMapping.js';

export { isNonArtistPerformance, normalizeArtistName };

export type UserConcertHistory = {
  attendedConcertIds: Set<string>;
  savedConcertIds: Set<string>;
  goingConcertIds: Set<string>;
  attendedArtistKeys: Set<string>;
  /** Artists the user rated highly on Encore (overall >= 4). */
  highRatedArtistKeys: Set<string>;
};

export function buildUserConcertHistory(
  userConcerts: UserConcert[],
  reviews: Array<{ eventId: string; artistName?: string; overallRating?: number }> = []
): UserConcertHistory {
  const attendedConcertIds = new Set<string>();
  const savedConcertIds = new Set<string>();
  const goingConcertIds = new Set<string>();
  const attendedArtistKeys = new Set<string>();
  const highRatedArtistKeys = new Set<string>();

  for (const uc of userConcerts) {
    if (uc.status === 'attended') {
      attendedConcertIds.add(uc.concertId);
      const artist = uc.concertSnapshot?.artistName ?? uc.manualConcert?.artistName;
      if (artist) attendedArtistKeys.add(normalizeArtistName(artist));
    } else if (uc.status === 'saved') {
      savedConcertIds.add(uc.concertId);
    } else if (uc.status === 'going') {
      goingConcertIds.add(uc.concertId);
    }
  }

  for (const review of reviews) {
    const rating = review.overallRating ?? 0;
    if (rating >= 4 && review.artistName) {
      highRatedArtistKeys.add(normalizeArtistName(review.artistName));
    }
  }

  return {
    attendedConcertIds,
    savedConcertIds,
    goingConcertIds,
    attendedArtistKeys,
    highRatedArtistKeys,
  };
}

export interface SpotifyRecommendationDebugStats {
  excludedAlreadyAttendedCount: number;
  excludedSavedGoingCount: number;
  excludedLowQualityCount: number;
  scoredCount: number;
}

function topArtistNames(profile: SpotifyTasteProfile): Map<string, string> {
  const map = new Map<string, string>();
  for (const artist of profile.topArtists) {
    const key = normalizeArtistName(artist.name);
    if (key && !map.has(key)) map.set(key, artist.name);
  }
  return map;
}

function trackArtistNames(profile: SpotifyTasteProfile): Map<string, string> {
  const map = new Map<string, string>();
  for (const track of profile.topTracks) {
    for (const name of track.artistNames) {
      const key = normalizeArtistName(name);
      if (key && !map.has(key)) map.set(key, name);
    }
  }
  return map;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreDateUrgency(days: number): number {
  if (days < 0) return 0;
  if (days <= 14) return 8;
  if (days <= 30) return 6;
  if (days <= 60) return 4;
  if (days <= 90) return 2;
  return 0;
}

function scoreDistanceKm(distanceKm: number | null): number {
  if (distanceKm == null || Number.isNaN(distanceKm)) return 0;
  if (distanceKm <= 25) return 8;
  if (distanceKm <= 50) return 6;
  if (distanceKm <= 100) return 4;
  if (distanceKm <= 200) return 2;
  return 0;
}

type ScoredCandidate = SpotifyConcertRecommendation & {
  scoreBreakdown?: SpotifyRecommendationScoreBreakdown;
};

interface ArtistMatchResult {
  kind: ArtistMatchKind;
  matchedName: string;
  isTopArtist: boolean;
  isTrackArtist: boolean;
}

function findBestArtistMatch(
  concert: Concert,
  topArtists: Map<string, string>,
  trackArtists: Map<string, string>
): ArtistMatchResult | null {
  const normConcert = normalizeArtistName(concert.artistName ?? '');

  if (topArtists.has(normConcert) && allowsExactArtistMatch(concert, normConcert)) {
    return {
      kind: 'exact',
      matchedName: topArtists.get(normConcert)!,
      isTopArtist: true,
      isTrackArtist: false,
    };
  }

  if (trackArtists.has(normConcert) && allowsExactArtistMatch(concert, normConcert)) {
    return {
      kind: 'exact',
      matchedName: trackArtists.get(normConcert)!,
      isTopArtist: false,
      isTrackArtist: true,
    };
  }

  let best: ArtistMatchResult | null = null;
  const rank: Record<ArtistMatchKind, number> = {
    exact: 3,
    strong_token: 2,
    fuzzy: 1,
    none: 0,
  };

  for (const [, displayName] of topArtists) {
    const norm = normalizeArtistName(displayName);
    const kind = matchSpotifyArtist(concert, displayName, norm);
    if (kind === 'none') continue;
    const candidate: ArtistMatchResult = {
      kind,
      matchedName: displayName,
      isTopArtist: true,
      isTrackArtist: false,
    };
    if (!best || rank[kind] > rank[best.kind]) best = candidate;
  }

  if (!best || best.kind === 'fuzzy') {
    for (const [, displayName] of trackArtists) {
      const norm = normalizeArtistName(displayName);
      const kind = matchSpotifyArtist(concert, displayName, norm);
      if (kind === 'none') continue;
      const candidate: ArtistMatchResult = {
        kind,
        matchedName: displayName,
        isTopArtist: false,
        isTrackArtist: true,
      };
      if (!best || rank[kind] > rank[best.kind]) best = candidate;
    }
  }

  return best;
}

function assignConfidence(input: {
  artistMatch: ArtistMatchResult | null;
  genreScore: number;
  subgenreScore: number;
  totalScore: number;
}): 'high' | 'medium' | 'low' {
  const { artistMatch, genreScore, subgenreScore } = input;
  if (
    artistMatch &&
    artistMatch.kind === 'exact' &&
    (artistMatch.isTopArtist || artistMatch.isTrackArtist)
  ) {
    return 'high';
  }
  if (artistMatch && (artistMatch.kind === 'strong_token' || artistMatch.kind === 'fuzzy')) {
    return 'medium';
  }
  if (genreScore >= 15 || subgenreScore >= 18) return 'medium';
  return 'low';
}

function pickPrimaryReason(input: {
  artistMatch: ArtistMatchResult | null;
  genreBucketLabel?: string;
  highRatedArtistMatch: boolean;
}): string {
  const { artistMatch, genreBucketLabel, highRatedArtistMatch } = input;

  if (artistMatch?.isTopArtist && artistMatch.kind === 'exact') {
    return `Because ${artistMatch.matchedName} is one of your top Spotify artists`;
  }
  if (artistMatch?.isTrackArtist && artistMatch.kind === 'exact') {
    return 'A top-track artist is playing near you';
  }
  if (artistMatch && (artistMatch.kind === 'fuzzy' || artistMatch.kind === 'strong_token')) {
    return 'Based on your recent Spotify taste';
  }
  if (highRatedArtistMatch) {
    return 'Similar to artists you rated highly';
  }
  if (genreBucketLabel) {
    return `More ${genreBucketLabel} shows near you`;
  }
  return 'Based on your Spotify taste';
}

function selectWithDiversity(scored: ScoredCandidate[], limit: number): ScoredCandidate[] {
  const sorted = [...scored].sort(
    (a, b) => b.spotifyScore - a.spotifyScore || a.date.localeCompare(b.date)
  );

  const artistSeen = new Set<string>();
  const venueCounts = new Map<string, number>();
  const picked: ScoredCandidate[] = [];

  for (const rec of sorted) {
    const artistKey = normalizeArtistName(rec.artistName);
    const venueKey = rec.venueId || rec.venueName;
    if (artistSeen.has(artistKey)) continue;
    if ((venueCounts.get(venueKey) ?? 0) >= 2) continue;

    picked.push(rec);
    artistSeen.add(artistKey);
    venueCounts.set(venueKey, (venueCounts.get(venueKey) ?? 0) + 1);
    if (picked.length >= limit) break;
  }

  return picked;
}

export function getSpotifyConcertRecommendations(
  candidates: Concert[],
  spotifyTasteProfile: SpotifyTasteProfile,
  userConcertHistory: UserConcertHistory,
  limit = 6,
  options?: {
    userLatitude?: number;
    userLongitude?: number;
    includeDebug?: boolean;
  }
): {
  recommendations: SpotifyConcertRecommendation[];
  debugStats?: SpotifyRecommendationDebugStats;
} {
  const topArtists = topArtistNames(spotifyTasteProfile);
  const trackArtists = trackArtistNames(spotifyTasteProfile);
  const artistWeights = spotifyTasteProfile.artistWeights ?? {};
  const spotifyBucketWeights = buildSpotifyBucketWeights(spotifyTasteProfile.genreWeights);

  const scored: ScoredCandidate[] = [];
  let excludedAlreadyAttendedCount = 0;
  let excludedSavedGoingCount = 0;
  let excludedLowQualityCount = 0;

  for (const concert of candidates) {
    if (concert.status === 'past') continue;
    if (userConcertHistory.attendedConcertIds.has(concert.id)) {
      excludedAlreadyAttendedCount += 1;
      continue;
    }
    if (
      userConcertHistory.savedConcertIds.has(concert.id) ||
      userConcertHistory.goingConcertIds.has(concert.id)
    ) {
      excludedSavedGoingCount += 1;
      continue;
    }
    if (isNonArtistPerformance(concert.artistName ?? '', concert.title)) {
      excludedLowQualityCount += 1;
      continue;
    }

    const normArtist = normalizeArtistName(concert.artistName ?? '');
    const artistMatch = findBestArtistMatch(concert, topArtists, trackArtists);
    const breakdown: SpotifyRecommendationScoreBreakdown = {};

    let score = 0;
    let genreScore = 0;
    let subgenreScore = 0;
    let genreBucketLabel: string | undefined;

    if (artistMatch) {
      if (artistMatch.isTopArtist && artistMatch.kind === 'exact') {
        breakdown.exactTopArtist = 120;
        score += 120;
      } else if (artistMatch.isTrackArtist && artistMatch.kind === 'exact') {
        breakdown.topTrackArtist = 70;
        score += 70;
      } else if (artistMatch.kind === 'strong_token' || artistMatch.kind === 'fuzzy') {
        breakdown.fuzzyArtist = 35;
        score += 35;
      }
    }

    const weight = artistWeights[normArtist] ?? 0;
    if (weight > 0) {
      breakdown.artistWeight = Math.min(30, Math.round(weight / 10));
      score += breakdown.artistWeight;
    }

    const genreMatch = scoreGenreMatch(
      spotifyBucketWeights,
      concert.genreName,
      concert.subGenreName
    );
    if (genreMatch.genreScore > 0) {
      genreScore = genreMatch.genreScore;
      breakdown.genre = genreScore;
      score += genreScore;
      if (genreMatch.bucket) genreBucketLabel = bucketDisplayLabel(genreMatch.bucket);
    }
    if (genreMatch.subgenreScore > 0) {
      subgenreScore = genreMatch.subgenreScore;
      breakdown.subgenre = subgenreScore;
      score += subgenreScore;
      if (genreMatch.bucket && !genreBucketLabel) {
        genreBucketLabel = bucketDisplayLabel(genreMatch.bucket);
      }
    }

    const highRatedArtistMatch = userConcertHistory.highRatedArtistKeys.has(normArtist);
    if (highRatedArtistMatch) {
      breakdown.encoreHistory = 15;
      score += 15;
    }

    if (userConcertHistory.attendedArtistKeys.has(normArtist)) {
      breakdown.attendedArtist = 10;
      score += 10;
    }

    if (concert.imageUrl) {
      breakdown.image = 2;
      score += 2;
    }

    const days = daysUntil(concert.date);
    breakdown.dateUrgency = scoreDateUrgency(days);
    score += breakdown.dateUrgency;

    if (
      options?.userLatitude != null &&
      options?.userLongitude != null &&
      concert.venueLatitude != null &&
      concert.venueLongitude != null
    ) {
      const km = haversineKm(
        options.userLatitude,
        options.userLongitude,
        concert.venueLatitude,
        concert.venueLongitude
      );
      breakdown.distance = scoreDistanceKm(km);
      score += breakdown.distance;
    }

    const confidence = assignConfidence({
      artistMatch,
      genreScore,
      subgenreScore,
      totalScore: score,
    });

    if (score < 35 || confidence === 'low') {
      excludedLowQualityCount += 1;
      continue;
    }

    if (!artistMatch && genreScore + subgenreScore < 10) {
      excludedLowQualityCount += 1;
      continue;
    }

    const reason = pickPrimaryReason({
      artistMatch,
      genreBucketLabel,
      highRatedArtistMatch,
    });

    const rec: ScoredCandidate = {
      id: concert.id,
      artistId: concert.artistId,
      artistName: concert.artistName,
      venueId: concert.venueId,
      venueName: concert.venueName,
      city: concert.city,
      state: concert.state,
      country: concert.country,
      date: concert.date,
      startTime: concert.startTime,
      status: concert.status,
      ticketUrl: concert.ticketUrl,
      imageUrl: concert.imageUrl,
      genreName: concert.genreName,
      subGenreName: concert.subGenreName,
      segmentName: concert.segmentName,
      venueLatitude: concert.venueLatitude,
      venueLongitude: concert.venueLongitude,
      spotifyScore: score,
      confidence,
      reasons: [reason],
      matchedSpotifyArtists: artistMatch ? [artistMatch.matchedName] : [],
      alreadySaved: false,
      alreadyGoing: false,
    };

    if (options?.includeDebug) {
      rec.scoreBreakdown = breakdown;
    }

    scored.push(rec);
  }

  const recommendations = selectWithDiversity(scored, limit);

  return {
    recommendations,
    debugStats: options?.includeDebug
      ? {
          excludedAlreadyAttendedCount,
          excludedSavedGoingCount,
          excludedLowQualityCount,
          scoredCount: scored.length,
        }
      : undefined,
  };
}
