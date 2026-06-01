/**
 * DynamoDB social-profile + username repository — server-side only.
 *
 * The auth account already owns USER#{userId}/PROFILE (see userRepository.ts),
 * so the social profile lives alongside it under a distinct sort key:
 *
 *   Social profile:   pk = USER#{userId}            sk = SOCIAL_PROFILE
 *   Username lookup:  pk = USERNAME#{lowercase}     sk = USER#{userId}
 *
 * The username-lookup row makes usernames unique and exact-lookupable. Prefix
 * search scans SOCIAL_PROFILE rows (filtered on a stored `usernameLower`) so
 * results always reflect the live profile and never go stale.
 */
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import type { UserProfile } from '../../../shared/types/index.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';

const PROFILE_SK = 'SOCIAL_PROFILE';

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function usernamePk(usernameLower: string): string {
  return `USERNAME#${usernameLower}`;
}

const USERNAME_RE = /^[a-z0-9._]+$/;

export interface UsernameValidation {
  ok: boolean;
  username?: string;
  error?: string;
}

/** Normalize + validate per the rules: lowercase, trimmed, [a-z0-9._], 3–30. */
export function normalizeUsername(raw: string): UsernameValidation {
  const username = (raw ?? '').trim().toLowerCase();
  if (username.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' };
  if (username.length > 30) return { ok: false, error: 'Username must be 30 characters or fewer.' };
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: 'Use only letters, numbers, underscores, and periods.' };
  }
  return { ok: true, username };
}

export async function getSocialProfile(userId: string): Promise<UserProfile | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const res = await client.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk: userPk(userId), sk: PROFILE_SK },
    })
  );
  return (res.Item?.profile as UserProfile | undefined) ?? null;
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  assertDynamoConfigured();
  const normalized = normalizeUsername(username);
  if (!normalized.ok || !normalized.username) return null;

  const client = getDocClient();
  const res = await client.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': usernamePk(normalized.username) },
      Limit: 1,
    })
  );
  const lookup = res.Items?.[0];
  if (!lookup?.userId) return null;
  return getSocialProfile(String(lookup.userId));
}

async function writeProfileItem(profile: UserProfile): Promise<void> {
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        pk: userPk(profile.userId),
        sk: PROFILE_SK,
        entityType: 'SOCIAL_PROFILE',
        userId: profile.userId,
        usernameLower: profile.username ? profile.username.toLowerCase() : '',
        profile,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
    })
  );
}

async function writeUsernameLookup(usernameLower: string, userId: string): Promise<void> {
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        pk: usernamePk(usernameLower),
        sk: userPk(userId),
        entityType: 'USERNAME_LOOKUP',
        userId,
        username: usernameLower,
        createdAt: new Date().toISOString(),
      },
    })
  );
}

async function deleteUsernameLookup(usernameLower: string, userId: string): Promise<void> {
  const client = getDocClient();
  await client.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { pk: usernamePk(usernameLower), sk: userPk(userId) },
    })
  );
}

export interface ProfileInput {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

/**
 * Upsert a social profile. If `username` is provided it is validated +
 * uniqueness checked, and the USERNAME lookup row is migrated (old one deleted).
 */
export async function createOrUpdateUserProfile(input: ProfileInput): Promise<UserProfile> {
  assertDynamoConfigured();
  if (!input.userId) throw new Error('userId is required');

  const existing = await getSocialProfile(input.userId);
  const now = new Date().toISOString();

  let username = existing?.username ?? '';
  const previousUsername = existing?.username?.toLowerCase() ?? '';

  if (input.username !== undefined && input.username !== '') {
    const normalized = normalizeUsername(input.username);
    if (!normalized.ok || !normalized.username) {
      throw new Error(normalized.error ?? 'Invalid username.');
    }
    if (normalized.username !== previousUsername) {
      const taken = await getUserByUsername(normalized.username);
      if (taken && taken.userId !== input.userId) {
        throw new Error('That username is already taken.');
      }
    }
    username = normalized.username;
  }

  const profile: UserProfile = {
    userId: input.userId,
    username,
    displayName: input.displayName ?? existing?.displayName,
    avatarUrl: input.avatarUrl ?? existing?.avatarUrl,
    bio: input.bio ?? existing?.bio,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await writeProfileItem(profile);

  const newUsernameLower = username.toLowerCase();
  if (newUsernameLower && newUsernameLower !== previousUsername) {
    await writeUsernameLookup(newUsernameLower, input.userId);
    if (previousUsername) {
      await deleteUsernameLookup(previousUsername, input.userId);
    }
  }

  return profile;
}

export async function updateUsername(userId: string, username: string): Promise<UserProfile> {
  const normalized = normalizeUsername(username);
  if (!normalized.ok) {
    throw new Error(normalized.error ?? 'Invalid username.');
  }
  return createOrUpdateUserProfile({ userId, username });
}

/** Prefix search by username over SOCIAL_PROFILE rows. MVP-scale Scan (no GSI). */
export async function searchUsersByUsername(
  query: string,
  limit = 25
): Promise<UserProfile[]> {
  assertDynamoConfigured();
  const q = (query ?? '').trim().toLowerCase();
  if (!q) return [];

  const client = getDocClient();
  const res = await client.send(
    new ScanCommand({
      TableName: getTableName(),
      FilterExpression: 'entityType = :type AND begins_with(usernameLower, :q)',
      ExpressionAttributeValues: { ':type': 'SOCIAL_PROFILE', ':q': q },
      Limit: 200,
    })
  );

  return (res.Items ?? [])
    .map((item) => item.profile as UserProfile)
    .filter((p) => Boolean(p?.username))
    .sort((a, b) => a.username.localeCompare(b.username))
    .slice(0, limit);
}
