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
  tableName: string;
}

let docClient: DynamoDBDocumentClient | null = null;

/** Trim whitespace and optional surrounding quotes from .env values. */
function envValue(key: string, fallback = ''): string {
  let v = (process.env[key] ?? fallback).trim();
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
  const missing: string[] = [];
  if (!process.env.AWS_REGION) missing.push('AWS_REGION');
  if (!process.env.AWS_ACCESS_KEY_ID) missing.push('AWS_ACCESS_KEY_ID');
  if (!process.env.AWS_SECRET_ACCESS_KEY) missing.push('AWS_SECRET_ACCESS_KEY');
  if (!process.env.DYNAMODB_TABLE_NAME) missing.push('DYNAMODB_TABLE_NAME');
  return missing;
}

export function getDocClient(): DynamoDBDocumentClient {
  if (!isDynamoConfigured()) {
    throw new Error(
      `DynamoDB is not configured. Missing: ${getMissingDynamoEnvVars().join(', ') || 'unknown'}`
    );
  }

  if (!docClient) {
    const cfg = getDynamoConfig();
    const base = new DynamoDBClient({
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId!,
        secretAccessKey: cfg.secretAccessKey!,
      },
    });
    docClient = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  return docClient;
}

export function getTableName(): string {
  return getDynamoConfig().tableName;
}

export { DynamoDBDocumentClient };
