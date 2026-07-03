import { Router } from 'express';
import { requireAuth } from '../lib/requireAuth.js';
import { requireDynamo } from '../lib/requireDynamo.js';
import { getSpotifyConcertRecommendationsForUser } from '../services/spotifyRecommendationsService.js';
import { getSpotifyConnectionStatus } from '../../src/lib/db/spotifyRepository.js';

export const recommendationsRouter = Router();

recommendationsRouter.get('/spotify-concerts', requireAuth, requireDynamo, async (req, res) => {
  try {
    const lat = Number(req.query.lat ?? req.query.latitude);
    const lng = Number(req.query.lng ?? req.query.longitude ?? req.query.lon);
    const radius = Number(req.query.radius ?? req.query.radiusKm ?? 50);
    const limitRaw = Number(req.query.limit ?? 6);
    const limit = Math.min(24, Math.max(1, Number.isNaN(limitRaw) ? 6 : limitRaw));
    const debug = req.query.debug === 'true' || req.query.debug === '1';
    const debugArtist =
      typeof req.query.debugArtist === 'string' ? req.query.debugArtist.trim() : undefined;

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required.' });
      return;
    }

    const userId = req.authUser!.userId;
    const status = await getSpotifyConnectionStatus(userId);

    if (!status.connected) {
      res.json({
        data: {
          connected: false,
          synced: false,
          recommendations: [],
          nearbyCount: 0,
          totalAvailableRecommendationCount: 0,
          hiddenCandidatesCount: 0,
        },
      });
      return;
    }

    if (!status.hasTasteProfile) {
      res.json({
        data: {
          connected: true,
          synced: false,
          recommendations: [],
          nearbyCount: 0,
          totalAvailableRecommendationCount: 0,
          hiddenCandidatesCount: 0,
        },
      });
      return;
    }

    const result = await getSpotifyConcertRecommendationsForUser({
      userId,
      latitude: lat,
      longitude: lng,
      radiusKm: Number.isNaN(radius) ? 50 : radius,
      limit,
      debug: debug || Boolean(debugArtist),
      debugArtist,
    });

    res.json({
      data: {
        connected: true,
        synced: true,
        recommendations: result.recommendations,
        nearbyCount: result.nearbyCount,
        totalAvailableRecommendationCount: result.totalAvailableRecommendationCount,
        hiddenCandidatesCount: result.hiddenCandidatesCount,
        sparseRecommendations:
          result.recommendations.length > 0 &&
          result.recommendations.length <= 2 &&
          result.totalAvailableRecommendationCount <= 3,
        ...(result.debug ? { debug: result.debug } : {}),
      },
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Could not load Spotify recommendations.',
    });
  }
});
