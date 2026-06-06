import type { Request } from 'express';
import { getCurrentUserFromRequest } from './getCurrentUser.js';
import { resolveUserId } from './devUser.js';

/** Prefer Bearer token identity; fall back to client userId for legacy callers. */
export async function resolveViewerUserId(req: Request): Promise<string> {
  const auth = await getCurrentUserFromRequest(req);
  if (auth) return auth.userId;
  return resolveUserId(req.query.userId);
}
