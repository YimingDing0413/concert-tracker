/**
 * DynamoDB follow/follower repository — server-side only.
 *
 * Layout (single-table), written as a pair so both directions are cheap:
 *   Following: pk = USER#{currentUserId} sk = FOLLOWING#{targetUserId}
 *   Follower:  pk = USER#{targetUserId}  sk = FOLLOWER#{currentUserId}
 *
 * Each row denormalizes the other party's username/displayName/avatar so the
 * "following" and "followers" lists render without extra reads.
 */
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  FollowCounts,
  FollowItem,
  FollowerItem,
} from '../../../shared/types/index.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';
import { getSocialProfile } from './profileRepository.js';

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function followingSk(targetUserId: string): string {
  return `FOLLOWING#${targetUserId}`;
}

function followerSk(followerUserId: string): string {
  return `FOLLOWER#${followerUserId}`;
}

export interface FollowResult {
  following: boolean;
  counts: FollowCounts;
}

export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<FollowResult> {
  assertDynamoConfigured();
  if (!currentUserId || !targetUserId) {
    throw new Error('currentUserId and targetUserId are required');
  }
  if (currentUserId === targetUserId) {
    throw new Error('You cannot follow yourself.');
  }

  const client = getDocClient();
  const tableName = getTableName();
  const now = new Date().toISOString();

  // Denormalize each party's profile onto the relationship rows.
  const [currentProfile, targetProfile] = await Promise.all([
    getSocialProfile(currentUserId),
    getSocialProfile(targetUserId),
  ]);

  const followItem: FollowItem = {
    userId: currentUserId,
    targetUserId,
    targetUsername: targetProfile?.username,
    targetDisplayName: targetProfile?.displayName,
    targetAvatarUrl: targetProfile?.avatarUrl,
    createdAt: now,
  };

  const followerItem: FollowerItem = {
    userId: targetUserId,
    followerUserId: currentUserId,
    followerUsername: currentProfile?.username,
    followerDisplayName: currentProfile?.displayName,
    followerAvatarUrl: currentProfile?.avatarUrl,
    createdAt: now,
  };

  // Idempotent: PutCommand overwrites if the relationship already exists.
  await Promise.all([
    client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: userPk(currentUserId),
          sk: followingSk(targetUserId),
          entityType: 'FOLLOWING',
          follow: followItem,
          ...followItem,
        },
      })
    ),
    client.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          pk: userPk(targetUserId),
          sk: followerSk(currentUserId),
          entityType: 'FOLLOWER',
          follower: followerItem,
          ...followerItem,
        },
      })
    ),
  ]);

  const counts = await getFollowCounts(targetUserId);
  return { following: true, counts };
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<FollowResult> {
  assertDynamoConfigured();
  if (!currentUserId || !targetUserId) {
    throw new Error('currentUserId and targetUserId are required');
  }

  const client = getDocClient();
  const tableName = getTableName();

  await Promise.all([
    client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: userPk(currentUserId), sk: followingSk(targetUserId) },
      })
    ),
    client.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { pk: userPk(targetUserId), sk: followerSk(currentUserId) },
      })
    ),
  ]);

  const counts = await getFollowCounts(targetUserId);
  return { following: false, counts };
}

export async function isFollowing(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  assertDynamoConfigured();
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return false;
  const client = getDocClient();
  const res = await client.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk: userPk(currentUserId), sk: followingSk(targetUserId) },
    })
  );
  return Boolean(res.Item);
}

export async function getFollowing(userId: string): Promise<FollowItem[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const res = await client.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'FOLLOWING#' },
    })
  );
  return (res.Items ?? [])
    .map((item) => (item.follow as FollowItem | undefined) ?? null)
    .filter((f): f is FollowItem => Boolean(f))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getFollowers(userId: string): Promise<FollowerItem[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const res = await client.send(
    new QueryCommand({
      TableName: getTableName(),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': 'FOLLOWER#' },
    })
  );
  return (res.Items ?? [])
    .map((item) => (item.follower as FollowerItem | undefined) ?? null)
    .filter((f): f is FollowerItem => Boolean(f))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

export async function getFollowCounts(userId: string): Promise<FollowCounts> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const countFor = async (prefix: string): Promise<number> => {
    const res = await client.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': userPk(userId), ':prefix': prefix },
        Select: 'COUNT',
      })
    );
    return res.Count ?? 0;
  };

  const [followersCount, followingCount] = await Promise.all([
    countFor('FOLLOWER#'),
    countFor('FOLLOWING#'),
  ]);

  return { followersCount, followingCount };
}
