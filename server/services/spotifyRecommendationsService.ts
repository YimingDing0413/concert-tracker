import { getAllUserConcerts } from '../../src/lib/db/concertRepository.js';
import { getConcertReviewsForUser } from '../../src/lib/db/concertReviewRepository.js';
import { getSpotifyTasteProfile } from '../../src/lib/db/spotifyRepository.js';
import { normalizeArtistName } from '../../src/lib/recommendations/artistMatching.js';
import {
  buildUserConcertHistory,
  getSpotifyConcertRecommendations,
} from '../../src/lib/recommendations/spotifyConcertRecommendations.js';
import type {
  ArtistRecommendationDebug,
  SpotifyConcertRecommendation,
  SpotifyRecommendationsDebugMeta,
} from '../../shared/types/spotify.js';
import { buildSpotifyRecommendationCandidates } from './spotifyCandidateService.js';
import { searchTicketmasterEventsForSpotifyArtist } from './ticketmasterArtistLookup.js';
import { buildSpotifyArtistPool } from '../../src/lib/recommendations/spotifyArtistPool.js';

export async function getSpotifyConcertRecommendationsForUser(payload: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
  debug?: boolean;
  debugArtist?: string;
}): Promise<{
  recommendations: SpotifyConcertRecommendation[];
  totalAvailableRecommendationCount: number;
  hiddenCandidatesCount: number;
  nearbyCount: number;
  hasTasteProfile: boolean;
  debug?: SpotifyRecommendationsDebugMeta;
}> {
  const { userId, latitude, longitude } = payload;
  const radiusKm = Math.min(100, Math.max(10, payload.radiusKm ?? 50));
  const limit = payload.limit ?? 6;
  const debugArtistNormalized = payload.debugArtist
    ? normalizeArtistName(payload.debugArtist)
    : undefined;

  const taste = await getSpotifyTasteProfile(userId);
  if (!taste || taste.topArtists.length === 0) {
    return {
      recommendations: [],
      totalAvailableRecommendationCount: 0,
      hiddenCandidatesCount: 0,
      nearbyCount: 0,
      hasTasteProfile: false,
    };
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

  const {
    recommendations,
    totalAvailableRecommendationCount,
    hiddenCandidatesCount,
    debugStats,
  } = getSpotifyConcertRecommendations(
    candidatePool.candidates,
    taste,
    history,
    limit,
    {
      userLatitude: latitude,
      userLongitude: longitude,
      radiusKm,
      includeDebug: payload.debug || Boolean(debugArtistNormalized),
      artistDebug: candidatePool.artistDebug,
      debugArtistNormalized,
    }
  );

  if (debugArtistNormalized && (payload.debug || debugArtistNormalized)) {
    const poolEntry = buildSpotifyArtistPool(taste).find(
      (entry) => entry.normalizedName === debugArtistNormalized
    );
    if (poolEntry) {
      let traced = candidatePool.artistDebug.get(debugArtistNormalized);
      if (!traced) {
        traced = {
          spotifyArtistName: poolEntry.spotifyArtistName,
          normalizedName: poolEntry.normalizedName,
          artistWeight: poolEntry.artistWeight,
          recentlyPlayedWeight: poolEntry.recentlyPlayedWeight,
          sourceSignals: { ...poolEntry.sourceSignals },
          wasInTargetedSearchPool: false,
          excludedReasons: ['not_in_targeted_search_pool'],
        };
        candidatePool.artistDebug.set(debugArtistNormalized, traced);
      }

      if (!traced.wasInTargetedSearchPool) {
        const traceSearch = await searchTicketmasterEventsForSpotifyArtist({
          spotifyArtistName: poolEntry.spotifyArtistName,
          latitude,
          longitude,
          radiusKm,
          attractionCache: new Map(),
        });
        traced.ticketmasterAttractionFound = traceSearch.attractionFound;
        traced.ticketmasterAttractionId = traceSearch.attractionId;
        traced.ticketmasterEventsFound = traceSearch.eventsFound;
        if (!traceSearch.attractionFound) {
          traced.excludedReasons = [...(traced.excludedReasons ?? []), 'no_ticketmaster_attraction_match'];
        }
        if (traceSearch.eventsFound === 0) {
          traced.excludedReasons = [...(traced.excludedReasons ?? []), 'no_ticketmaster_events_found'];
        }
      }
    }
  }

  const result: {
    recommendations: SpotifyConcertRecommendation[];
    totalAvailableRecommendationCount: number;
    hiddenCandidatesCount: number;
    nearbyCount: number;
    hasTasteProfile: boolean;
    debug?: SpotifyRecommendationsDebugMeta;
  } = {
    recommendations,
    totalAvailableRecommendationCount,
    hiddenCandidatesCount,
    nearbyCount: candidatePool.candidates.length,
    hasTasteProfile: true,
  };

  if ((payload.debug || debugArtistNormalized) && debugStats) {
    const artistDebugList = [...debugStats.artistDebug.values()].sort(
      (a, b) => b.artistWeight - a.artistWeight || a.spotifyArtistName.localeCompare(b.spotifyArtistName)
    );

    result.debug = {
      spotifyTopArtistsCount: taste.topArtists.length,
      spotifyTopTracksCount: taste.topTracks.length,
      uniqueSpotifyArtistPoolCount: candidatePool.uniqueSpotifyArtistPoolCount,
      targetedArtistSearchCount: candidatePool.targetedArtistSearchCount,
      candidateCountBeforeFilters: debugStats.candidateCountBeforeFilters,
      candidateCountAfterFilters: debugStats.candidateCountAfterFilters,
      finalRecommendationCount: recommendations.length,
      totalAvailableRecommendationCount,
      hiddenCandidatesCount,
      excludedCountsByReason: debugStats.excludedCountsByReason,
      candidateCount: candidatePool.candidates.length,
      nearbyCandidateCount: candidatePool.nearbyCandidateCount,
      artistSearchCandidateCount: candidatePool.artistSearchCandidateCount,
      topScore: recommendations[0]?.spotifyScore,
      artistDebug: artistDebugList,
      tracedArtist: debugArtistNormalized
        ? debugStats.artistDebug.get(debugArtistNormalized) ??
          artistDebugList.find((entry) => entry.normalizedName === debugArtistNormalized)
        : undefined,
    };
  }

  return result;
}
