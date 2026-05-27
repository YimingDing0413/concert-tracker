import * as store from '../storage/userStorage.js';

/** Temporary default user until real auth is wired end-to-end. */
export const DEV_USER_ID = 'dev-user';

function queryToString(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0].trim();
  return '';
}

export function resolveUserId(
  queryUserId?: unknown,
  bodyUserId?: string
): string {
  const fromQuery = queryToString(queryUserId);
  const fromBody = bodyUserId?.trim() ?? '';
  const fromSession = store.getSessionUserId() ?? '';
  // Prefer explicit client userId (localStorage session); avoid dev-user when logged in.
  if (fromBody || fromQuery) return fromBody || fromQuery;
  if (fromSession) return fromSession;
  return DEV_USER_ID;
}
