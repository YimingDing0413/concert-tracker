import { apiFetchData } from '@/api/http';
import type { ConcertReview } from '@/types/concertReview';
import type { CreateFeedPostInput, FeedFilter, FeedPost } from '@/types';

export async function getFeed(filter: FeedFilter = 'all', limit = 50): Promise<FeedPost[]> {
  const params = new URLSearchParams({
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
  input: Omit<CreateFeedPostInput, 'userId'>
): Promise<FeedPost> {
  return apiFetchData<FeedPost>('/api/feed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function deleteFeedPost(postId: string): Promise<void> {
  await apiFetchData<{ ok: boolean }>(`/api/feed/${encodeURIComponent(postId)}`, {
    method: 'DELETE',
  });
}

export async function createReviewFeedPost(
  review: ConcertReview,
  concert?: {
    city?: string;
    imageUrl?: string;
  }
): Promise<FeedPost> {
  return createFeedPost({
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
