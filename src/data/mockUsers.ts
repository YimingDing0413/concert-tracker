import type { User, UserConcert, ConcertRating } from '@/types';

export const DEMO_USER: User = {
  id: 'user-demo',
  email: 'user@example.com',
  displayName: 'Demo user',
  username: 'demouser',
  bio: 'Placeholder profile for local testing.',
  avatarUrl: 'https://picsum.photos/seed/encore-user/200/200',
  createdAt: '2024-01-15T10:00:00Z',
};

export const mockUsers: User[] = [DEMO_USER];

export const mockUserConcerts: UserConcert[] = [
  {
    id: 'uc-1',
    userId: 'user-demo',
    concertId: 'concert-4',
    status: 'attended',
    ratingId: 'rating-1',
    notes: 'Sample note for local testing.',
    createdAt: '2025-09-20T12:00:00Z',
    updatedAt: '2025-09-20T12:00:00Z',
  },
  {
    id: 'uc-2',
    userId: 'user-demo',
    concertId: 'concert-5',
    status: 'attended',
    ratingId: 'rating-2',
    createdAt: '2025-11-05T12:00:00Z',
    updatedAt: '2025-11-05T12:00:00Z',
  },
  {
    id: 'uc-3',
    userId: 'user-demo',
    concertId: 'concert-1',
    status: 'going',
    createdAt: '2026-03-01T12:00:00Z',
    updatedAt: '2026-03-01T12:00:00Z',
  },
  {
    id: 'uc-4',
    userId: 'user-demo',
    concertId: 'concert-2',
    status: 'saved',
    createdAt: '2026-04-10T12:00:00Z',
    updatedAt: '2026-04-10T12:00:00Z',
  },
];

export const mockRatings: ConcertRating[] = [
  {
    id: 'rating-1',
    userId: 'user-demo',
    concertId: 'concert-4',
    userConcertId: 'uc-1',
    overall: 5,
    venue: 5,
    crowd: 4,
    sound: 5,
    setlist: 5,
    review: 'Sample review text for UI testing.',
    createdAt: '2025-09-20T12:00:00Z',
    updatedAt: '2025-09-20T12:00:00Z',
  },
  {
    id: 'rating-2',
    userId: 'user-demo',
    concertId: 'concert-5',
    userConcertId: 'uc-2',
    overall: 5,
    venue: 5,
    crowd: 5,
    sound: 4,
    setlist: 5,
    review: 'Another sample review for local development.',
    createdAt: '2025-11-05T12:00:00Z',
    updatedAt: '2025-11-05T12:00:00Z',
  },
];
