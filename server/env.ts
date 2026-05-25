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
};

export const hasTicketmaster = () => Boolean(env.ticketmasterApiKey);
export const hasBandsintown = () => Boolean(env.bandsintownAppId);
export const hasSetlistFm = () => Boolean(env.setlistFmApiKey);
