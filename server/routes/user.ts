import { Router } from 'express';
import * as store from '../storage/userStorage.js';

export const userRouter = Router();

userRouter.get('/concerts', async (req, res, next) => {
  try {
    const userId = String(req.query.userId ?? store.getSessionUserId() ?? '');
    if (!userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const data = await store.getUserConcerts(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/status', async (req, res, next) => {
  try {
    const { userId, concertId, status } = req.body ?? {};
    if (!userId || !concertId || !status) {
      res.status(400).json({ error: 'userId, concertId, and status required' });
      return;
    }
    const uc = await store.setConcertStatus(userId, concertId, status);
    res.json({ data: uc });
  } catch (err) {
    next(err);
  }
});

userRouter.post('/concerts/manual', async (req, res, next) => {
  try {
    const { userId, ...input } = req.body ?? {};
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    const data = await store.addManualConcert(userId, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

userRouter.get('/ratings', async (req, res, next) => {
  try {
    const userId = String(req.query.userId ?? '');
    const concertId = String(req.query.concertId ?? '');
    if (!userId || !concertId) {
      res.status(400).json({ error: 'userId and concertId required' });
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
    const { userId, userConcertId, concertId, ...input } = req.body ?? {};
    if (!userId || !userConcertId || !concertId) {
      res.status(400).json({ error: 'Missing rating fields' });
      return;
    }
    const data = await store.saveRating(userId, userConcertId, concertId, input);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
