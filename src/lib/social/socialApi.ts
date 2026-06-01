/**
 * Frontend social client — talks to the internal backend only.
 *
 * Kept separate from the core ConcertApiClient so the social surface can evolve
 * independently. All calls pass an explicit userId/currentUserId (the MVP local
 * user). When real auth lands, the server should derive the user from the
 * session and these params can be dropped.
 */
import { apiFetchData } from '@/api/http';
import type {
  FollowCounts,
  FollowItem,
  FollowerItem,
  MemberSearchResult,
  UserProfile,
} from '@/types';

export interface ProfileInput {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export async function getMyProfile(userId: string): Promise<UserProfile | null> {
  return apiFetchData<UserProfile | null>(
    `/api/users/me?userId=${encodeURIComponent(userId)}`
  );
}

interface AuthLikeUser {
  id: string;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

/**
 * Load the social profile, seeding it from the authenticated user the first
 * time (so freshly signed-up users are immediately searchable/followable).
 * Returns null if the backend (DynamoDB) is unavailable.
 */
export async function ensureMyProfile(user: AuthLikeUser): Promise<UserProfile | null> {
  try {
    const existing = await getMyProfile(user.id);
    if (existing && existing.username) return existing;
    if (user.username) {
      try {
        return await saveMyProfile({
          userId: user.id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          avatarUrl: user.avatarUrl,
        });
      } catch {
        return existing;
      }
    }
    return existing;
  } catch {
    return null;
  }
}

export async function saveMyProfile(input: ProfileInput): Promise<UserProfile> {
  return apiFetchData<UserProfile>('/api/users/me', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateUsername(userId: string, username: string): Promise<UserProfile> {
  return apiFetchData<UserProfile>('/api/users/me/username', {
    method: 'PATCH',
    body: JSON.stringify({ userId, username }),
  });
}

export async function searchMembers(
  query: string,
  currentUserId: string
): Promise<MemberSearchResult[]> {
  const q = encodeURIComponent(query.trim());
  const uid = encodeURIComponent(currentUserId);
  return apiFetchData<MemberSearchResult[]>(`/api/members/search?q=${q}&currentUserId=${uid}`);
}

export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ following: boolean; counts: FollowCounts }> {
  return apiFetchData('/api/friends/follow', {
    method: 'POST',
    body: JSON.stringify({ currentUserId, targetUserId }),
  });
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<{ following: boolean; counts: FollowCounts }> {
  return apiFetchData('/api/friends/unfollow', {
    method: 'POST',
    body: JSON.stringify({ currentUserId, targetUserId }),
  });
}

export async function getFollowStatus(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  const res = await apiFetchData<{ isFollowing: boolean }>(
    `/api/friends/status?currentUserId=${encodeURIComponent(currentUserId)}&targetUserId=${encodeURIComponent(targetUserId)}`
  );
  return res.isFollowing;
}

export async function getFollowing(userId: string): Promise<FollowItem[]> {
  return apiFetchData<FollowItem[]>(
    `/api/friends/following?userId=${encodeURIComponent(userId)}`
  );
}

export async function getFollowers(userId: string): Promise<FollowerItem[]> {
  return apiFetchData<FollowerItem[]>(
    `/api/friends/followers?userId=${encodeURIComponent(userId)}`
  );
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  return apiFetchData<FollowCounts>(
    `/api/friends/counts?userId=${encodeURIComponent(userId)}`
  );
}

/** Client-side username validation mirroring the server rules (for fast UX). */
export function validateUsernameClient(raw: string): { ok: boolean; error?: string } {
  const username = (raw ?? '').trim().toLowerCase();
  if (username.length < 3) return { ok: false, error: 'At least 3 characters.' };
  if (username.length > 30) return { ok: false, error: '30 characters max.' };
  if (!/^[a-z0-9._]+$/.test(username)) {
    return { ok: false, error: 'Only letters, numbers, _ and .' };
  }
  return { ok: true };
}
