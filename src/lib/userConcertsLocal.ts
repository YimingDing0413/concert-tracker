import type { UserConcert } from '@/types';

function storageKey(userId: string): string {
  return `encore_user_concerts_${userId}`;
}

export function readLocalUserConcerts(userId: string): UserConcert[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserConcert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalUserConcerts(userId: string, list: UserConcert[]): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(list));
}

export function upsertLocalUserConcert(uc: UserConcert): UserConcert[] {
  const list = readLocalUserConcerts(uc.userId);
  const idx = list.findIndex(
    (item) => item.id === uc.id || (item.userId === uc.userId && item.concertId === uc.concertId)
  );
  const next =
    idx >= 0 ? list.map((item, i) => (i === idx ? uc : item)) : [...list, uc];
  writeLocalUserConcerts(uc.userId, next);
  return next;
}

export function removeLocalUserConcert(userId: string, userConcertId: string): void {
  const next = readLocalUserConcerts(userId).filter((uc) => uc.id !== userConcertId);
  writeLocalUserConcerts(userId, next);
}

/** Merge server and local lists; keep the newer copy per user+concert. */
export function mergeUserConcerts(server: UserConcert[], local: UserConcert[]): UserConcert[] {
  const map = new Map<string, UserConcert>();
  for (const uc of server) {
    map.set(`${uc.userId}:${uc.concertId}`, uc);
  }
  for (const uc of local) {
    const key = `${uc.userId}:${uc.concertId}`;
    const existing = map.get(key);
    if (!existing || uc.updatedAt >= existing.updatedAt) {
      map.set(key, uc);
    }
  }
  return [...map.values()];
}
