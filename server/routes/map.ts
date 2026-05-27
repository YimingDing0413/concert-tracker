import { Router } from 'express';
import { getNearbyMap, getMapEventsVenues } from '../services/mapService.js';

export const mapRouter = Router();

mapRouter.get('/events', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat ?? req.query.latitude);
    const lng = Number(req.query.lng ?? req.query.longitude ?? req.query.lon);
    const radiusKmRaw = Number(req.query.radius ?? req.query.radiusKm ?? 25);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      return;
    }

    const radiusKm = Number.isNaN(radiusKmRaw)
      ? 25
      : Math.min(100, Math.max(10, Math.round(radiusKmRaw)));
    const queryRaw = req.query.q ?? req.query.query ?? req.query.search ?? '';
    const query = typeof queryRaw === 'string' ? queryRaw.trim() : '';

    const result = await getMapEventsVenues({
      latitude: lat,
      longitude: lng,
      radiusKm,
      query,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

mapRouter.get('/nearby', async (req, res, next) => {
  try {
    const lat = Number(req.query.lat ?? req.query.latitude);
    const lng = Number(req.query.lng ?? req.query.longitude ?? req.query.lon);
    const radiusKmRaw = Number(req.query.radiusKm ?? req.query.radius ?? 40);

    if (
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
      return;
    }

    const radiusKm =
      Number.isNaN(radiusKmRaw) ? 40 : Math.min(150, Math.max(5, radiusKmRaw));

    const result = await getNearbyMap({ latitude: lat, longitude: lng, radiusKm });
    res.json(result);
  } catch (err) {
    next(err);
  }
});
