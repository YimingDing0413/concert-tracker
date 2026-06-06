import { Router } from 'express';
import {
  createFeedPost,
  deleteFeedPost,
  getGlobalFeed,
} from '../../src/lib/db/feedRepository.js';
import { getFollowing } from '../../src/lib/db/friendRepository.js';
import type { FeedFilter, FeedPost } from '../../shared/types/index.js';
import { resolveUserId } from '../lib/devUser.js';
import { requireDynamo } from '../lib/requireDynamo.js';

export const feedRouter = Router();

// MVP: userId comes from the client's local auth user until real sessions exist.

function filterPosts(posts: FeedPost[], filter: FeedFilter, followingIds: Set<string>): FeedPost[] {
  switch (filter) {
    case 'looking_for_tickets':
      return posts.filter((p) => p.type === 'looking_for_tickets');
    case 'reviews':
      return posts.filter((p) => p.type === 'review');
    case 'following':
      return posts.filter((p) => followingIds.has(p.userId));
    default:
      return posts;
  }
}

feedRouter.get('/', requireDynamo, async (req, res, next) => {
  try {
    const filter = (req.query.filter as FeedFilter) || 'all';
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const currentUserId = resolveUserId(req.query.userId);

    let posts = await getGlobalFeed(limit);

    if (filter === 'following') {
      const following = await getFollowing(currentUserId);
      const followingIds = new Set(following.map((f) => f.targetUserId));
      posts = filterPosts(posts, filter, followingIds);
    } else if (filter !== 'all') {
      posts = filterPosts(posts, filter, new Set());
    }

    res.json({ data: posts });
  } catch (err) {
    next(err);
  }
});

feedRouter.post('/', requireDynamo, async (req, res) => {
  try {
    const body = req.body ?? {};
    const userId = resolveUserId(req.query.userId, body.userId);
    const data = await createFeedPost({ ...body, userId });
    res.json({ data });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Could not create post.' });
  }
});

feedRouter.delete('/:postId', requireDynamo, async (req, res, next) => {
  try {
    await deleteFeedPost(req.params.postId);
    res.json({ data: { ok: true } });
  } catch (err) {
    next(err);
  }
});
