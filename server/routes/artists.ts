import { Router } from 'express';
import {
  getArtistDetail,
  getArtistEvents,
  getArtistProfile,
  getSetlistsForArtist,
  searchArtists,
} from '../services/artistService.js';
import { getPredictedSetlist } from '../services/eventService.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import { resolveArtistName } from '../lib/resolveArtistName.js';

export const artistsRouter = Router();

artistsRouter.get('/', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword ?? '').trim();
    const result = await searchArtists(keyword || 'a');
    res.json(result);
  } catch (err) {
    next(err);
  }
});

artistsRouter.get('/:idOrName/profile', async (req, res, next) => {
  try {
    const name = await resolveArtistName(req.params.idOrName);
    const result = await getArtistProfile(name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

artistsRouter.get('/:idOrName/events', async (req, res, next) => {
  try {
    const name = await resolveArtistName(req.params.idOrName);
    const result = await getArtistEvents(name);
    res.json({
      data: result.data.map(concertEventToConcert),
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
});

artistsRouter.get('/:idOrName/setlists', async (req, res, next) => {
  try {
    const name = await resolveArtistName(req.params.idOrName);
    const result = await getSetlistsForArtist(name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

artistsRouter.get('/:idOrName/predicted-setlist', async (req, res, next) => {
  try {
    const name = await resolveArtistName(req.params.idOrName);
    const result = await getPredictedSetlist(name);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

artistsRouter.get('/:idOrName', async (req, res, next) => {
  try {
    const result = await getArtistDetail(req.params.idOrName);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
