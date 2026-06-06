import { Router } from 'express';
import { getFeedForUser } from '../../src/lib/db/feedRepository.js';
import {
  createOrUpdateUserProfile,
  getSocialProfile,
  updateUsername,
} from '../../src/lib/db/profileRepository.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { resolveUserId } from '../lib/devUser.js';
import { requireDynamo } from '../lib/requireDynamo.js';

export const usersRouter = Router();

// NOTE: currentUserId is passed by the client (MVP local user). When real auth
// lands, derive the user from the session/token instead of request params.

usersRouter.get('/me', async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    if (!isDynamoConfigured()) {
      res.json({ data: null });
      return;
    }
    const data = await getSocialProfile(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

usersRouter.post('/me', requireDynamo, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const userId = resolveUserId(req.query.userId, body.userId);
    const data = await createOrUpdateUserProfile({
      userId,
      username: body.username,
      displayName: body.displayName,
      avatarUrl: body.avatarUrl,
      bio: body.bio,
    });
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not save profile.' });
  }
});

usersRouter.get('/:userId/feed', requireDynamo, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const data = await getFeedForUser(req.params.userId, limit);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

usersRouter.patch('/me/username', requireDynamo, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const userId = resolveUserId(req.query.userId, body.userId);
    if (!body.username) {
      res.status(400).json({ error: 'username required' });
      return;
    }
    const data = await updateUsername(userId, String(body.username));
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not update username.' });
  }
});
