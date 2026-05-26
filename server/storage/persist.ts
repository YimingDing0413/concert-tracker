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

  if (memoryDb) return memoryDb;

  const fromDisk = loadUserDb();
  memoryDb = fromDisk;
  return fromDisk;
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
