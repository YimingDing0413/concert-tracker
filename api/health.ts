/**
 * Lightweight health check — works even if the Express bundle fails to load.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { storageLabel } from '../server/storage/persist.js';

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse
): void {
  const body = JSON.stringify({
    ok: true,
    service: 'concert-tracker',
    handler: 'api/health.ts',
    apis: {
      ticketmaster: Boolean(process.env.TICKETMASTER_API_KEY),
      bandsintown: Boolean(process.env.BANDSINTOWN_APP_ID),
      setlistfm: Boolean(process.env.SETLISTFM_API_KEY),
    },
    storage: storageLabel(),
  });
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(body);
}
