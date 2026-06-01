import { Router } from 'express';
import {
  followUser,
  getFollowCounts,
  getFollowers,
  getFollowing,
  isFollowing,
  unfollowUser,
} from '../../src/lib/db/friendRepository.js';
import { resolveUserId } from '../lib/devUser.js';
import { requireDynamo } from '../lib/requireDynamo.js';

export const friendsRouter = Router();

// NOTE: currentUserId comes from the client's MVP local user. Replace with the
// authenticated user id once real auth exists.

friendsRouter.post('/follow', requireDynamo, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const currentUserId = resolveUserId(undefined, body.currentUserId);
    const targetUserId = String(body.targetUserId ?? '');
    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId required' });
      return;
    }
    const data = await followUser(currentUserId, targetUserId);
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not follow.' });
  }
});

friendsRouter.post('/unfollow', requireDynamo, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const currentUserId = resolveUserId(undefined, body.currentUserId);
    const targetUserId = String(body.targetUserId ?? '');
    if (!targetUserId) {
      res.status(400).json({ error: 'targetUserId required' });
      return;
    }
    const data = await unfollowUser(currentUserId, targetUserId);
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not unfollow.' });
  }
});

friendsRouter.get('/following', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const data = await getFollowing(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

friendsRouter.get('/followers', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const data = await getFollowers(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

friendsRouter.get('/status', requireDynamo, async (req, res, next) => {
  try {
    const currentUserId = resolveUserId(req.query.currentUserId);
    const targetUserId = String(req.query.targetUserId ?? '');
    const following = await isFollowing(currentUserId, targetUserId);
    res.json({ data: { isFollowing: following } });
  } catch (err) {
    next(err);
  }
});

friendsRouter.get('/counts', requireDynamo, async (req, res, next) => {
  try {
    const userId = resolveUserId(req.query.userId);
    const data = await getFollowCounts(userId);
    res.json({ data });
  } catch (err) {
    next(err);
  }
});
