/**
 * Lightweight health check — works even if the Express bundle fails to load.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { checkDynamoHealth } from '../server/lib/dynamoHealth.js';
import { isDynamoConfigured } from '../src/lib/db/dynamodb.js';
import { storageLabel } from '../server/storage/persist.js';

export default async function handler(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const dynamoConfigured = isDynamoConfigured();
  const dynamo = dynamoConfigured
    ? await checkDynamoHealth()
    : { ok: false as const, error: 'DynamoDB env vars not set' };

  const body = JSON.stringify({
    ok: true,
    service: 'concert-tracker',
    handler: 'api/health.ts',
    apis: {
      ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
      bandsintown: Boolean(process.env.BANDSINTOWN_APP_ID),
      setlistfm: Boolean(process.env.SETLISTFM_API_KEY),
      dynamodb: dynamo.ok,
      spotify: Boolean(
        process.env.SPOTIFY_CLIENT_ID &&
          process.env.SPOTIFY_CLIENT_SECRET &&
          process.env.SPOTIFY_REDIRECT_URI
      ),
    },
    storage: storageLabel(),
    dynamodbConfigured: dynamoConfigured,
    dynamodbRegion: dynamo.region,
    dynamodbTable: dynamo.tableName,
    dynamodbError: dynamo.ok ? undefined : dynamo.error,
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}
