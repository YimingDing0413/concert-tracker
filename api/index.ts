/**
 * Vercel serverless entry (@vercel/node + Express).
 * @see https://github.com/internetdrew/vite-express-vercel
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../server/app.js';

const app = createApp();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const done = () => resolve();
    res.once('finish', done);
    res.once('close', done);
    res.once('error', reject);
    try {
      app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
    } catch (err) {
      reject(err);
    }
  });
}

export const config = {
  maxDuration: 60,
};
