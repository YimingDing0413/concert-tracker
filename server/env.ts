import dotenv from 'dotenv';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

if (existsSync(resolve(root, '.env.local'))) {
  dotenv.config({ path: resolve(root, '.env.local') });
}
dotenv.config({ path: resolve(root, '.env') });

export const env = {
  port: Number(process.env.PORT ?? 3001),
  ticketmasterApiKey: process.env.TICKETMASTER_API_KEY ?? '',
  bandsintownAppId: process.env.BANDSINTOWN_APP_ID ?? '',
  setlistFmApiKey: process.env.SETLISTFM_API_KEY ?? '',
  awsRegion: process.env.AWS_REGION ?? '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
  dynamoTableName: process.env.DYNAMODB_TABLE_NAME ?? 'ConcertTracker',
  spotifyClientId: process.env.SPOTIFY_CLIENT_ID ?? '',
  spotifyClientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? '',
  spotifyRedirectUri: process.env.SPOTIFY_REDIRECT_URI ?? '',
};

export const hasTicketmaster = () => Boolean(env.ticketmasterApiKey);
export const hasBandsintown = () => Boolean(env.bandsintownAppId);
export const hasSetlistFm = () => Boolean(env.setlistFmApiKey);
export const hasDynamoDb = () =>
  Boolean(env.awsRegion && env.awsAccessKeyId && env.awsSecretAccessKey && env.dynamoTableName);
export const hasSpotify = () =>
  Boolean(env.spotifyClientId && env.spotifyClientSecret && env.spotifyRedirectUri);
