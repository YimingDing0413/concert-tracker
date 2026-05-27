import { Router } from 'express';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { ConcertDetail } from '../../shared/types/index.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { getShowTimingResponse } from '../../src/lib/db/concertRepository.js';
import {
  getEventById,
  getEventSetlist,
  listEvents,
  mergeEventDetail,
} from '../services/eventService.js';
import * as store from '../storage/userStorage.js';

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

eventsRouter.get('/:id/show-timing', async (req, res, next) => {
  try {
    const userId = req.query.userId as string | undefined;
    if (isDynamoConfigured()) {
      const data = await getShowTimingResponse(req.params.id, userId);
      res.json({ data });
      return;
    }
    const data = await store.getShowTiming(req.params.id, userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

eventsRouter.post('/:id/show-reports', async (req, res, next) => {
  try {
    const { userId, ...input } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }

    if (isDynamoConfigured()) {
      const { submitShowTimingReport } = await import('../../src/lib/db/concertRepository.js');
      const report = await submitShowTimingReport(req.params.id, userId, input);
      const timing = await getShowTimingResponse(req.params.id, userId);
      res.json({ data: { report, ...timing } });
      return;
    }

    const report = await store.createShowReport(req.params.id, userId, input);
    const timing = await store.getShowTiming(req.params.id, userId);
    res.json({ data: { report, ...timing } });
  } catch (err) {
    if (err instanceof Error && err.message.includes('at least one')) {
      res.status(400).json({ error: err.message });
      return;
    }
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
