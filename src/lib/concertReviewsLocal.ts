import { apiFetchData } from '@/api/http';
import {
  attachStoredPhotos,
  deleteReviewPhotosFromIdb,
  pickBestPhotos,
  prepareReviewForPersistence,
} from '@/lib/reviewPhotosIdb';
import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

/** Fired after a successful bidirectional sync (detail: { userId }). */
export const REVIEWS_SYNCED_EVENT = 'encore-reviews-synced';

/**
 * Reviews persist to DynamoDB (ratings, text, tags, compressed photos) with a
 * localStorage cache and IndexedDB backup for photos when storage quota is tight.
 */

function reviewKey(userId: string, eventId: string): string {
  return `${userId}::${eventId}`;
}

function readStore(): Record<string, ConcertReview> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, ConcertReview>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, ConcertReview>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function notifySynced(userId: string): void {
  window.dispatchEvent(
    new CustomEvent(REVIEWS_SYNCED_EVENT, { detail: { userId } })
  );
}

function normalizeReview(userId: string, key: string, review: ConcertReview): ConcertReview {
  const prefix = `${userId}::`;
  const eventIdFromKey = key.startsWith(prefix) ? key.slice(prefix.length) : review.eventId;
  return {
    ...review,
    userId,
    eventId: review.eventId || eventIdFromKey,
  };
}

function mergeLocalPhotos(server: ConcertReview, local?: ConcertReview): ConcertReview {
  const photoDataUrls = pickBestPhotos(local?.photoDataUrls, server.photoDataUrls);
  if (!photoDataUrls) return server;
  return { ...server, photoDataUrls };
}

export function generateReviewId(): string {
  return `review-${crypto.randomUUID().slice(0, 8)}`;
}

const LEGACY_USER_IDS = ['dev-user', 'user-demo'] as const;

export function migrateLegacyLocalReviews(toUserId: string): void {
  if (!toUserId) return;
  const store = readStore();
  let changed = false;

  for (const legacyId of LEGACY_USER_IDS) {
    if (legacyId === toUserId) continue;
    const prefix = `${legacyId}::`;
    for (const [key, raw] of Object.entries(store)) {
      if (!key.startsWith(prefix)) continue;
      const eventId = key.slice(prefix.length);
      const targetKey = reviewKey(toUserId, eventId);
      const existing = store[targetKey];
      const incoming = normalizeReview(legacyId, key, raw);
      if (
        !existing ||
        (incoming.updatedAt ?? '') >= (existing.updatedAt ?? '')
      ) {
        store[targetKey] = { ...incoming, userId: toUserId };
      }
      delete store[key];
      changed = true;
    }
  }

  if (changed) writeStore(store);
}

async function enrichAllReviews(reviews: ConcertReview[]): Promise<ConcertReview[]> {
  return Promise.all(reviews.map((r) => attachStoredPhotos(r)));
}

/* ----------------------------- remote (DynamoDB) ----------------------------- */

async function fetchRemoteReviews(userId: string): Promise<ConcertReview[]> {
  return apiFetchData<ConcertReview[]>(
    `/api/user/reviews?userId=${encodeURIComponent(userId)}`
  );
}

async function persistRemoteReview(review: ConcertReview): Promise<void> {
  await apiFetchData<ConcertReview>('/api/user/reviews', {
    method: 'POST',
    body: JSON.stringify(review),
  });
}

