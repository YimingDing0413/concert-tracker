import { getAllUserConcerts } from '../../src/lib/db/concertRepository.js';
import { getConcertReviewsForUser } from '../../src/lib/db/concertReviewRepository.js';
import { getSpotifyTasteProfile } from '../../src/lib/db/spotifyRepository.js';
import {
  buildUserConcertHistory,
  getSpotifyConcertRecommendations,
} from '../../src/lib/recommendations/spotifyConcertRecommendations.js';
import type {
  SpotifyConcertRecommendation,
  SpotifyRecommendationsDebugMeta,
} from '../../shared/types/spotify.js';
import { buildSpotifyRecommendationCandidates } from './spotifyCandidateService.js';

export async function getSpotifyConcertRecommendationsForUser(payload: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  debug?: boolean;
}): Promise<{
  recommendations: SpotifyConcertRecommendation[];
  nearbyCount: number;
  hasTasteProfile: boolean;
  debug?: SpotifyRecommendationsDebugMeta;
}> {
  const { userId, latitude, longitude } = payload;
  const radiusKm = Math.min(100, Math.max(10, payload.radiusKm ?? 50));
  const limit = payload.limit ?? 6;

  const taste = await getSpotifyTasteProfile(userId);
  if (!taste || taste.topArtists.length === 0) {
    return { recommendations: [], nearbyCount: 0, hasTasteProfile: false };
  }

  const [candidatePool, userConcerts, reviews] = await Promise.all([
    buildSpotifyRecommendationCandidates({
      taste,
      latitude,
      longitude,
      radiusKm,
    }),
    getAllUserConcerts(userId),
    getConcertReviewsForUser(userId),
  ]);

  const history = buildUserConcertHistory(
    userConcerts,
    reviews.map((r) => ({
      eventId: r.eventId,
      artistName: typeof r.artistName === 'string' ? r.artistName : undefined,
      overallRating: typeof r.overallRating === 'number' ? r.overallRating : undefined,
    }))
  );

  const { recommendations, debugStats } = getSpotifyConcertRecommendations(
    candidatePool.candidates,
    taste,
    history,
    limit,
    {
      userLatitude: latitude,
      userLongitude: longitude,
      includeDebug: payload.debug,
    }
  );

  const result: {
    recommendations: SpotifyConcertRecommendation[];
    nearbyCount: number;
    hasTasteProfile: boolean;
    debug?: SpotifyRecommendationsDebugMeta;
  } = {
    recommendations,
    nearbyCount: candidatePool.candidates.length,
    hasTasteProfile: true,
  };

  if (payload.debug && debugStats) {
    result.debug = {
      candidateCount: candidatePool.candidates.length,
      nearbyCandidateCount: candidatePool.nearbyCandidateCount,
      artistSearchCandidateCount: candidatePool.artistSearchCandidateCount,
      excludedAlreadyAttendedCount: debugStats.excludedAlreadyAttendedCount,
      excludedSavedGoingCount: debugStats.excludedSavedGoingCount,
      excludedLowQualityCount: debugStats.excludedLowQualityCount,
      finalRecommendationCount: recommendations.length,
      topScore: recommendations[0]?.spotifyScore,
    };
  }

  return result;
}
