import { Router } from 'express';
import {
  getVenueDetailPage,
  getVenueEvents,
  searchVenues,
} from '../services/venueService.js';
import { concertEventToConcert } from '../../shared/mappers.js';

export const venuesRouter = Router();

venuesRouter.get('/', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword ?? '').trim();
    const result = await searchVenues(keyword || 'arena');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

venuesRouter.get('/:id/events', async (req, res, next) => {
  try {
    const result = await getVenueEvents(req.params.id);
    res.json({
      data: result.data.map(concertEventToConcert),
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

venuesRouter.get('/:id', async (req, res, next) => {
  try {
    const result = await getVenueDetailPage(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
