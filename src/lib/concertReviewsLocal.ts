import { apiFetchData } from '@/api/http';
import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

/** Fired after a successful bidirectional sync (detail: { userId }). */
export const REVIEWS_SYNCED_EVENT = 'encore-reviews-synced';

/**
 * Reviews are persisted to the user's account in DynamoDB (source of truth) and
 * mirrored to localStorage as a fast, offline cache. Reads are synchronous from
 * the cache; writes update the cache immediately and persist to the server.
 * Call `syncConcertReviewsFromServer` on app load and after login to hydrate
 * and to push any reviews that only exist on this device.
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

export function generateReviewId(): string {
  return `review-${crypto.randomUUID().slice(0, 8)}`;
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
  if (failed.length > 0 && failed.length === pending.length) {
    throw failed[0].reason;
  }
}

/* ------------------------------- cache + writes ------------------------------ */

/** Save to local cache and DynamoDB. Throws if the server write fails. */
export async function saveConcertReview(review: ConcertReview): Promise<void> {
  if (!review.userId) {
    throw new Error('ConcertReview.userId is required');
  }
  const store = readStore();
  store[reviewKey(review.userId, review.eventId)] = review;
  writeStore(store);
  await persistRemoteReview(review);
}

export function getConcertReview(userId: string, eventId: string): ConcertReview | null {
  if (!userId) return null;
  return readStore()[reviewKey(userId, eventId)] ?? null;
}

export function getAllConcertReviews(userId: string): ConcertReview[] {
  if (!userId) return [];
  const prefix = `${userId}::`;
  return Object.entries(readStore())
    .filter(([key, review]) => key.startsWith(prefix) && review.userId === userId)
    .map(([, review]) => review)
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
    await pushLocalReviewsToServer(userId, remote);
    remote = await fetchRemoteReviews(userId);
  } catch {
    return getAllConcertReviews(userId);
  }

  const byEvent = new Map<string, ConcertReview>();
  for (const local of getAllConcertReviews(userId)) {
    byEvent.set(local.eventId, local);
  }
  for (const r of remote) {
    const local = byEvent.get(r.eventId);
    if (!local || (r.updatedAt ?? '') >= (local.updatedAt ?? '')) {
      byEvent.set(r.eventId, { ...r, userId });
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
