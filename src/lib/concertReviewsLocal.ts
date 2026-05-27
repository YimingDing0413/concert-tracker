import type { ConcertReview } from '@/types/concertReview';

const STORAGE_KEY = 'encore_concert_reviews';

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
  const store = readStore();
  store[review.eventId] = review;
  writeStore(store);
}

export function getConcertReview(eventId: string): ConcertReview | null {
  return readStore()[eventId] ?? null;
}

export function getAllConcertReviews(): ConcertReview[] {
  return Object.values(readStore()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function deleteConcertReview(eventId: string): void {
  const store = readStore();
  delete store[eventId];
  writeStore(store);
}
