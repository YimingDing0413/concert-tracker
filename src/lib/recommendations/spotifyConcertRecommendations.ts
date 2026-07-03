import type { Concert, UserConcert } from '../../../shared/types/index.js';
import type {
  ArtistRecommendationDebug,
  SpotifyConcertRecommendation,
  SpotifyRecommendationScoreBreakdown,
  SpotifyTasteProfile,
} from '../../../shared/types/spotify.js';
import {
  findSpotifyArtistOnConcert,
  isNonArtistPerformance,
  normalizeArtistName,
  shouldExcludeAsNonPerformance,
  type SpotifyArtistMatchVia,
} from './artistMatching.js';
import { buildSpotifyBucketWeights, scoreGenreMatch } from './genreMapping.js';
import { getRecommendationWindowDays } from './config.js';
import {
  buildSpotifyArtistPool,
  type SpotifyArtistPoolEntry,
} from './spotifyArtistPool.js';

export { getRecommendationWindowDays, isNonArtistPerformance, normalizeArtistName };

export type UserConcertHistory = {
  attendedConcertIds: Set<string>;
  savedConcertIds: Set<string>;
  goingConcertIds: Set<string>;
  attendedArtistKeys: Set<string>;
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

export type ExclusionReason =
  | 'past_event'
  | 'outside_date_window'
  | 'already_attended'
  | 'already_saved_or_going'
  | 'non_performance'
  | 'no_listening_match'
  | 'outside_radius'
  | 'low_confidence';

export interface SpotifyRecommendationDebugStats {
  candidateCountBeforeFilters: number;
  candidateCountAfterFilters: number;
  excludedCountsByReason: Record<string, number>;
  artistDebug: Map<string, ArtistRecommendationDebug>;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreDateUrgency(days: number, windowDays: number): number {
  if (days < 0 || days > windowDays) return 0;
  if (days <= 14) return 6;
  if (days <= 30) return 5;
  if (days <= 60) return 4;
  if (days <= 90) return 3;
  if (days <= 120) return 2;
  return 1;
}

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

function combinedWeightForEntry(entry: SpotifyArtistPoolEntry): number {
  return entry.combinedWeight;
}

type ScoredCandidate = SpotifyConcertRecommendation & {
  combinedWeight: number;
  matchVia: SpotifyArtistMatchVia;
  distanceKm: number | null;
  scoreBreakdown?: SpotifyRecommendationScoreBreakdown;
};

interface ArtistMatchResult {
  entry: SpotifyArtistPoolEntry;
  matchedName: string;
  via: SpotifyArtistMatchVia;
  combinedWeight: number;
}

function findBestListenedArtistMatch(
  concert: Concert,
  artistPool: SpotifyArtistPoolEntry[]
): ArtistMatchResult | null {
  let best: ArtistMatchResult | null = null;

  for (const entry of artistPool) {
    const match = findSpotifyArtistOnConcert(
      concert,
      entry.normalizedName,
      entry.spotifyArtistName
    );
    if (!match) continue;

    const candidate: ArtistMatchResult = {
      entry,
      matchedName: entry.spotifyArtistName,
      via: match.via,
      combinedWeight: combinedWeightForEntry(entry),
    };

    if (
      !best ||
      candidate.combinedWeight > best.combinedWeight ||
      (candidate.combinedWeight === best.combinedWeight &&
        rankMatchVia(candidate.via) > rankMatchVia(best.via))
    ) {
      best = candidate;
    }
  }

  return best;
}

function rankMatchVia(via: SpotifyArtistMatchVia): number {
  if (via === 'headliner') return 3;
  if (via === 'attraction') return 2;
  if (via === 'opener') return 1;
  return 0;
}

function assignConfidence(input: {
  artistMatch: ArtistMatchResult;
}): 'high' | 'medium' | 'low' {
  const { artistMatch } = input;
  if (artistMatch.combinedWeight <= 0) return 'low';
  if (
    artistMatch.entry.sourceSignals.shortTermTopArtist ||
    artistMatch.combinedWeight >= 40 ||
    artistMatch.via === 'headliner'
  ) {
    return 'high';
  }
  return 'medium';
}

function pickPrimaryReason(input: {
  artistMatch: ArtistMatchResult;
}): string {
  const { artistMatch } = input;
  if (artistMatch.combinedWeight >= 60) {
    return `You've been listening to ${artistMatch.matchedName} a lot on Spotify`;
  }
  if (artistMatch.entry.sourceSignals.recentlyPlayedArtist) {
    return `You've been listening to ${artistMatch.matchedName} recently on Spotify`;
  }
  return `You've been listening to ${artistMatch.matchedName} on Spotify`;
}

function recordArtistExclusion(
  artistDebug: Map<string, ArtistRecommendationDebug>,
  normalizedName: string | undefined,
  reason: string
) {
  if (!normalizedName) return;
  const debug = artistDebug.get(normalizedName);
  if (!debug) return;
  if (!debug.excludedReasons?.includes(reason)) {
    debug.excludedReasons = [...(debug.excludedReasons ?? []), reason];
  }
}

function incrementExcluded(
  excludedCountsByReason: Record<string, number>,
  reason: ExclusionReason | string
) {
  excludedCountsByReason[reason] = (excludedCountsByReason[reason] ?? 0) + 1;
}

function sortRecommendations(scored: ScoredCandidate[]): ScoredCandidate[] {
  return [...scored].sort(
    (a, b) =>
      b.combinedWeight - a.combinedWeight ||
      rankMatchVia(b.matchVia) - rankMatchVia(a.matchVia) ||
      b.spotifyScore - a.spotifyScore ||
      a.date.localeCompare(b.date) ||
      (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
  );
}

export function getSpotifyConcertRecommendations(
  candidates: Concert[],
  spotifyTasteProfile: SpotifyTasteProfile,
  userConcertHistory: UserConcertHistory,
  limit = 6,
  options?: {
    userLatitude?: number;
    userLongitude?: number;
    radiusKm?: number;
    includeDebug?: boolean;
    artistDebug?: Map<string, ArtistRecommendationDebug>;
    debugArtistNormalized?: string;
  }
): {
  recommendations: SpotifyConcertRecommendation[];
  allRecommendations: SpotifyConcertRecommendation[];
  totalAvailableRecommendationCount: number;
  hiddenCandidatesCount: number;
  debugStats?: SpotifyRecommendationDebugStats;
} {
  const windowDays = getRecommendationWindowDays();
  const artistPool = buildSpotifyArtistPool(spotifyTasteProfile);
  const poolByNorm = new Map(artistPool.map((entry) => [entry.normalizedName, entry]));
  const spotifyBucketWeights = buildSpotifyBucketWeights(spotifyTasteProfile.genreWeights);
  const artistDebug = options?.artistDebug ?? new Map<string, ArtistRecommendationDebug>();
  const excludedCountsByReason: Record<string, number> = {};
  const scored: ScoredCandidate[] = [];

  for (const concert of candidates) {
    if (concert.status === 'past') {
      incrementExcluded(excludedCountsByReason, 'past_event');
      continue;
    }

    const days = daysUntil(concert.date);
    if (days > windowDays) {
      incrementExcluded(excludedCountsByReason, 'outside_date_window');
      for (const entry of artistPool) {
        const match = findSpotifyArtistOnConcert(
          concert,
          entry.normalizedName,
          entry.spotifyArtistName
        );
        if (match) recordArtistExclusion(artistDebug, entry.normalizedName, 'outside_date_window');
      }
      continue;
    }

    if (userConcertHistory.attendedConcertIds.has(concert.id)) {
      incrementExcluded(excludedCountsByReason, 'already_attended');
      continue;
    }
    if (
      userConcertHistory.savedConcertIds.has(concert.id) ||
      userConcertHistory.goingConcertIds.has(concert.id)
    ) {
      incrementExcluded(excludedCountsByReason, 'already_saved_or_going');
      continue;
    }

    const artistMatch = findBestListenedArtistMatch(concert, artistPool);
    if (!artistMatch || artistMatch.combinedWeight <= 0) {
      incrementExcluded(excludedCountsByReason, 'no_listening_match');
      continue;
    }

    if (shouldExcludeAsNonPerformance(concert, artistMatch.entry.normalizedName)) {
      incrementExcluded(excludedCountsByReason, 'non_performance');
      recordArtistExclusion(artistDebug, artistMatch.entry.normalizedName, 'filtered_as_non_performance');
      continue;
    }

    let distanceKm: number | null = null;
    if (
      options?.userLatitude != null &&
      options?.userLongitude != null &&
      concert.venueLatitude != null &&
      concert.venueLongitude != null
    ) {
      distanceKm = haversineKm(
        options.userLatitude,
        options.userLongitude,
        concert.venueLatitude,
        concert.venueLongitude
      );
      const maxRadius = options.radiusKm ?? 100;
      if (distanceKm > maxRadius) {
        incrementExcluded(excludedCountsByReason, 'outside_radius');
        recordArtistExclusion(artistDebug, artistMatch.entry.normalizedName, 'outside_radius');
        continue;
      }
    }

    const normArtist = normalizeArtistName(concert.artistName ?? '');
    const breakdown: SpotifyRecommendationScoreBreakdown = {};
    let score = 0;

    breakdown.listeningWeight = scoreListeningWeight(artistMatch.entry.artistWeight);
    score += breakdown.listeningWeight;
    if (artistMatch.entry.recentlyPlayedWeight > 0) {
      breakdown.recentlyPlayedWeight = Math.min(
        80,
        Math.round(artistMatch.entry.recentlyPlayedWeight * 0.9)
      );
      score += breakdown.recentlyPlayedWeight;
    }

    if (artistMatch.entry.sourceSignals.shortTermTopArtist) {
      breakdown.exactTopArtist = 25;
      score += 25;
    } else if (artistMatch.entry.sourceSignals.topTrackArtist) {
      breakdown.topTrackArtist = 15;
      score += 15;
    }

    if (artistMatch.via === 'headliner') {
      breakdown.attractionMatch = 20;
      score += 20;
    } else if (artistMatch.via === 'attraction') {
      breakdown.attractionMatch = 12;
      score += 12;
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

    breakdown.dateUrgency = scoreDateUrgency(days, windowDays);
    score += breakdown.dateUrgency;
    if (distanceKm != null) {
      breakdown.distance = scoreDistanceKm(distanceKm);
      score += breakdown.distance;
    }

    const confidence = assignConfidence({ artistMatch });
    if (confidence === 'low') {
      incrementExcluded(excludedCountsByReason, 'low_confidence');
      recordArtistExclusion(artistDebug, artistMatch.entry.normalizedName, 'low_confidence');
      continue;
    }

    const reason = pickPrimaryReason({ artistMatch });
    const rec: ScoredCandidate = {
      combinedWeight: artistMatch.combinedWeight,
      matchVia: artistMatch.via,
      distanceKm,
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
      matchedSpotifyArtists: [artistMatch.matchedName],
      alreadySaved: false,
      alreadyGoing: false,
    };

    if (options?.includeDebug) rec.scoreBreakdown = breakdown;
    scored.push(rec);

    const debug = artistDebug.get(artistMatch.entry.normalizedName);
    if (debug) {
      debug.finalRecommendationsForArtist = (debug.finalRecommendationsForArtist ?? 0) + 1;
    }
  }

  const sorted = sortRecommendations(scored);
  const allRecommendations = sorted.map(({ combinedWeight, matchVia, distanceKm, ...rec }) => rec);
  const recommendations = allRecommendations.slice(0, limit);
  const totalAvailableRecommendationCount = allRecommendations.length;
  const hiddenCandidatesCount = Math.max(0, totalAvailableRecommendationCount - recommendations.length);

  if (options?.debugArtistNormalized && !poolByNorm.has(options.debugArtistNormalized)) {
    artistDebug.set(options.debugArtistNormalized, {
      spotifyArtistName: options.debugArtistNormalized,
      normalizedName: options.debugArtistNormalized,
      artistWeight: 0,
      sourceSignals: {},
      wasInTargetedSearchPool: false,
      excludedReasons: ['not_in_spotify_taste_profile'],
    });
  }

  return {
    recommendations,
    allRecommendations,
    totalAvailableRecommendationCount,
    hiddenCandidatesCount,
    debugStats: options?.includeDebug
      ? {
          candidateCountBeforeFilters: candidates.length,
          candidateCountAfterFilters: scored.length,
          excludedCountsByReason,
          artistDebug,
        }
      : undefined,
  };
}
