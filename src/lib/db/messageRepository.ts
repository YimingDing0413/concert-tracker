/**
 * DynamoDB direct messaging — server-side only.
 *
 * Thread summary per participant:
 *   pk = USER#{userId}          sk = THREAD#{threadId}
 * Thread metadata:
 *   pk = THREAD#{threadId}     sk = META
 * Messages:
 *   pk = THREAD#{threadId}     sk = MESSAGE#{createdAt}#{messageId}
 */
import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  DirectMessage,
  MessageParticipantProfile,
  MessageThread,
  MessageThreadContext,
} from '../../../shared/types/index.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';
import { getSocialProfile } from './profileRepository.js';
import { getUserProfile } from './userRepository.js';

function userPk(userId: string): string {
  return `USER#${userId}`;
}

function threadPk(threadId: string): string {
  return `THREAD#${threadId}`;
}

function threadSummarySk(threadId: string): string {
  return `THREAD#${threadId}`;
}

function messageSk(createdAt: string, messageId: string): string {
  return `MESSAGE#${createdAt}#${messageId}`;
}

export function buildDmThreadId(userA: string, userB: string): string {
  const [a, b] = [userA, userB].sort();
  return `DM#${a}#${b}`;
}

function generateMessageId(): string {
  return `msg-${crypto.randomUUID().slice(0, 8)}`;
}

async function loadParticipantProfile(userId: string): Promise<MessageParticipantProfile> {
  const [social, auth] = await Promise.all([
    getSocialProfile(userId).catch(() => null),
    getUserProfile(userId).catch(() => null),
  ]);
  return {
    userId,
    username: social?.username ?? auth?.username,
    displayName: social?.displayName ?? auth?.displayName,
    avatarUrl: social?.avatarUrl ?? auth?.avatarUrl,
  };
}

function metaToThread(item: Record<string, unknown>, viewerExtras?: {
  lastReadAt?: string;
  unread?: boolean;
}): MessageThread {
  return {
    id: item.threadId as string,
    participantIds: item.participantIds as string[],
    participantProfiles: item.participantProfiles as MessageParticipantProfile[],
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
    lastMessageText: item.lastMessageText as string | undefined,
    lastMessageAt: item.lastMessageAt as string | undefined,
    lastMessageSenderId: item.lastMessageSenderId as string | undefined,
    contextType: item.contextType as MessageThread['contextType'],
    eventId: item.eventId as string | undefined,
    artistName: item.artistName as string | undefined,
    venueName: item.venueName as string | undefined,
    eventDate: item.eventDate as string | undefined,
    feedPostId: item.feedPostId as string | undefined,
    lastReadAt: viewerExtras?.lastReadAt,
    unread: viewerExtras?.unread,
  };
}

function isUnread(
  summary: Record<string, unknown>,
  meta: Record<string, unknown>
): boolean {
  const lastMessageAt = meta.lastMessageAt as string | undefined;
  const lastMessageSenderId = meta.lastMessageSenderId as string | undefined;
  const userId = summary.userId as string;
  const lastReadAt = summary.lastReadAt as string | undefined;
  if (!lastMessageAt || !lastMessageSenderId) return false;
  if (lastMessageSenderId === userId) return false;
  if (!lastReadAt) return true;
  return lastMessageAt > lastReadAt;
}

export async function getOrCreateDmThread(
  currentUserId: string,
  targetUserId: string,
  context?: MessageThreadContext
): Promise<MessageThread> {
  assertDynamoConfigured();
  if (currentUserId === targetUserId) {
    throw new Error('You cannot message yourself.');
  }

  const threadId = buildDmThreadId(currentUserId, targetUserId);
  const client = getDocClient();
  const tableName = getTableName();

  const existing = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: threadPk(threadId), sk: 'META' },
    })
  );

  if (existing.Item) {
    const summary = await client.send(
      new GetCommand({
        TableName: tableName,
        Key: { pk: userPk(currentUserId), sk: threadSummarySk(threadId) },
      })
    );
    return metaToThread(existing.Item, {
      lastReadAt: summary.Item?.lastReadAt as string | undefined,
      unread: summary.Item ? isUnread(summary.Item, existing.Item) : false,
    });
  }

  const now = new Date().toISOString();
  const [currentProfile, targetProfile] = await Promise.all([
    loadParticipantProfile(currentUserId),
    loadParticipantProfile(targetUserId),
  ]);

  const participantIds = [currentUserId, targetUserId].sort();
  const meta = {
    pk: threadPk(threadId),
    sk: 'META',
    entityType: 'MESSAGE_THREAD',
    threadId,
    participantIds,
    participantProfiles: [currentProfile, targetProfile],
    createdAt: now,
    updatedAt: now,
    contextType: context?.contextType,
    eventId: context?.eventId,
    artistName: context?.artistName,
    venueName: context?.venueName,
    eventDate: context?.eventDate,
    feedPostId: context?.feedPostId,
  };

  const summaries = participantIds.map((userId) => ({
    pk: userPk(userId),
    sk: threadSummarySk(threadId),
    entityType: 'MESSAGE_THREAD_SUMMARY',
    threadId,
    userId,
    otherUserId: userId === currentUserId ? targetUserId : currentUserId,
    createdAt: now,
    updatedAt: now,
    lastReadAt: now,
  }));

  await Promise.all([
    client.send(new PutCommand({ TableName: tableName, Item: meta })),
    ...summaries.map((item) =>
      client.send(new PutCommand({ TableName: tableName, Item: item }))
    ),
  ]);

  return metaToThread(meta, { lastReadAt: now, unread: false });
}

