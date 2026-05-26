import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConcertRating, User, UserConcert, UserShowReport } from '../../shared/types/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = resolve(root, 'data');
const localDbPath = resolve(dataDir, 'user-db.json');

/** Vercel/serverless only allows writes under /tmp */
export function getUserDbPath(): string {
  if (process.env.VERCEL) {
    return '/tmp/encore-user-db.json';
  }
  return localDbPath;
}

export function isServerlessHost(): boolean {
  return Boolean(process.env.VERCEL);
}

export interface UserDb {
  users: User[];
  userConcerts: UserConcert[];
  ratings: ConcertRating[];
  showReports: UserShowReport[];
}

const defaultDb: UserDb = {
  users: [],
  userConcerts: [],
  ratings: [],
  showReports: [],
};

export function loadUserDb(): UserDb {
  const dbPath = getUserDbPath();
  try {
    if (!existsSync(dbPath)) return { ...defaultDb };
    const raw = readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw) as UserDb;
    return {
      users: parsed.users ?? [],
      userConcerts: parsed.userConcerts ?? [],
      ratings: parsed.ratings ?? [],
      showReports: parsed.showReports ?? [],
    };
  } catch (err) {
    console.warn(`[storage] Could not load ${dbPath}, starting fresh:`, err);
    return { ...defaultDb };
  }
}

export function saveUserDb(db: UserDb): void {
  const dbPath = getUserDbPath();
  const dir = dirname(dbPath);
  try {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EROFS' || code === 'EACCES') {
      throw new Error(
        'Cannot write user data on this host. Connect Upstash Redis in Vercel (Storage → Redis) and redeploy.'
      );
    }
    throw err;
  }
}
