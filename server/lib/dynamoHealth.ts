import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  getDocClient,
  getDynamoConfig,
  getMissingDynamoEnvVars,
  getTableName,
  isDynamoConfigured,
} from '../../src/lib/db/dynamodb.js';

export interface DynamoHealthResult {
  ok: boolean;
  /** Safe for API responses — no secrets */
  error?: string;
  tableName?: string;
  region?: string;
}

function formatAwsError(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { name?: string; message?: string; Code?: string };
    const name = e.name ?? e.Code ?? 'Error';
    const message = e.message ?? String(err);
    return `${name}: ${message}`;
  }
  return String(err);
}

export async function checkDynamoHealth(): Promise<DynamoHealthResult> {
  if (!isDynamoConfigured()) {
    return {
      ok: false,
      error: `Missing env: ${getMissingDynamoEnvVars().join(', ')}`,
    };
  }

  const cfg = getDynamoConfig();
  try {
    const client = getDocClient();
    await client.send(
      new GetCommand({
        TableName: getTableName(),
        Key: { pk: 'HEALTH#CHECK', sk: 'PING' },
      })
    );
    return { ok: true, tableName: cfg.tableName, region: cfg.region };
  } catch (err) {
    console.warn('[dynamodb] Health check failed:', err);
    return {
      ok: false,
      error: formatAwsError(err),
      tableName: cfg.tableName,
      region: cfg.region,
    };
  }
}

export function dynamoEnvStatus(): { configured: boolean; missing: string[] } {
  return {
    configured: isDynamoConfigured(),
    missing: getMissingDynamoEnvVars(),
  };
}
