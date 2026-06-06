/**
 * DynamoDB single-table repository for social feed posts — server-side only.
 *
 * Layout:
 *   Global:  pk = FEED              sk = POST#{createdAt}#{postId}
 *   User:    pk = USER#{userId}     sk = FEED_POST#{createdAt}#{postId}
 *   Event:   pk = EVENT#{eventId}   sk = FEED_POST#{createdAt}#{postId}
 *   Lookup:  pk = POST#{postId}     sk = META
 */
import {
  BatchWriteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type { CreateFeedPostInput, FeedPost } from '../../../shared/types/index.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';
import { getSocialProfile } from './profileRepository.js';

const MAX_ITEM_BYTES = 380_000;

function globalPk(): string {
  return 'FEED';
}

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function eventPk(eventId: string): string {
  return `EVENT#${eventId}`;
}

function postLookupPk(postId: string): string {
  return `POST#${postId}`;
}

function globalSk(createdAt: string, postId: string): string {
  return `POST#${createdAt}#${postId}`;
}

function feedPostSk(createdAt: string, postId: string): string {
  return `FEED_POST#${createdAt}#${postId}`;
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? ''), 'utf8');
}

function trimPhotosToFit(post: FeedPost): FeedPost {
  const photos = post.photoDataUrls ?? [];
  if (photos.length === 0) return post;

  const base = byteLength({ ...post, photoDataUrls: [] });
  const kept: string[] = [];
  let size = base;
  for (const photo of photos) {
    const add = byteLength(photo) + 4;
    if (size + add > MAX_ITEM_BYTES) break;
    kept.push(photo);
    size += add;
  }
  if (kept.length === photos.length) return post;
  return { ...post, photoDataUrls: kept };
}

function itemFromPost(post: FeedPost, pk: string, sk: string) {
  return {
    pk,
    sk,
    entityType: 'FEED_POST',
    postId: post.id,
    userId: post.userId,
    eventId: post.eventId,
    postType: post.type,
    post,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function mapPost(item: Record<string, unknown>): FeedPost | null {
  const post = item.post as FeedPost | undefined;
  return post ?? null;
}

export function generateFeedPostId(): string {
  return `post-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createFeedPost(input: CreateFeedPostInput): Promise<FeedPost> {
  assertDynamoConfigured();
  if (!input.userId) throw new Error('userId is required');
  if (!input.type) throw new Error('type is required');

  const now = new Date().toISOString();
  const profile = await getSocialProfile(input.userId).catch(() => null);

  const post: FeedPost = trimPhotosToFit({
    id: input.id ?? generateFeedPostId(),
    type: input.type,
    userId: input.userId,
    userDisplayName:
      input.userDisplayName ?? profile?.displayName ?? profile?.username ?? 'Member',
    username: input.username ?? profile?.username,
    avatarUrl: input.avatarUrl ?? profile?.avatarUrl,
    eventId: input.eventId,
    artistName: input.artistName,
    venueName: input.venueName,
    city: input.city,
    eventDate: input.eventDate,
    imageUrl: input.imageUrl,
    caption: input.caption,
    rating: input.rating,
    tags: input.tags,
    photoDataUrls: input.photoDataUrls,
    ticketStatus: input.ticketStatus,
    ticketQuantity: input.ticketQuantity,
    maxBudget: input.maxBudget,
    ticketNote: input.ticketNote,
    createdAt: now,
    updatedAt: now,
  });

  const client = getDocClient();
  const tableName = getTableName();
  const gSk = globalSk(post.createdAt, post.id);
  const uSk = feedPostSk(post.createdAt, post.id);

  const writes = [
    itemFromPost(post, globalPk(), gSk),
    itemFromPost(post, userPk(post.userId), uSk),
    {
      pk: postLookupPk(post.id),
      sk: 'META',
      entityType: 'FEED_POST_META',
      postId: post.id,
      userId: post.userId,
      eventId: post.eventId,
      globalSk: gSk,
      userSk: uSk,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    },
  ];

  if (post.eventId) {
    writes.push(itemFromPost(post, eventPk(post.eventId), uSk));
  }

  await Promise.all(
    writes.map((item) =>
      client.send(new PutCommand({ TableName: tableName, Item: item }))
    )
  );

  return post;
}

async function queryFeedPosts(
  pk: string,
  skPrefix: string,
  limit = 50
): Promise<FeedPost[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': skPrefix,
      },
      ScanIndexForward: false,
      Limit: limit,
    })
  );

  return (res.Items ?? [])
    .map((item) => mapPost(item as Record<string, unknown>))
    .filter((p): p is FeedPost => Boolean(p));
}

export async function getGlobalFeed(limit = 50): Promise<FeedPost[]> {
  return queryFeedPosts(globalPk(), 'POST#', limit);
}

export async function getFeedForUser(userId: string, limit = 50): Promise<FeedPost[]> {
  return queryFeedPosts(userPk(userId), 'FEED_POST#', limit);
}

export async function getFeedForEvent(eventId: string, limit = 50): Promise<FeedPost[]> {
  return queryFeedPosts(eventPk(eventId), 'FEED_POST#', limit);
}

async function getPostMeta(postId: string) {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: postLookupPk(postId), sk: 'META' },
    })
  );
  return res.Item as
    | {
        postId: string;
        userId: string;
        eventId?: string;
        globalSk: string;
        userSk: string;
        createdAt: string;
        updatedAt: string;
      }
    | undefined;
}

export async function deleteFeedPost(postId: string): Promise<void> {
  assertDynamoConfigured();
  const meta = await getPostMeta(postId);
  if (!meta) return;

  const client = getDocClient();
  const tableName = getTableName();
  const keys = [
    { pk: globalPk(), sk: meta.globalSk },
    { pk: userPk(meta.userId), sk: meta.userSk },
    { pk: postLookupPk(postId), sk: 'META' },
  ];
  if (meta.eventId) {
    keys.push({ pk: eventPk(meta.eventId), sk: meta.userSk });
  }

  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: keys.map((key) => ({ DeleteRequest: { Key: key } })),
      },
    })
  );
}

export async function updateFeedPost(
  postId: string,
  updates: Partial<FeedPost>
): Promise<FeedPost | null> {
  assertDynamoConfigured();
  const meta = await getPostMeta(postId);
  if (!meta) return null;

  const client = getDocClient();
  const tableName = getTableName();
  const globalItem = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: globalPk(), sk: meta.globalSk },
    })
  );
  const existing = mapPost((globalItem.Item ?? {}) as Record<string, unknown>);
  if (!existing) return null;

  const updated: FeedPost = trimPhotosToFit({
    ...existing,
    ...updates,
    id: existing.id,
    userId: existing.userId,
    type: existing.type,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  const writes = [
    itemFromPost(updated, globalPk(), meta.globalSk),
    itemFromPost(updated, userPk(updated.userId), meta.userSk),
  ];
  if (updated.eventId) {
    writes.push(itemFromPost(updated, eventPk(updated.eventId), meta.userSk));
  }

  await Promise.all(
    writes.map((item) =>
      client.send(new PutCommand({ TableName: tableName, Item: item }))
    )
  );

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        ...meta,
        pk: postLookupPk(postId),
        sk: 'META',
        entityType: 'FEED_POST_META',
        eventId: updated.eventId,
        updatedAt: updated.updatedAt,
      },
    })
  );

  return updated;
}
