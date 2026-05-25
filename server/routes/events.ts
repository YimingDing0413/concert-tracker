import { Router } from 'express';
import {
  getEventById,
  getEventSetlist,
  listEvents,
  mergeEventDetail,
} from '../services/eventService.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { ConcertDetail } from '../../shared/types/index.js';

export const eventsRouter = Router();

eventsRouter.get('/', async (req, res, next) => {
  try {
    const result = await listEvents({
      keyword: req.query.keyword as string | undefined,
      city: req.query.city as string | undefined,
      artist: req.query.artist as string | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

eventsRouter.get('/:id/setlist', async (req, res, next) => {
  try {
    const artistName = req.query.artistName as string | undefined;
    const result = await getEventSetlist(req.params.id, artistName);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

eventsRouter.get('/:id', async (req, res, next) => {
  try {
    const eventRes = await getEventById(req.params.id);
    const enriched = await mergeEventDetail(eventRes.data, eventRes.data.artistName);
    const concert = concertEventToConcert(enriched);

    const setlistRes = await getEventSetlist(req.params.id, enriched.artistName);
    const isPast = concert.status === 'past';

    const detail: ConcertDetail = {
      ...concert,
      setlist: isPast && setlistRes.data?.source === 'actual' ? setlistRes.data : undefined,
      predictedSetlist:
        !isPast && setlistRes.data?.source === 'predicted' ? setlistRes.data : undefined,
    };

    res.json({
      data: detail,
      meta: {
        source: eventRes.meta?.source === 'mock' ? 'mock' : 'live',
        message: eventRes.meta?.message,
      },
    });
  } catch (err) {
    next(err);
  }
});