async function deleteRemoteReview(userId: string, eventId: string): Promise<void> {
  await apiFetchData<null>(
    `/api/user/reviews/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

async function pushLocalReviewsToServer(
  userId: string,
  remote: ConcertReview[]
): Promise<void> {
  const remoteByEvent = new Map(remote.map((r) => [r.eventId, r]));
  const local = getAllConcertReviews(userId);
  const pending = local.filter((localReview) => {
    const serverReview = remoteByEvent.get(localReview.eventId);
    if (!serverReview) return true;
    return (localReview.updatedAt ?? '') > (serverReview.updatedAt ?? '');
  });

  if (pending.length === 0) return;

  const results = await Promise.allSettled(
    pending.map((review) => persistRemoteReview({ ...review, userId }))
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(
      `[reviews] ${failed.length}/${pending.length} review(s) failed to upload`,
      failed.map((r) => (r.status === 'rejected' ? r.reason : null))
    );
  }
  if (failed.length === pending.length) {
    throw failed[0].reason;
  }
}

/* ------------------------------- cache + writes ------------------------------ */

export async function saveConcertReview(review: ConcertReview): Promise<void> {
  if (!review.userId) {
    throw new Error('ConcertReview.userId is required');
  }
  if (!review.eventId) {
    throw new Error('ConcertReview.eventId is required');
  }

  const prepared = await prepareReviewForPersistence(review);
  const key = reviewKey(prepared.userId, prepared.eventId);
  const store = readStore();
  store[key] = prepared;

  try {
    writeStore(store);
  } catch {
    store[key] = { ...prepared, photoDataUrls: undefined };
    writeStore(store);
  }

  await persistRemoteReview(prepared);
}

export function getConcertReview(userId: string, eventId: string): ConcertReview | null {
  if (!userId) return null;
  const raw = readStore()[reviewKey(userId, eventId)];
  if (!raw) return null;
  return normalizeReview(userId, reviewKey(userId, eventId), raw);
}

/** Load review with photos from localStorage + IndexedDB. */
export async function getConcertReviewWithPhotos(
  userId: string,
  eventId: string
): Promise<ConcertReview | null> {
  const base = getConcertReview(userId, eventId);
  if (!base) return null;
  return attachStoredPhotos(base);
}

export function getAllConcertReviews(userId: string): ConcertReview[] {
  if (!userId) return [];
  const prefix = `${userId}::`;
  return Object.entries(readStore())
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, review]) => normalizeReview(userId, key, review))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAllConcertReviewsWithPhotos(
  userId: string
): Promise<ConcertReview[]> {
  return enrichAllReviews(getAllConcertReviews(userId));
}

export async function deleteConcertReview(userId: string, eventId: string): Promise<void> {
  if (!userId) return;
  const store = readStore();
  delete store[reviewKey(userId, eventId)];
  writeStore(store);
  await deleteReviewPhotosFromIdb(userId, eventId);
  try {
    await deleteRemoteReview(userId, eventId);
  } catch {
    /* removed locally */
  }
}

export async function syncConcertReviewsFromServer(userId: string): Promise<ConcertReview[]> {
  if (!userId) return [];

  let remote: ConcertReview[] = [];
  try {
    remote = await fetchRemoteReviews(userId);
  } catch (err) {
    console.warn('[reviews] Could not fetch reviews from server', err);
    return enrichAllReviews(getAllConcertReviews(userId));
  }

  try {
    await pushLocalReviewsToServer(userId, remote);
    remote = await fetchRemoteReviews(userId);
  } catch (err) {
    console.warn('[reviews] Could not push local reviews to server', err);
  }

  const localByEvent = new Map(
    getAllConcertReviews(userId).map((r) => [r.eventId, r] as const)
  );

  const byEvent = new Map<string, ConcertReview>();
  for (const [eventId, local] of localByEvent) {
    byEvent.set(eventId, local);
  }
  for (const r of remote) {
    const local = localByEvent.get(r.eventId);
    const normalized = mergeLocalPhotos({ ...r, userId }, local);
    if (!local || (r.updatedAt ?? '') >= (local.updatedAt ?? '')) {
      byEvent.set(r.eventId, normalized);
    }
  }

  const store = readStore();
  for (const [eventId, review] of byEvent) {
    store[reviewKey(userId, eventId)] = review;
  }
  writeStore(store);

  const merged = await enrichAllReviews(getAllConcertReviews(userId));

  for (const review of merged) {
    store[reviewKey(userId, review.eventId)] = review;
  }
  try {
    writeStore(store);
  } catch {
    for (const review of merged) {
      store[reviewKey(userId, review.eventId)] = {
        ...review,
        photoDataUrls: undefined,
      };
    }
    writeStore(store);
  }

  notifySynced(userId);
  return merged;
}
