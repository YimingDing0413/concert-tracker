import { Router, type Request, type Response } from 'express';
import type { RatingInput } from '../../shared/types/index.js';
import { resolveUserId } from '../lib/devUser.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import {
  getConcertRatingForUser,
  getConcertRatings,
  getShowTimingReports,
  getShowTimingResponse,
  submitConcertRating,
  submitShowTimingReport,
} from '../../src/lib/db/concertRepository.js';

export const concertsRouter = Router();

function dynamoUnavailable(_req: Request, res: Response) {
  res.status(503).json({
    error: 'DynamoDB is not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and DYNAMODB_TABLE_NAME.',
  });
}

concertsRouter.use((req, res, next) => {
  if (!isDynamoConfigured()) {
    dynamoUnavailable(req, res);
    return;
  }
  next();
});

concertsRouter.post('/:eventId/ratings', async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const userId = resolveUserId(undefined, req.body?.userId);
    const { userConcertId, ...input } = req.body ?? {};
    const ratingInput = input as RatingInput;

    if (
      typeof ratingInput.overall !== 'number' ||
      typeof ratingInput.venue !== 'number' ||
      typeof ratingInput.crowd !== 'number' ||
      typeof ratingInput.sound !== 'number' ||
      typeof ratingInput.setlist !== 'number'
    ) {
      res.status(400).json({ error: 'Rating scores are required.' });
      return;
    }

    const data = await submitConcertRating(
      eventId,
      userId,
      ratingInput,
      userConcertId as string | undefined
    );
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

concertsRouter.get('/:eventId/ratings', async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    if (req.query.userId) {
      const userId = resolveUserId(req.query.userId);
      const data = await getConcertRatingForUser(eventId, userId);
      res.json({ data });
      return;
    }
    const data = await getConcertRatings(eventId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

concertsRouter.post('/:eventId/show-reports', async (req, res, next) => {
  try {
    const eventId = req.params.eventId;
    const userId = resolveUserId(undefined, req.body?.userId);
    const { userId: _ignored, ...input } = req.body ?? {};
    void _ignored;

    const report = await submitShowTimingReport(eventId, userId, input);
    const timing = await getShowTimingResponse(eventId, userId);
    res.json({ data: { report, ...timing } });
  } catch (err) {
    if (err instanceof Error && err.message.includes('at least one')) {
      res.status(400).json({ error: err.message });
      return;
    }
    next(err);
  }
});

concertsRouter.get('/:eventId/show-reports', async (req, res, next) => {
  try {
    const data = await getShowTimingReports(req.params.eventId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

concertsRouter.get('/:eventId/show-timing', async (req, res, next) => {
  try {
    const userId = req.query.userId
      ? resolveUserId(req.query.userId)
      : undefined;
    const data = await getShowTimingResponse(req.params.eventId, userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
