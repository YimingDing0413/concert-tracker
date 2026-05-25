/**
 * Vercel serverless entry — export the Express app directly (no serverless-http).
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import { createApp } from '../server/app.js';

export default createApp();

export const config = {
  maxDuration: 60,
};
