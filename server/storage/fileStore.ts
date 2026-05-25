import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ConcertRating, User, UserConcert } from '../../shared/types/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dataDir = resolve(root, 'data');
const dbPath = resolve(dataDir, 'user-db.json');

export interface UserDb {
  users: User[];
  userConcerts: UserConcert[];
  ratings: ConcertRating[];
}

const defaultDb: UserDb = {
  users: [],
  userConcerts: [],
  ratings: [],
};

export function loadUserDb(): UserDb {
  try {
    if (!existsSync(dbPath)) return { ...defaultDb };
    const raw = readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw) as UserDb;
    return {
      users: parsed.users ?? [],
      userConcerts: parsed.userConcerts ?? [],
      ratings: parsed.ratings ?? [],
    };
  } catch (err) {
    console.warn('[storage] Could not load user-db.json, starting fresh:', err);
    return { ...defaultDb };
  }
}

export function saveUserDb(db: UserDb): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8');
}
