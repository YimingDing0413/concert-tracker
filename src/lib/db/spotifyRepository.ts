/**
 * DynamoDB Spotify connection + taste profile — server-side only.
 *
 *   pk = USER#{userId}   sk = SPOTIFY#CONNECTION
 *   pk = USER#{userId}   sk = SPOTIFY#TASTE_PROFILE
 */
import { DeleteCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import type {
  SpotifyConnection,
  SpotifyTasteProfile,
  SpotifyConnectionStatus,
} from '../../../shared/types/spotify.js';
import { assertDynamoConfigured, getDocClient, getTableName } from './dynamodb.js';

const CONNECTION_SK = 'SPOTIFY#CONNECTION';
const TASTE_SK = 'SPOTIFY#TASTE_PROFILE';

function userPk(userId: string): string {
  return `USER#${userId}`;
}

export async function getSpotifyConnection(userId: string): Promise<SpotifyConnection | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const res = await client.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk: userPk(userId), sk: CONNECTION_SK },
    })
  );
  if (!res.Item) return null;
  return res.Item as unknown as SpotifyConnection;
}

export async function saveSpotifyConnection(connection: SpotifyConnection): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        pk: userPk(connection.userId),
        sk: CONNECTION_SK,
        entityType: 'SPOTIFY_CONNECTION',
        ...connection,
      },
    })
  );
}

export async function deleteSpotifyConnection(userId: string): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  await client.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { pk: userPk(userId), sk: CONNECTION_SK },
    })
  );
}

export async function getSpotifyTasteProfile(userId: string): Promise<SpotifyTasteProfile | null> {
  assertDynamoConfigured();
  const client = getDocClient();
  const res = await client.send(
    new GetCommand({
      TableName: getTableName(),
      Key: { pk: userPk(userId), sk: TASTE_SK },
    })
  );
  if (!res.Item) return null;
  const { pk: _pk, sk: _sk, entityType: _et, ...profile } = res.Item;
  return profile as SpotifyTasteProfile;
}

export async function saveSpotifyTasteProfile(profile: SpotifyTasteProfile): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  await client.send(
    new PutCommand({
      TableName: getTableName(),
      Item: {
        pk: userPk(profile.userId),
        sk: TASTE_SK,
        entityType: 'SPOTIFY_TASTE_PROFILE',
        ...profile,
      },
    })
  );
}

export async function deleteSpotifyTasteProfile(userId: string): Promise<void> {
  assertDynamoConfigured();
  const client = getDocClient();
  await client.send(
    new DeleteCommand({
      TableName: getTableName(),
      Key: { pk: userPk(userId), sk: TASTE_SK },
    })
  );
}

export async function getSpotifyConnectionStatus(userId: string): Promise<SpotifyConnectionStatus> {
  const [connection, taste] = await Promise.all([
    getSpotifyConnection(userId),
    getSpotifyTasteProfile(userId),
  ]);
  if (!connection) {
    return { connected: false, hasTasteProfile: false };
  }
  return {
    connected: true,
    spotifyDisplayName: connection.spotifyDisplayName,
    spotifyUserId: connection.spotifyUserId,
    scopes: connection.scopes,
    connectedAt: connection.connectedAt,
    lastSyncedAt: taste?.lastSyncedAt,
    hasTasteProfile: Boolean(taste?.topArtists?.length),
  };
}

export async function disconnectSpotify(userId: string): Promise<void> {
  await Promise.all([deleteSpotifyConnection(userId), deleteSpotifyTasteProfile(userId)]);
}
