/**
 * DynamoDB single-table repository — server-side only.
 */
import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  AggregatedShowTiming,
  Concert,
  ConcertEvent,
  ConcertRating,
  RatingInput,
  ShowReportInput,
  UserConcert,
  UserConcertStatus,
  UserShowReport,
} from '../../../shared/types/index.js';
import { aggregateShowReports, normalizeTime, parseOpenerNames } from '../../../shared/showReports.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function eventPk(eventId: string): string {
  return `EVENT#${eventId}`;
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function toUserConcert(
  userId: string,
  eventId: string,
  status: UserConcertStatus,
  event: Partial<Concert> | ConcertEvent | undefined,
  existing?: UserConcert
): UserConcert {
  const now = new Date().toISOString();
  const snapshot = event as Partial<Concert> | undefined;
  return {
    id: existing?.id ?? generateId('uc'),
    userId,
    concertId: eventId,
    status,
    concertSnapshot: snapshot,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function savedSk(eventId: string): string {
  return `SAVED_CONCERT#${eventId}`;
}

function attendedSk(eventId: string): string {
  return `ATTENDED_CONCERT#${eventId}`;
}

function ratingSk(userId: string): string {
  return `RATING#${userId}`;
}

function reportSk(reportId: string): string {
  return `REPORT#${reportId}`;
}

export async function saveConcertForUser(
  userId: string,
  event: Partial<Concert> | ConcertEvent,
  status: UserConcertStatus = 'going'
): Promise<UserConcert> {
  assertDynamoConfigured();
  const eventId = event.id;
  if (!eventId) throw new Error('event.id is required');

  const client = getDocClient();
  const tableName = getTableName();
  const existingRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: userPk(userId), sk: savedSk(eventId) },
    })
  );
  const existing = existingRes.Item?.userConcert as UserConcert | undefined;
  const userConcert = toUserConcert(userId, eventId, status, event, existing);

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: userPk(userId),
        sk: savedSk(eventId),
        entityType: 'SAVED_CONCERT',
        userId,
        eventId,
        status,
        event,
        userConcert,
        createdAt: userConcert.createdAt,
        updatedAt: userConcert.updatedAt,
      },
    })
  );

  return userConcert;
}

export async function getSavedConcertsForUser(userId: string): Promise<UserConcert[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': userPk(userId),
        ':prefix': 'SAVED_CONCERT#',
      },
    })
  );

  return (res.Items ?? [])
    .map((item) => item.userConcert as UserConcert)
    .filter(Boolean);
}

export async function markConcertAttended(
  userId: string,
  event: Partial<Concert> | ConcertEvent
): Promise<UserConcert> {
  assertDynamoConfigured();
  const eventId = event.id;
  if (!eventId) throw new Error('event.id is required');

  const client = getDocClient();
  const tableName = getTableName();
  const existingRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: userPk(userId), sk: attendedSk(eventId) },
    })
  );
  const existing = existingRes.Item?.userConcert as UserConcert | undefined;
  const userConcert = toUserConcert(userId, eventId, 'attended', event, existing);

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: userPk(userId),
        sk: attendedSk(eventId),
        entityType: 'ATTENDED_CONCERT',
        userId,
        eventId,
        status: 'attended',
        event,
        userConcert,
        createdAt: userConcert.createdAt,
        updatedAt: userConcert.updatedAt,
      },
    })
  );

  return userConcert;
}

export async function getAttendedConcertsForUser(userId: string): Promise<UserConcert[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': userPk(userId),
        ':prefix': 'ATTENDED_CONCERT#',
      },
    })
  );

  return (res.Items ?? [])
    .map((item) => item.userConcert as UserConcert)
    .filter(Boolean);
}

export async function getAllUserConcerts(userId: string): Promise<UserConcert[]> {
  const [saved, attended] = await Promise.all([
    getSavedConcertsForUser(userId),
    getAttendedConcertsForUser(userId),
  ]);

  const byEvent = new Map<string, UserConcert>();
  for (const uc of saved) byEvent.set(uc.concertId, uc);
  for (const uc of attended) byEvent.set(uc.concertId, uc);
  return [...byEvent.values()];
}

export async function submitConcertRating(
  eventId: string,
  userId: string,
  input: RatingInput,
  userConcertId?: string
): Promise<ConcertRating> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const now = new Date().toISOString();

  const existingRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: eventPk(eventId), sk: ratingSk(userId) },
    })
  );
  const existing = existingRes.Item?.rating as ConcertRating | undefined;

  const rating: ConcertRating = existing
    ? { ...existing, ...input, updatedAt: now }
    : {
        id: generateId('rating'),
        userId,
        concertId: eventId,
        userConcertId: userConcertId ?? generateId('uc'),
        ...input,
        createdAt: now,
        updatedAt: now,
      };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: eventPk(eventId),
        sk: ratingSk(userId),
        entityType: 'RATING',
        eventId,
        userId,
        rating,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
      },
    })
  );

  if (userConcertId) {
    await markConcertAttended(userId, { id: eventId });
  }

  return rating;
}

