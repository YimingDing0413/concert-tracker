import type { UserDb } from './fileStore.js';
import { loadUserDb, saveUserDb } from './fileStore.js';

const DB_KEY = 'encore-user-db';

export function usesUpstash(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

/** Legacy Vercel KV env vars (migrated stores) */
export function usesVercelKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export function usesCloudStorage(): boolean {
  return usesUpstash() || usesVercelKv();
}

export async function loadPersistedDb(): Promise<UserDb> {
  if (usesUpstash()) {
    try {
      const { Redis } = await import('@upstash/redis');
      const redis = Redis.fromEnv();
      const data = await redis.get<UserDb>(DB_KEY);
      if (data) return data;
    } catch (err) {
      console.warn('[storage] Upstash load failed:', err);
    }
  }

  if (usesVercelKv()) {
    try {
      const { kv } = await import('@vercel/kv');
      const data = await kv.get<UserDb>(DB_KEY);
      if (data) return data;
    } catch (err) {
      console.warn('[storage] KV load failed:', err);
    }
  }

  return loadUserDb();
}

export async function savePersistedDb(db: UserDb): Promise<void> {
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

export function storageLabel(): string {
  if (usesUpstash()) return 'upstash-redis';
  if (usesVercelKv()) return 'vercel-kv';
  return 'local-file';
}
