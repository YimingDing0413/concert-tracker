import type { Concert, UserConcert } from '../../../shared/types/index.js';
import type {
  SpotifyConcertRecommendation,
  SpotifyRecommendationScoreBreakdown,
  SpotifyTasteProfile,
} from '../../../shared/types/spotify.js';
import {
  allowsExactArtistMatch,
  isNonArtistPerformance,
  normalizeArtistName,
} from './artistMatching.js';
import {
  buildSpotifyBucketWeights,
  scoreGenreMatch,
} from './genreMapping.js';

export { isNonArtistPerformance, normalizeArtistName };

/** Include upcoming shows through ~6 months out. */
export const RECOMMENDATION_HORIZON_DAYS = 183;

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
  excludedNoListeningCount: number;
  excludedOutsideWindowCount: number;
  excludedLowQualityCount: number;
  scoredCount: number;
}

function topArtistNames(
  profile: SpotifyTasteProfile,
  artistWeights: Record<string, number>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const artist of profile.topArtists) {
    const key = normalizeArtistName(artist.name);
    if (key && !map.has(key) && (artistWeights[key] ?? 0) > 0) {
      map.set(key, artist.name);
    }
  }
  return map;
}

function trackArtistNames(
  profile: SpotifyTasteProfile,
  artistWeights: Record<string, number>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const track of profile.topTracks) {
    for (const name of track.artistNames) {
      const key = normalizeArtistName(name);
      if (key && !map.has(key) && (artistWeights[key] ?? 0) > 0) {
        map.set(key, name);
      }
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
  if (days < 0 || days > RECOMMENDATION_HORIZON_DAYS) return 0;
  if (days <= 14) return 6;
  if (days <= 30) return 5;
  if (days <= 60) return 4;
  if (days <= 90) return 3;
  if (days <= 120) return 2;
  return 1;
}

function listeningWeightForArtist(
  artistWeights: Record<string, number>,
  matchedName: string
): number {
  return artistWeights[normalizeArtistName(matchedName)] ?? 0;
}

/** Primary rank signal: how much the user listens to the matched artist on Spotify. */
function scoreListeningWeight(weight: number): number {
  return Math.min(150, Math.round(weight * 0.75));
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
  listeningWeight: number;
  scoreBreakdown?: SpotifyRecommendationScoreBreakdown;
};

interface ArtistMatchResult {
  matchedName: string;
  isTopArtist: boolean;
  isTrackArtist: boolean;
}

/** Only match when the concert headliner name exactly equals a listened Spotify artist. */
function findExactListenedArtistMatch(
  concert: Concert,
  artistWeights: Record<string, number>,
  topArtists: Map<string, string>,
  trackArtists: Map<string, string>
): ArtistMatchResult | null {
  const normConcert = normalizeArtistName(concert.artistName ?? '');
  if (!normConcert) return null;

  const listeningWeight = artistWeights[normConcert] ?? 0;
  if (listeningWeight <= 0) return null;
  if (!allowsExactArtistMatch(concert, normConcert)) return null;

  const inTop = topArtists.has(normConcert);
  const inTracks = trackArtists.has(normConcert);
  if (!inTop && !inTracks) return null;

  const matchedName = topArtists.get(normConcert) ?? trackArtists.get(normConcert)!;

  return {
    matchedName,
    isTopArtist: inTop,
    isTrackArtist: inTracks && !inTop,
  };
}

function assignConfidence(input: {
  artistMatch: ArtistMatchResult | null;
  listeningWeight: number;
}): 'high' | 'medium' | 'low' {
  const { artistMatch, listeningWeight } = input;
  if (!artistMatch || listeningWeight <= 0) return 'low';
  if (artistMatch.isTopArtist || listeningWeight >= 40) return 'high';
  if (listeningWeight >= 15) return 'medium';
  return 'medium';
}

function pickPrimaryReason(input: {
  artistMatch: ArtistMatchResult;
  listeningWeight: number;
}): string {
  const { artistMatch, listeningWeight } = input;

  if (listeningWeight >= 60) {
    return `You've been listening to ${artistMatch.matchedName} a lot on Spotify`;
  }
  return `You've been listening to ${artistMatch.matchedName} on Spotify`;
}

function selectWithDiversity(scored: ScoredCandidate[], limit: number): ScoredCandidate[] {
  const sorted = [...scored].sort(
    (a, b) =>
      b.listeningWeight - a.listeningWeight ||
      b.spotifyScore - a.spotifyScore ||
      a.date.localeCompare(b.date)
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
  const artistWeights = spotifyTasteProfile.artistWeights ?? {};
  const topArtists = topArtistNames(spotifyTasteProfile, artistWeights);
  const trackArtists = trackArtistNames(spotifyTasteProfile, artistWeights);
  const spotifyBucketWeights = buildSpotifyBucketWeights(spotifyTasteProfile.genreWeights);

  const scored: ScoredCandidate[] = [];
  let excludedAlreadyAttendedCount = 0;
  let excludedSavedGoingCount = 0;
  let excludedNoListeningCount = 0;
  let excludedOutsideWindowCount = 0;
  let excludedLowQualityCount = 0;

  for (const concert of candidates) {
    if (concert.status === 'past') continue;

    const days = daysUntil(concert.date);
    if (days > RECOMMENDATION_HORIZON_DAYS) {
      excludedOutsideWindowCount += 1;
      continue;
    }
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
    const artistMatch = findExactListenedArtistMatch(
      concert,
      artistWeights,
      topArtists,
      trackArtists
    );

    if (!artistMatch) {
      excludedNoListeningCount += 1;
      continue;
    }

    const listeningWeight = listeningWeightForArtist(artistWeights, artistMatch.matchedName);
    if (listeningWeight <= 0 || normArtist !== normalizeArtistName(artistMatch.matchedName)) {
      excludedNoListeningCount += 1;
      continue;
    }

    const breakdown: SpotifyRecommendationScoreBreakdown = {};
    let score = 0;

    breakdown.listeningWeight = scoreListeningWeight(listeningWeight);
    score += breakdown.listeningWeight;

    if (artistMatch.isTopArtist) {
      breakdown.exactTopArtist = 25;
      score += 25;
    } else if (artistMatch.isTrackArtist) {
      breakdown.topTrackArtist = 15;
      score += 15;
    }

    const genreMatch = scoreGenreMatch(
      spotifyBucketWeights,
      concert.genreName,
      concert.subGenreName
    );
    if (genreMatch.genreScore > 0) {
      breakdown.genre = Math.min(6, Math.round(genreMatch.genreScore / 3));
      score += breakdown.genre;
    }
    if (genreMatch.subgenreScore > 0) {
      breakdown.subgenre = Math.min(4, Math.round(genreMatch.subgenreScore / 4));
      score += breakdown.subgenre;
    }

    if (userConcertHistory.highRatedArtistKeys.has(normArtist)) {
      breakdown.encoreHistory = 10;
      score += 10;
    }

    if (userConcertHistory.attendedArtistKeys.has(normArtist)) {
      breakdown.attendedArtist = 8;
      score += 8;
    }

    if (concert.imageUrl) {
      breakdown.image = 2;
      score += 2;
    }

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

    const confidence = assignConfidence({ artistMatch, listeningWeight });

    if (confidence === 'low') {
      excludedLowQualityCount += 1;
      continue;
    }

    const reason = pickPrimaryReason({ artistMatch, listeningWeight });

    const rec: ScoredCandidate = {
      listeningWeight,
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
          excludedNoListeningCount,
          excludedOutsideWindowCount,
          excludedLowQualityCount,
          scoredCount: scored.length,
        }
      : undefined,
  };
}
