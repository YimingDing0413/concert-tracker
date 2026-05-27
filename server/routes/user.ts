import { Router, type NextFunction, type Request, type Response } from 'express';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { Concert, UserConcertStatus } from '../../shared/types/index.js';
import {
  getAllUserConcerts,
  getAttendedConcertsForUser,
  getSavedConcertsForUser,
  markConcertAttended,
  saveConcertForUser,
} from '../../src/lib/db/concertRepository.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { resolveUserId } from '../lib/devUser.js';
import { getEventById } from '../services/eventService.js';
import * as store from '../storage/userStorage.js';

export const userRouter = Router();

function dynamoUnavailable(_req: Request, res: Response) {
  res.status(503).json({
    error: 'DynamoDB is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and DYNAMODB_TABLE_NAME.',
  });
}

function requireDynamo(req: Request, res: Response, next: NextFunction) {
  if (!isDynamoConfigured()) {
    dynamoUnavailable(req, res);
    return;
  }
  next();
}

async function resolveEventSnapshot(
  eventId: string,
  event?: Partial<Concert>
): Promise<Partial<Concert>> {
  if (event?.artistName && event?.venueName) return event;
  try {
    const res = await getEventById(eventId);
    return concertEventToConcert(res.data);
  } catch {
    return event ?? { id: eventId };
  }
}

userRouter.get('/concerts', async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    if (isDynamoConfigured()) {
      const data = await getAllUserConcerts(userId);
      res.json({ data });
      return;
    }
    const data = await store.getUserConcerts(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/save', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(undefined, req.body?.userId);
    const { eventId, event, status } = req.body ?? {};
    if (!eventId) {
      res.status(400).json({ error: 'eventId required' });
      return;
    }
    const snapshot = await resolveEventSnapshot(String(eventId), event);
    const data = await saveConcertForUser(
      userId,
      { ...snapshot, id: String(eventId) },
      (status as UserConcertStatus | undefined) ?? 'going'
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.get('/concerts/saved', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const data = await getSavedConcertsForUser(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/attended', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(undefined, req.body?.userId);
    const { eventId, event } = req.body ?? {};
    if (!eventId) {
      res.status(400).json({ error: 'eventId required' });
      return;
    }
    const snapshot = await resolveEventSnapshot(String(eventId), event);
    const data = await markConcertAttended(userId, { ...snapshot, id: String(eventId) });
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.get('/concerts/attended', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const data = await getAttendedConcertsForUser(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/status', async (req, res, next) => {
  try {
    const { userId, concertId, status, event } = req.body ?? {};
    if (!userId || !concertId || !status) {
      res.status(400).json({ error: 'userId, concertId, and status required' });
      return;
    }

    if (isDynamoConfigured()) {
      const snapshot = await resolveEventSnapshot(String(concertId), event);
      const data =
        status === 'attended'
          ? await markConcertAttended(String(userId), { ...snapshot, id: String(concertId) })
          : await saveConcertForUser(
              String(userId),
              { ...snapshot, id: String(concertId) },
              status as UserConcertStatus
            );
      res.json({ data });
      return;
    }

    const uc = await store.setConcertStatus(userId, concertId, status);
    res.json({ data: uc });
  } catch (err) {
    next(err);
  }
});

userRouter.delete('/concerts/:userConcertId', async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId, req.body?.userId);
    await store.removeUserConcert(userId, req.params.userConcertId);
    res.json({ data: null });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/manual', async (req, res, next) => {
  try {
    const userId = resolveUserId(undefined, req.body?.userId);
    const { userId: _ignored, ...input } = req.body ?? {};
    void _ignored;
    const data = await store.addManualConcert(userId, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.get('/ratings', async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const concertId = String(req.query.concertId ?? '');
    if (!concertId) {
      res.status(400).json({ error: 'concertId required' });
      return;
    }

    if (isDynamoConfigured()) {
      const { getConcertRatingForUser } = await import('../../src/lib/db/concertRepository.js');
      const data = await getConcertRatingForUser(concertId, userId);
      res.json({ data });
      return;
    }

    const data = await store.getRating(userId, concertId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/ratings', async (req, res, next) => {
  try {
    const userId = resolveUserId(undefined, req.body?.userId);
    const { userConcertId, concertId, ...input } = req.body ?? {};
    if (!concertId) {
      res.status(400).json({ error: 'concertId required' });
      return;
    }

    if (isDynamoConfigured()) {
      const { submitConcertRating } = await import('../../src/lib/db/concertRepository.js');
      const data = await submitConcertRating(
        String(concertId),
        userId,
        input,
        userConcertId as string | undefined
      );
      res.json({ data });
      return;
    }

    if (!userConcertId) {
      res.status(400).json({ error: 'userConcertId required' });
      return;
    }
    const data = await store.saveRating(userId, userConcertId, concertId, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
