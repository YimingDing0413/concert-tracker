/**
 * DynamoDB single-table repository for concert reviews — server-side only.
 *
 * Layout (single-table):
 *   pk = USER#{userId}
 *   sk = REVIEW#{eventId}
 *
 * Reviews live under the user's partition so a user's whole review history is
 * a single Query. Photos are stored inline as data URLs; because a DynamoDB
 * item is capped at 400 KB we trim trailing photos that wouldn't fit.
 */
import {
  DeleteCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';

/** Server-side shape — kept local so we don't depend on frontend type aliases. */
export interface StoredConcertReview {
  id: string;
  userId: string;
  eventId: string;
  artistName: string;
  createdAt: string;
  updatedAt: string;
  photoDataUrls?: string[];
  [key: string]: unknown;
}

const MAX_ITEM_BYTES = 380_000; // leave headroom under DynamoDB's 400 KB cap

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function reviewSk(eventId: string): string {
  return `REVIEW#${eventId}`;
}

function byteLength(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value ?? ''), 'utf8');
}

/**
 * Keep as many photos as fit under the item size cap. Returns the review with a
 * possibly-trimmed photoDataUrls array so the write never exceeds DynamoDB's limit.
 */
function trimPhotosToFit(review: StoredConcertReview): StoredConcertReview {
  const photos = review.photoDataUrls ?? [];
  if (photos.length === 0) return review;

  const base = byteLength({ ...review, photoDataUrls: [] });
  const kept: string[] = [];
  let size = base;
  for (const photo of photos) {
    const add = byteLength(photo) + 4;
    if (size + add > MAX_ITEM_BYTES) break;
    kept.push(photo);
    size += add;
  }
  if (kept.length === photos.length) return review;
  return { ...review, photoDataUrls: kept };
}

export async function saveConcertReview(
  review: StoredConcertReview
): Promise<StoredConcertReview> {
  assertDynamoConfigured();
  if (!review.userId || !review.eventId) {
    throw new Error('review.userId and review.eventId are required');
  }

  const stored = trimPhotosToFit(review);
  const client = getDocClient();
  const tableName = getTableName();

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: userPk(review.userId),
        sk: reviewSk(review.eventId),
        entityType: 'REVIEW',
        userId: review.userId,
        eventId: review.eventId,
        review: stored,
        createdAt: stored.createdAt,
        updatedAt: stored.updatedAt,
      },
    })
  );

  return stored;
}

export async function getConcertReviewsForUser(
  userId: string
): Promise<StoredConcertReview[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': userPk(userId),
        ':prefix': 'REVIEW#',
      },
    })
  );

  return (res.Items ?? [])
    .map((item) => item.review as StoredConcertReview)
    .filter(Boolean)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

export async function deleteConcertReviewForUser(
  userId: string,
  eventId: string
): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  await client.send(
    new DeleteCommand({
      TableName: tableName,
      Key: { pk: userPk(userId), sk: reviewSk(eventId) },
    })
  );
}