export async function getConcertRatingForUser(
  eventId: string,
  userId: string
): Promise<ConcertRating | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: eventPk(eventId), sk: ratingSk(userId) },
    })
  );
  return (res.Item?.rating as ConcertRating | undefined) ?? null;
}

export async function getConcertRatings(eventId: string): Promise<ConcertRating[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': eventPk(eventId),
        ':prefix': 'RATING#',
      },
    })
  );

  return (res.Items ?? [])
    .map((item) => item.rating as ConcertRating)
    .filter(Boolean);
}

export async function submitShowTimingReport(
  eventId: string,
  userId: string,
  input: ShowReportInput
): Promise<UserShowReport> {
  assertDynamoConfigured();
  const now = new Date().toISOString();
  const openerNames = input.openerNames ? parseOpenerNames(input.openerNames) : undefined;

  const report: UserShowReport = {
    id: generateId('sr'),
    eventId,
    userId,
    doorsOpenTime: input.doorsOpenTime
      ? (normalizeTime(input.doorsOpenTime) ?? input.doorsOpenTime.trim())
      : undefined,
    openerNames: openerNames?.length ? openerNames : undefined,
    openerStartTime: input.openerStartTime
      ? (normalizeTime(input.openerStartTime) ?? input.openerStartTime.trim())
      : undefined,
    headlinerStartTime: input.headlinerStartTime
      ? (normalizeTime(input.headlinerStartTime) ?? input.headlinerStartTime.trim())
      : undefined,
    endTime: input.endTime
      ? (normalizeTime(input.endTime) ?? input.endTime.trim())
      : undefined,
    notes: input.notes?.trim() || undefined,
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl?.trim() || undefined,
    confidence: input.confidence,
    createdAt: now,
    updatedAt: now,
  };

  const hasField =
    report.doorsOpenTime ||
    report.openerNames?.length ||
    report.openerStartTime ||
    report.headlinerStartTime ||
    report.endTime ||
    report.notes;

  if (!hasField) {
    throw new Error('Add at least one timing field or a note.');
  }

  const client = getDocClient();
  const tableName = getTableName();
  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: eventPk(eventId),
        sk: reportSk(report.id),
        entityType: 'SHOW_REPORT',
        eventId,
        userId,
        report,
        createdAt: report.createdAt,
        updatedAt: report.updatedAt,
      },
    })
  );

  const reports = await getShowTimingReports(eventId);
  const aggregated = aggregateShowReports(eventId, reports);
  await saveAggregatedShowTiming(eventId, aggregated);

  return report;
}

export async function getShowTimingReports(eventId: string): Promise<UserShowReport[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': eventPk(eventId),
        ':prefix': 'REPORT#',
      },
    })
  );

  return (res.Items ?? [])
    .map((item) => item.report as UserShowReport)
    .filter(Boolean);
}

export async function saveAggregatedShowTiming(
  eventId: string,
  aggregatedTiming: AggregatedShowTiming
): Promise<AggregatedShowTiming> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const now = new Date().toISOString();

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: eventPk(eventId),
        sk: 'AGGREGATED_TIMING',
        entityType: 'AGGREGATED_TIMING',
        eventId,
        aggregated: aggregatedTiming,
        updatedAt: now,
      },
    })
  );

  return aggregatedTiming;
}

export async function getAggregatedShowTiming(
  eventId: string
): Promise<AggregatedShowTiming | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const res = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: eventPk(eventId), sk: 'AGGREGATED_TIMING' },
    })
  );

  if (res.Item?.aggregated) {
    return res.Item.aggregated as AggregatedShowTiming;
  }

  const reports = await getShowTimingReports(eventId);
  if (!reports.length) return null;
  return aggregateShowReports(eventId, reports);
}

export async function getShowTimingResponse(
  eventId: string,
  userId?: string
): Promise<{
  reports: UserShowReport[];
  aggregated: AggregatedShowTiming;
  userReport: UserShowReport | null;
}> {
  const reports = await getShowTimingReports(eventId);
  const stored = await getAggregatedShowTiming(eventId);
  const aggregated = stored ?? aggregateShowReports(eventId, reports);
  const userReport = userId
    ? [...reports].reverse().find((r) => r.userId === userId) ?? null
    : null;
  return { reports, aggregated, userReport };
}
