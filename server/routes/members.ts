import { Router } from 'express';
import type { MemberSearchResult } from '../../shared/types/index.js';
import { searchUsersByUsername } from '../../src/lib/db/profileRepository.js';
import { getFollowCounts, isFollowing } from '../../src/lib/db/friendRepository.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { resolveUserId } from '../lib/devUser.js';

export const membersRouter = Router();

// GET /api/members/search?q=&currentUserId=
membersRouter.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!isDynamoConfigured() || !q) {
      res.json({ data: [] });
      return;
    }
    const currentUserId = resolveUserId(req.query.currentUserId);
    const profiles = await searchUsersByUsername(q);

    const data: MemberSearchResult[] = await Promise.all(
      profiles
        .filter((p) => p.userId !== currentUserId)
        .map(async (p) => {
          const [counts, following] = await Promise.all([
            getFollowCounts(p.userId),
            isFollowing(currentUserId, p.userId),
          ]);
          return { ...p, followersCount: counts.followersCount, isFollowing: following };
        })
    );

    res.json({ data });
  } catch (err) {
    next(err);
  }
});
