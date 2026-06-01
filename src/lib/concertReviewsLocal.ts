import { apiFetchData } from '@/api/http';
import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

/**
 * Reviews are persisted to the user's account in DynamoDB (source of truth) and
 * mirrored to localStorage as a fast, offline cache. Reads are synchronous from
 * the cache; writes update the cache immediately and persist to the server in
 * the background. Call `syncConcertReviewsFromServer` to hydrate the cache.
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

/* ------------------------------- cache + writes ------------------------------ */

export function saveConcertReview(review: ConcertReview): void {
  if (!review.userId) {
    throw new Error('ConcertReview.userId is required');
  }
  const store = readStore();
  store[reviewKey(review.userId, review.eventId)] = review;
  writeStore(store);
  // Persist to the user's account in the background.
  void persistRemoteReview(review).catch(() => {
    /* cache holds the write; will re-sync on next load */
  });
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

export function deleteConcertReview(userId: string, eventId: string): void {
  if (!userId) return;
  const store = readStore();
  delete store[reviewKey(userId, eventId)];
  writeStore(store);
  void deleteRemoteReview(userId, eventId).catch(() => {
    /* removed from cache; server delete will retry on next action */
  });
}

/**
 * Pull the user's reviews from DynamoDB into the local cache. Server is
 * authoritative, but a locally-newer review (e.g. a write that hasn't synced
 * yet) is preserved. Returns the merged list. Safe to call repeatedly.
 */
export async function syncConcertReviewsFromServer(userId: string): Promise<ConcertReview[]> {
  if (!userId) return [];

  let remote: ConcertReview[];
  try {
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

  return getAllConcertReviews(userId);
}
