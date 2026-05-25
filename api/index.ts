import serverless from 'serverless-http';
import { createApp } from '../server/app.js';
import { ensureStorageReady } from '../server/storage/userStorage.js';

const app = createApp();
const handler = serverless(app);

export default async function vercelHandler(...args: Parameters<typeof handler>) {
  await ensureStorageReady();
  return handler(...args);
}

export const config = {
  maxDuration: 60,
};
