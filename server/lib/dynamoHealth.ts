import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  getDocClient,
  getDynamoConfig,
  getDynamoCredentialHint,
  getMissingDynamoEnvVars,
  getTableName,
  isDynamoConfigured,
} from '../../src/lib/db/dynamodb.js';

export interface DynamoHealthResult {
  ok: boolean;
  /** Safe for API responses — no secrets */
  error?: string;
  /** Actionable fix without exposing secrets */
  hint?: string;
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

export function isAwsCredentialError(err: unknown): boolean {
  const text =
    err instanceof Error
      ? `${err.name} ${err.message}`
      : typeof err === 'string'
        ? err
        : formatAwsError(err);
  return /UnrecognizedClientException|InvalidClientTokenId|ExpiredToken|InvalidSignatureException|SignatureDoesNotMatch|security token included in the request is invalid|The request signature we calculated/i.test(
    text
  );
}

export function dynamoCredentialUserMessage(): string {
  return (
    'Account storage credentials are invalid. In Vercel → Settings → Environment Variables, ' +
    'update AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (Production), then redeploy. ' +
    'Create fresh keys in AWS IAM → Users → Security credentials if the old ones were deleted.'
  );
}

function hintForError(formatted: string): string | undefined {
  const shapeHint = getDynamoCredentialHint();
  if (shapeHint) return shapeHint;
  if (isAwsCredentialError(formatted)) {
    return dynamoCredentialUserMessage();
  }
  if (/ResourceNotFoundException|Requested resource not found/i.test(formatted)) {
    return 'DYNAMODB_TABLE_NAME does not match a table in this region. Prod currently expects the exact table name (e.g. concert_tracker).';
  }
  return undefined;
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
    const error = formatAwsError(err);
    return {
      ok: false,
      error,
      hint: hintForError(error),
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
