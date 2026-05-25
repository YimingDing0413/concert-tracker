import {
  DEMO_USER,
  mockRatings,
  mockUserConcerts,
  mockUsers,
} from '@/data';
import type { ConcertRating, User, UserConcert } from '@/types';

const AUTH_KEY = 'encore_auth_user_id';

export function getStoredUserId(): string | null {
  return localStorage.getItem(AUTH_KEY);
}

export function setStoredUserId(userId: string | null): void {
  if (userId) localStorage.setItem(AUTH_KEY, userId);
  else localStorage.removeItem(AUTH_KEY);
}

/** In-memory store — persists auth id only; resets on refresh except login */
let users = [...mockUsers];
let userConcerts = [...mockUserConcerts];
let ratings = [...mockRatings];

export function getUsers() {
  return users;
}

export function getUserConcerts() {
  return userConcerts;
}

export function getRatings() {
  return ratings;
}

export function addUser(user: User) {
  users = [...users, user];
}

export function upsertUserConcert(uc: UserConcert) {
  const idx = userConcerts.findIndex((u) => u.id === uc.id);
  userConcerts =
    idx >= 0
      ? userConcerts.map((u, i) => (i === idx ? uc : u))
      : [...userConcerts, uc];
}

export function removeUserConcertById(id: string) {
  userConcerts = userConcerts.filter((u) => u.id !== id);
}

export function upsertRating(r: ConcertRating) {
  const idx = ratings.findIndex((x) => x.id === r.id);
  ratings = idx >= 0 ? ratings.map((x, i) => (i === idx ? r : x)) : [...ratings, r];
}

export function findUserByEmail(email: string): User | undefined {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getDemoUser() {
  return DEMO_USER;
}
