import { createApp } from './app.js';
import { env } from './env.js';
import { ensureStorageReady } from './storage/userStorage.js';

const app = createApp();

async function start() {
  await ensureStorageReady();
  app.listen(env.port, () => {
    console.log(`Encore API server http://localhost:${env.port}`);
    console.log('API keys:', {
      ticketmaster: Boolean(env.ticketmasterApiKey),
      bandsintown: Boolean(env.bandsintownAppId),
      setlistfm: Boolean(env.setlistFmApiKey),
    });
  });
}

start();
