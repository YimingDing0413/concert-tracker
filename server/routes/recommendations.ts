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
        },
      });
      return;
    }

    const result = await getSpotifyConcertRecommendationsForUser({
      userId,
      latitude: lat,
      longitude: lng,
      radiusKm: Number.isNaN(radius) ? 50 : radius,
      limit: 6,
    });

    res.json({
      data: {
        connected: true,
        synced: true,
        recommendations: result.recommendations,
        nearbyCount: result.nearbyCount,
      },
    });
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Could not load Spotify recommendations.',
    });
  }
});
