import type { Request } from 'express';
import { getSocialProfile } from '../../src/lib/db/profileRepository.js';
import { getUserProfile } from '../../src/lib/db/userRepository.js';
import { isDynamoConfigured } from '../../src/lib/db/dynamodb.js';
import { verifyAuthToken } from './authToken.js';
import * as store from '../storage/userStorage.js';

export interface AuthenticatedUser {
  userId: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/** Resolve the authenticated user from the Bearer token — not from client-supplied userId. */
export async function getCurrentUserFromRequest(
  req: Request
): Promise<AuthenticatedUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const userId = verifyAuthToken(token);
  if (!userId) return null;

  if (isDynamoConfigured()) {
    const [authProfile, social] = await Promise.all([
      getUserProfile(userId).catch(() => null),
      getSocialProfile(userId).catch(() => null),
    ]);
    return {
      userId,
      email: authProfile?.email,
      username: social?.username ?? authProfile?.username,
      displayName: social?.displayName ?? authProfile?.displayName,
      avatarUrl: social?.avatarUrl ?? authProfile?.avatarUrl,
    };
  }

  const fileUser = await store.getUserById(userId);
  if (!fileUser) return null;

  return {
    userId: fileUser.id,
    email: fileUser.email,
    username: fileUser.username,
    displayName: fileUser.displayName,
    avatarUrl: fileUser.avatarUrl,
  };
}
