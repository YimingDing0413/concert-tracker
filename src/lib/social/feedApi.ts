import { apiFetchData } from '@/api/http';
import type { ConcertReview } from '@/types/concertReview';
import type { CreateFeedPostInput, FeedFilter, FeedPost } from '@/types';

/**
 * MVP: passes userId from the client's local auth user.
 * Replace with session-derived identity when real auth ships.
 */

export async function getFeed(
  userId: string,
  filter: FeedFilter = 'all',
  limit = 50
): Promise<FeedPost[]> {
  const params = new URLSearchParams({
    userId,
    filter,
    limit: String(limit),
  });
  return apiFetchData<FeedPost[]>(`/api/feed?${params}`);
}

export async function getUserFeed(userId: string, limit = 50): Promise<FeedPost[]> {
  return apiFetchData<FeedPost[]>(`/api/users/${encodeURIComponent(userId)}/feed?limit=${limit}`);
}

export async function getEventFeed(eventId: string, limit = 50): Promise<FeedPost[]> {
  return apiFetchData<FeedPost[]>(
    `/api/concerts/${encodeURIComponent(eventId)}/feed?limit=${limit}`
  );
}

export async function createFeedPost(
  userId: string,
  input: Omit<CreateFeedPostInput, 'userId'>
): Promise<FeedPost> {
  return apiFetchData<FeedPost>(`/api/feed?userId=${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, userId }),
  });
}

export async function deleteFeedPost(postId: string): Promise<void> {
  await apiFetchData<{ ok: boolean }>(`/api/feed/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}

export async function createReviewFeedPost(
  userId: string,
  review: ConcertReview,
  concert?: {
    city?: string;
    imageUrl?: string;
  }
): Promise<FeedPost> {
  return createFeedPost(userId, {
    type: 'review',
    eventId: review.eventId,
    artistName: review.artistName,
    venueName: review.venueName,
    city: concert?.city,
    eventDate: review.eventDate,
    imageUrl: concert?.imageUrl,
    caption: review.reviewText,
    rating: review.overallRating,
    tags: review.tags,
    photoDataUrls: review.photoDataUrls,
  });
}
