import type {
  Concert,
  ConcertRating,
  RatingInput,
  SignUpInput,
  User,
  UserConcert,
  UserConcertStatus,
  ManualConcertInput,
} from '../../shared/types/index.js';
import { loadPersistedDb, savePersistedDb } from './persist.js';
import { getEventById } from '../services/eventService.js';
import { concertEventToConcert } from '../../shared/mappers.js';

const AUTH_KEY = 'encore_auth_user_id';

export const DEMO_USER: User = {
  id: 'user-demo',
  email: 'user@example.com',
  displayName: 'Demo user',
  username: 'demouser',
  bio: 'Placeholder profile.',
  createdAt: '2024-01-15T10:00:00Z',
};

let users: User[] = [];
let userConcerts: UserConcert[] = [];
let ratings: ConcertRating[] = [];
const sessions = new Map<string, string>();
let storageReady: Promise<void> | null = null;

async function hydrate() {
  const db = await loadPersistedDb();
  users = db.users.length ? db.users : [DEMO_USER];
  userConcerts = db.userConcerts;
  ratings = db.ratings;
  if (!users.some((u) => u.id === DEMO_USER.id)) {
    users = [DEMO_USER, ...users];
    await persist();
  }
}

export function ensureStorageReady(): Promise<void> {
  if (!storageReady) storageReady = hydrate();
  return storageReady;
}

async function persist() {
  await savePersistedDb({ users, userConcerts, ratings });
}

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

async function fetchConcertSnapshot(concertId: string): Promise<Partial<Concert> | undefined> {
  try {
    const res = await getEventById(concertId);
    return concertEventToConcert(res.data) as Partial<Concert>;
  } catch {
    return undefined;
  }
}

export async function login(email: string): Promise<User> {
  await ensureStorageReady();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? DEMO_USER;
  sessions.set(AUTH_KEY, user.id);
  return user;
}

export async function signUp(input: SignUpInput): Promise<User> {
  await ensureStorageReady();
  if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }
  const user: User = {
    id: generateId('user'),
    email: input.email,
    displayName: input.displayName,
    username: input.username,
    createdAt: new Date().toISOString(),
  };
  users = [...users, user];
  await persist();
  sessions.set(AUTH_KEY, user.id);
  return user;
}

export function getSessionUserId(): string | null {
  return sessions.get(AUTH_KEY) ?? null;
}

export async function logout(): Promise<void> {
  await ensureStorageReady();
  sessions.delete(AUTH_KEY);
}

export async function getCurrentUser(): Promise<User | null> {
  await ensureStorageReady();
  const id = getSessionUserId();
  return id ? users.find((u) => u.id === id) ?? null : null;
}

export async function getUserConcerts(userId: string): Promise<UserConcert[]> {
  await ensureStorageReady();
  return userConcerts.filter((uc) => uc.userId === userId);
}

export async function setConcertStatus(
  userId: string,
  concertId: string,
  status: UserConcertStatus
): Promise<UserConcert> {
  await ensureStorageReady();
  const existing = userConcerts.find((uc) => uc.userId === userId && uc.concertId === concertId);
  const now = new Date().toISOString();
  const snapshot =
    existing?.concertSnapshot ?? (await fetchConcertSnapshot(concertId));

  const uc: UserConcert = existing
    ? { ...existing, status, concertSnapshot: snapshot ?? existing.concertSnapshot, updatedAt: now }
    : {
        id: generateId('uc'),
        userId,
        concertId,
        status,
        concertSnapshot: snapshot,
        createdAt: now,
        updatedAt: now,
      };

  const idx = userConcerts.findIndex((u) => u.id === uc.id);
  userConcerts =
    idx >= 0 ? userConcerts.map((u, i) => (i === idx ? uc : u)) : [...userConcerts, uc];
  await persist();
  return uc;
}

export async function addManualConcert(userId: string, input: ManualConcertInput) {
  await ensureStorageReady();
  const now = new Date().toISOString();
  const manualId = generateId('manual');
  const manualConcert: Partial<Concert> = {
    id: manualId,
    artistName: input.artistName,
    venueName: input.venueName,
    city: input.city,
    state: input.state,
    country: input.country ?? 'USA',
    date: input.date,
    startTime: input.startTime,
    openers: input.openers ? [input.openers] : undefined,
    status: input.date >= new Date().toISOString().slice(0, 10) ? 'upcoming' : 'past',
  };
  const uc: UserConcert = {
    id: generateId('uc'),
    userId,
    concertId: manualId,
    status: input.status,
    isManual: true,
    manualConcert,
    concertSnapshot: manualConcert,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };
  userConcerts = [...userConcerts, uc];
  await persist();
  return uc;
}

export async function getRating(userId: string, concertId: string) {
  await ensureStorageReady();
  return ratings.find((r) => r.userId === userId && r.concertId === concertId) ?? null;
}

export async function saveRating(
  userId: string,
  userConcertId: string,
  concertId: string,
  input: RatingInput
) {
  await ensureStorageReady();
  const existing = ratings.find((r) => r.userId === userId && r.concertId === concertId);
  const now = new Date().toISOString();
  const rating: ConcertRating = existing
    ? { ...existing, ...input, updatedAt: now }
    : {
        id: generateId('rating'),
        userId,
        concertId,
        userConcertId,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
  const idx = ratings.findIndex((r) => r.id === rating.id);
  ratings = idx >= 0 ? ratings.map((r, i) => (i === idx ? rating : r)) : [...ratings, rating];
  const ucIdx = userConcerts.findIndex((u) => u.id === userConcertId);
  if (ucIdx >= 0) {
    userConcerts = userConcerts.map((u, i) =>
      i === ucIdx ? { ...u, ratingId: rating.id, status: 'attended' } : u
    );
  }
  await persist();
  return rating;
}
