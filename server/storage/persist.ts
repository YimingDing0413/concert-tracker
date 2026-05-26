import type { UserConcert } from '../../shared/types/index.js';
import type { UserDb } from './fileStore.js';
import { isServerlessHost, loadUserDb, saveUserDb } from './fileStore.js';

const DB_KEY = 'encore-user-db';

/** In-process cache for serverless warm instances (not shared across all invocations). */
let memoryDb: UserDb | null = null;

export function usesUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Legacy Vercel KV env vars (Upstash via Vercel Storage / Marketplace) */
export function usesVercelKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function usesCloudStorage(): boolean {
  return usesUpstash() || usesVercelKv();
}

export function storageWarning(): string | undefined {
  if (!isServerlessHost()) return undefined;
  if (usesCloudStorage()) return undefined;
  return (
    'Persistent storage not configured. Add Upstash Redis in Vercel → Storage, connect to this project, and redeploy. ' +
    'Until then, user data may not persist across requests.'
  );
}

export async function loadPersistedDb(): Promise<UserDb> {
  if (usesUpstash()) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      const data = await redis.get<UserDb>(DB_KEY);
      if (data) {
        memoryDb = data;
        return data;
      }
    } catch (err) {
      console.warn('[storage] Upstash load failed:', err);
    }
  }

  if (usesVercelKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      const data = await kv.get<UserDb>(DB_KEY);
      if (data) {
        memoryDb = data;
        return data;
      }
    } catch (err) {
      console.warn('[storage] KV load failed:', err);
    }
  }

  // In-memory cache only for local disk / ephemeral serverless (not shared across instances).
  if (memoryDb) return memoryDb;

  const fromDisk = loadUserDb();
  memoryDb = fromDisk;
  return fromDisk;
}

function userConcertsRedisKey(userId: string): string {
  return `encore:ucs:${userId}`;
}

/** Per-user list — avoids whole-DB races on serverless. */
export async function loadUserConcertsForUser(userId: string): Promise<UserConcert[]> {
  if (usesUpstash()) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      const list = await redis.get<UserConcert[]>(userConcertsRedisKey(userId));
      if (list && Array.isArray(list)) return list;
    } catch (err) {
      console.warn('[storage] Upstash user concerts load failed:', err);
    }
  }

  if (usesVercelKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      const list = await kv.get<UserConcert[]>(userConcertsRedisKey(userId));
      if (list && Array.isArray(list)) return list;
    } catch (err) {
      console.warn('[storage] KV user concerts load failed:', err);
    }
  }

  const db = await loadPersistedDb();
  return db.userConcerts.filter((uc) => uc.userId === userId);
}

export async function saveUserConcertsForUser(userId: string, list: UserConcert[]): Promise<void> {
  if (usesUpstash()) {
    const { Redis } = await import('@upstash/redis');
    const redis = Redis.fromEnv();
    await redis.set(userConcertsRedisKey(userId), list);
  } else if (usesVercelKv()) {
    const { kv } = await import('@vercel/kv');
    await kv.set(userConcertsRedisKey(userId), list);
  }

  await mutatePersistedDb((db) => ({
    ...db,
    userConcerts: [...db.userConcerts.filter((uc) => uc.userId !== userId), ...list],
  }));
}

export async function savePersistedDb(db: UserDb): Promise<void> {
  memoryDb = db;

  if (usesUpstash()) {
    const { Redis } = await import('@upstash/redis');
    const redis = Redis.fromEnv();
    await redis.set(DB_KEY, db);
    return;
  }

  if (usesVercelKv()) {
    const { kv } = await import('@vercel/kv');
    await kv.set(DB_KEY, db);
    return;
  }

  saveUserDb(db);
}

/** Read-modify-write so concurrent serverless requests do not drop entries. */
export async function mutatePersistedDb(mutator: (db: UserDb) => UserDb): Promise<UserDb> {
  const current = await loadPersistedDb();
  const next = mutator({
    users: current.users ?? [],
    userConcerts: current.userConcerts ?? [],
    ratings: current.ratings ?? [],
    showReports: current.showReports ?? [],
  });
  await savePersistedDb(next);
  return next;
}

export function storageLabel(): string {
  if (usesUpstash()) return 'upstash-redis';
  if (usesVercelKv()) return 'vercel-kv';
  if (isServerlessHost()) return 'serverless-ephemeral';
  return 'local-file';
}
