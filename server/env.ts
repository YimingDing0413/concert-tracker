import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (existsSync(resolve(root, '.env.local'))) {
  dotenv.config({ path: resolve(root, '.env.local') });
}
dotenv.config({ path: resolve(root, '.env') });

/** Trim whitespace and optional surrounding quotes from env values (common on Vercel). */
export function envValue(key: string, fallback = ''): string {
  let v = (process.env[key] ?? fallback).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

export function authSecret(): string {
  return envValue('AUTH_SECRET', 'encore-dev-secret-change-in-production');
}

export const env = {
  port: Number(envValue('PORT', '3001')),
  ticketmasterApiKey: envValue('TICKETMASTER_API_KEY'),
  bandsintownAppId: envValue('BANDSINTOWN_APP_ID'),
  setlistFmApiKey: envValue('SETLISTFM_API_KEY'),
  awsRegion: envValue('AWS_REGION'),
  awsAccessKeyId: envValue('AWS_ACCESS_KEY_ID'),
  awsSecretAccessKey: envValue('AWS_SECRET_ACCESS_KEY'),
  dynamoTableName: envValue('DYNAMODB_TABLE_NAME', 'ConcertTracker'),
  spotifyClientId: envValue('SPOTIFY_CLIENT_ID'),
  spotifyClientSecret: envValue('SPOTIFY_CLIENT_SECRET'),
  spotifyRedirectUri: envValue('SPOTIFY_REDIRECT_URI'),
};

export const hasTicketmaster = () => Boolean(env.ticketmasterApiKey);
export const hasBandsintown = () => Boolean(env.bandsintownAppId);
export const hasSetlistFm = () => Boolean(env.setlistFmApiKey);
export const hasDynamoDb = () =>
  Boolean(env.awsRegion && env.awsAccessKeyId && env.awsSecretAccessKey && env.dynamoTableName);
export const hasSpotify = () =>
  Boolean(env.spotifyClientId && env.spotifyClientSecret && env.spotifyRedirectUri);
