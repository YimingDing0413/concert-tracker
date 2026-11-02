/**
 * Server-side DynamoDB client — import only from Express routes / server code.
 * Never import this module from React UI code.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export interface DynamoConfig {
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  tableName: string;
}

let docClient: DynamoDBDocumentClient | null = null;
let docClientFingerprint: string | null = null;

/** Trim whitespace, quotes, newlines, and invisible chars from .env / Vercel values. */
function envValue(key: string, fallback = ''): string {
  let v = (process.env[key] ?? fallback)
    .replace(/^\uFEFF/, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\r?\n/g, '')
    .trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function getDynamoConfig(): DynamoConfig {
  return {
    region: envValue('AWS_REGION'),
    accessKeyId: envValue('AWS_ACCESS_KEY_ID'),
    secretAccessKey: envValue('AWS_SECRET_ACCESS_KEY'),
    sessionToken: envValue('AWS_SESSION_TOKEN') || undefined,
    tableName: envValue('DYNAMODB_TABLE_NAME', 'ConcertTracker'),
  };
}

export function isDynamoConfigured(): boolean {
  const { region, accessKeyId, secretAccessKey, tableName } = getDynamoConfig();
  return Boolean(region && accessKeyId && secretAccessKey && tableName);
}

export function assertDynamoConfigured(): void {
  if (!isDynamoConfigured()) {
    throw new Error(
      `DynamoDB is not configured. Missing: ${getMissingDynamoEnvVars().join(', ') || 'unknown'}`
    );
  }
}

export function getMissingDynamoEnvVars(): string[] {
  const cfg = getDynamoConfig();
  const missing: string[] = [];
  if (!cfg.region) missing.push('AWS_REGION');
  if (!cfg.accessKeyId) missing.push('AWS_ACCESS_KEY_ID');
  if (!cfg.secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!cfg.tableName) missing.push('DYNAMODB_TABLE_NAME');
  return missing;
}

/** Safe, non-secret hints for /api/health when credentials look wrong. */
export function getDynamoCredentialHint(): string | undefined {
  const { accessKeyId, sessionToken } = getDynamoConfig();
  if (!accessKeyId) return undefined;
  if (accessKeyId.startsWith('ASIA') && !sessionToken) {
    return 'AWS_ACCESS_KEY_ID looks temporary (ASIA…) but AWS_SESSION_TOKEN is missing. Use long-lived IAM user keys (AKIA…) or add the session token.';
  }
  if (!accessKeyId.startsWith('AKIA') && !accessKeyId.startsWith('ASIA')) {
    return 'AWS_ACCESS_KEY_ID does not look like an IAM access key (expected AKIA… or ASIA…). Re-copy from AWS IAM → Security credentials.';
  }
  return undefined;
}

function clientFingerprint(cfg: DynamoConfig): string {
  return [
    cfg.region,
    cfg.accessKeyId,
    cfg.secretAccessKey,
    cfg.sessionToken ?? '',
    cfg.tableName,
  ].join('|');
}

export function getDocClient(): DynamoDBDocumentClient {
  if (!isDynamoConfigured()) {
    throw new Error(
      `DynamoDB is not configured. Missing: ${getMissingDynamoEnvVars().join(', ') || 'unknown'}`
    );
  }

  const cfg = getDynamoConfig();
  const fingerprint = clientFingerprint(cfg);
  if (!docClient || docClientFingerprint !== fingerprint) {
    const base = new DynamoDBClient({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId!,
        secretAccessKey: cfg.secretAccessKey!,
        ...(cfg.sessionToken ? { sessionToken: cfg.sessionToken } : {}),
      },
    });
    docClient = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
    docClientFingerprint = fingerprint;
  }

  return docClient;
}

export function getTableName(): string {
  return getDynamoConfig().tableName;
}

export { DynamoDBDocumentClient };
