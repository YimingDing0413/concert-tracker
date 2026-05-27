import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

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

export function saveConcertReview(review: ConcertReview): void {
  if (!review.userId) {
    throw new Error('ConcertReview.userId is required');
  }
  const store = readStore();
  store[reviewKey(review.userId, review.eventId)] = review;
  writeStore(store);
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
}
