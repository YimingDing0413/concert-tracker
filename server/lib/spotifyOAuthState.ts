import crypto from 'node:crypto';

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  return process.env.AUTH_SECRET?.trim() || 'encore-dev-secret-change-in-production';
}

/** Signed OAuth state embedding userId — no cookies required. */
export function createSpotifyOAuthState(userId: string): string {
  const nonce = crypto.randomUUID();
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}:${nonce}:${exp}`;
  const sig = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

export function verifySpotifyOAuthState(state: string): string | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const lastColon = decoded.lastIndexOf(':');
    if (lastColon <= 0) return null;
    const sig = decoded.slice(lastColon + 1);
    const rest = decoded.slice(0, lastColon);
    const expSep = rest.lastIndexOf(':');
    if (expSep <= 0) return null;
    const exp = Number(rest.slice(expSep + 1));
    const beforeExp = rest.slice(0, expSep);
    const nonceSep = beforeExp.lastIndexOf(':');
    if (nonceSep <= 0) return null;
    const userId = beforeExp.slice(0, nonceSep);
    const nonce = beforeExp.slice(nonceSep + 1);
    if (!userId || !nonce || !Number.isFinite(exp) || Date.now() > exp) return null;
    const payload = `${userId}:${nonce}:${exp}`;
    const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
    if (sig !== expected) return null;
    return userId;
  } catch {
    return null;
  }
}
