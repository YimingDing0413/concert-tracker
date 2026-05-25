/**
 * Vercel serverless entry — export the Express app directly (no serverless-http).
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import { createApp } from '../server/app.js';
import { ensureStorageReady } from '../server/storage/userStorage.js';

let storageInit: Promise<void> | null = null;

async function initStorage() {
  if (!storageInit) {
    storageInit = ensureStorageReady().catch((err) => {
      console.error('[api] Storage init failed (auth may still work):', err);
      storageInit = null;
    });
  }
  await storageInit;
}

const app = createApp();

app.use(async (_req, _res, next) => {
  await initStorage();
  next();
});

export default app;

export const config = {
  maxDuration: 60,
};
