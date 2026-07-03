import crypto from 'node:crypto';
import { authSecret } from '../env.js';

const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createAuthToken(userId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}:${exp}`;
  const sig = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifyAuthToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon <= 0) return null;
    const sig = decoded.slice(lastColon + 1);
    const rest = decoded.slice(0, lastColon);
    const expSep = rest.lastIndexOf(':');
    if (expSep <= 0) return null;
    const userId = rest.slice(0, expSep);
    const exp = Number(rest.slice(expSep + 1));
    if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
    const payload = `${userId}:${exp}`;
    const expected = crypto.createHmac('sha256', authSecret()).update(payload).digest('base64url');
    if (sig !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}
