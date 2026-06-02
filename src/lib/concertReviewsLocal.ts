import { apiFetchData } from '@/api/http';
import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

/** Fired after a successful bidirectional sync (detail: { userId }). */
export const REVIEWS_SYNCED_EVENT = 'encore-reviews-synced';

/**
 * Reviews are persisted to the user's account in DynamoDB (source of truth) and
 * mirrored to localStorage as a fast, offline cache. Reads are synchronous from
 * the cache; writes update the cache immediately and persist to the server.
 *
 * Photo data URLs stay in localStorage only — they are stripped before upload so
 * large payloads do not fail on Vercel/DynamoDB limits. Ratings, text, and tags
 * sync across devices; photos remain on the device that added them (MVP).
 */

/** Composite key: reviews are scoped per user + event */
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

/** Strip inline photos before upload — keeps request size within server limits. */
export function reviewForServer(review: ConcertReview): ConcertReview {
  const { photoDataUrls: _photos, ...rest } = review;
  return rest;
}

function mergeLocalPhotos(server: ConcertReview, local?: ConcertReview): ConcertReview {
  if (!local?.photoDataUrls?.length) return server;
  return { ...server, photoDataUrls: local.photoDataUrls };
}

export function generateReviewId(): string {
  return `review-${crypto.randomUUID().slice(0, 8)}`;
}

const LEGACY_USER_IDS = ['dev-user', 'user-demo'] as const;

/** Move reviews from placeholder accounts into the logged-in user (local cache only). */
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

/* ----------------------------- remote (DynamoDB) ----------------------------- */

async function fetchRemoteReviews(userId: string): Promise<ConcertReview[]> {
  return apiFetchData<ConcertReview[]>(
    `/api/user/reviews?userId=${encodeURIComponent(userId)}`
  );
}

async function persistRemoteReview(review: ConcertReview): Promise<void> {
  await apiFetchData<ConcertReview>('/api/user/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewForServer(review)),
  });
}

async function deleteRemoteReview(userId: string, eventId: string): Promise<void> {
  await apiFetchData<null>(
    `/api/user/reviews/${encodeURIComponent(eventId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

/** Push local reviews that are missing or newer than the server copy. */
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

/** Save to local cache and DynamoDB. Throws if the server write fails. */
export async function saveConcertReview(review: ConcertReview): Promise<void> {
  if (!review.userId) {
    throw new Error('ConcertReview.userId is required');
  }
  if (!review.eventId) {
    throw new Error('ConcertReview.eventId is required');
  }
  const store = readStore();
  store[reviewKey(review.userId, review.eventId)] = review;
  writeStore(store);
  await persistRemoteReview(review);
}

export function getConcertReview(userId: string, eventId: string): ConcertReview | null {
  if (!userId) return null;
  const raw = readStore()[reviewKey(userId, eventId)];
  if (!raw) return null;
  return normalizeReview(userId, reviewKey(userId, eventId), raw);
}

export function getAllConcertReviews(userId: string): ConcertReview[] {
  if (!userId) return [];
  const prefix = `${userId}::`;
  return Object.entries(readStore())
    .filter(([key]) => key.startsWith(prefix))
    .map(([key, review]) => normalizeReview(userId, key, review))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteConcertReview(userId: string, eventId: string): Promise<void> {
  if (!userId) return;
  const store = readStore();
  delete store[reviewKey(userId, eventId)];
  writeStore(store);
  try {
    await deleteRemoteReview(userId, eventId);
  } catch {
    /* removed locally; server delete may retry on next sync */
  }
}

/**
 * Bidirectional sync: push local-only/newer reviews to DynamoDB, then merge
 * remote into the local cache (newer copy wins per event). Safe to call often.
 */
export async function syncConcertReviewsFromServer(userId: string): Promise<ConcertReview[]> {
  if (!userId) return [];

  let remote: ConcertReview[] = [];
  try {
    remote = await fetchRemoteReviews(userId);
  } catch (err) {
    console.warn('[reviews] Could not fetch reviews from server', err);
    return getAllConcertReviews(userId);
  }

  try {
    await pushLocalReviewsToServer(userId, remote);
    remote = await fetchRemoteReviews(userId);
  } catch (err) {
    console.warn('[reviews] Could not push local reviews to server', err);
    /* still merge remote below */
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

  const merged = getAllConcertReviews(userId);
  notifySynced(userId);
  return merged;
}