export async function getThreadsForUser(userId: string): Promise<MessageThread[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': userPk(userId),
        ':prefix': 'THREAD#',
      },
    })
  );

  const summaries = res.Items ?? [];
  const threads = await Promise.all(
    summaries.map(async (summary) => {
      const threadId = summary.threadId as string;
      const metaRes = await client.send(
        new GetCommand({
          TableName: tableName,
          Key: { pk: threadPk(threadId), sk: 'META' },
        })
      );
      if (!metaRes.Item) return null;
      return metaToThread(metaRes.Item, {
        lastReadAt: summary.lastReadAt as string | undefined,
        unread: isUnread(summary, metaRes.Item),
      });
    })
  );

  return threads
    .filter((t): t is MessageThread => Boolean(t))
    .sort((a, b) => (b.lastMessageAt ?? b.updatedAt).localeCompare(a.lastMessageAt ?? a.updatedAt));
}

export async function getThreadById(
  threadId: string,
  viewerUserId: string
): Promise<MessageThread | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const metaRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: threadPk(threadId), sk: 'META' },
    })
  );
  if (!metaRes.Item) return null;

  const participantIds = metaRes.Item.participantIds as string[];
  if (!participantIds.includes(viewerUserId)) return null;

  const summaryRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: userPk(viewerUserId), sk: threadSummarySk(threadId) },
    })
  );

  return metaToThread(metaRes.Item, {
    lastReadAt: summaryRes.Item?.lastReadAt as string | undefined,
    unread: summaryRes.Item ? isUnread(summaryRes.Item, metaRes.Item) : false,
  });
}

export async function getMessagesForThread(
  threadId: string,
  limit = 100
): Promise<DirectMessage[]> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();

  const res = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: {
        ':pk': threadPk(threadId),
        ':prefix': 'MESSAGE#',
      },
      ScanIndexForward: true,
      Limit: limit,
    })
  );

  return (res.Items ?? [])
    .map((item) => item.message as DirectMessage)
    .filter(Boolean);
}

export async function sendMessage(
  threadId: string,
  senderId: string,
  text: string
): Promise<DirectMessage> {
  assertDynamoConfigured();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Message text is required.');

  const client = getDocClient();
  const tableName = getTableName();

  const metaRes = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: threadPk(threadId), sk: 'META' },
    })
  );
  if (!metaRes.Item) throw new Error('Thread not found.');

  const participantIds = metaRes.Item.participantIds as string[];
  if (!participantIds.includes(senderId)) {
    throw new Error('Not a participant in this thread.');
  }

  const senderProfile = await loadParticipantProfile(senderId);
  const now = new Date().toISOString();
  const message: DirectMessage = {
    id: generateMessageId(),
    threadId,
    senderId,
    senderDisplayName: senderProfile.displayName ?? senderProfile.username,
    text: trimmed,
    createdAt: now,
    readBy: [senderId],
  };

  await client.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        pk: threadPk(threadId),
        sk: messageSk(now, message.id),
        entityType: 'DIRECT_MESSAGE',
        message,
        createdAt: now,
      },
    })
  );

  const metaUpdate = {
    ...metaRes.Item,
    updatedAt: now,
    lastMessageText: trimmed,
    lastMessageAt: now,
    lastMessageSenderId: senderId,
  };

  await client.send(new PutCommand({ TableName: tableName, Item: metaUpdate }));

  await Promise.all(
    participantIds.map(async (userId) => {
      const summaryKey = { pk: userPk(userId), sk: threadSummarySk(threadId) };
      const summaryRes = await client.send(
        new GetCommand({ TableName: tableName, Key: summaryKey })
      );
      if (!summaryRes.Item) return;
      await client.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            ...summaryRes.Item,
            updatedAt: now,
            lastMessageText: trimmed,
            lastMessageAt: now,
            lastMessageSenderId: senderId,
            lastReadAt: userId === senderId ? now : summaryRes.Item.lastReadAt,
          },
        })
      );
    })
  );

  return message;
}

export async function markThreadRead(threadId: string, userId: string): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  const tableName = getTableName();
  const now = new Date().toISOString();

  await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { pk: userPk(userId), sk: threadSummarySk(threadId) },
      UpdateExpression: 'SET lastReadAt = :now, updatedAt = :now',
      ExpressionAttributeValues: { ':now': now },
    })
  );
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  const threads = await getThreadsForUser(userId);
  return threads.filter((t) => t.unread).length;
}
