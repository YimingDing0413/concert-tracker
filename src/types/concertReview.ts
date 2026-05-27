export type ConcertReview = {
  id: string;
  userId: string;
  eventId: string;
  artistName: string;
  venueName?: string;
  eventDate?: string;
  overallRating: number;
  performanceRating?: number;
  setlistRating?: number;
  venueRating?: number;
  crowdRating?: number;
  soundRating?: number;
  valueRating?: number;
  favoriteSong?: string;
  bestMoment?: string;
  wouldSeeAgain?: boolean;
  reviewText?: string;
  tags?: string[];
  photoDataUrls?: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConcertReviewDraft = Omit<
  ConcertReview,
  'id' | 'userId' | 'eventId' | 'artistName' | 'createdAt' | 'updatedAt'
> &
  Partial<Pick<ConcertReview, 'id' | 'userId' | 'eventId' | 'artistName' | 'createdAt' | 'updatedAt'>>;

export type WrapUpTemplateId = 'poster' | 'stats' | 'collage';

export const REVIEW_MOOD_TAGS = [
  'best night ever',
  'great vocals',
  'amazing production',
  'weak crowd',
  'bad sound',
  'too crowded',
  'great opener',
  'emotional',
  'high energy',
  'worth the money',
  'overrated',
  'underrated',
] as const;

export type ReviewMoodTag = (typeof REVIEW_MOOD_TAGS)[number];

export const BREAKDOWN_LABELS = [
  { key: 'performanceRating' as const, label: 'Performance', emoji: '🎤' },
  { key: 'setlistRating' as const, label: 'Setlist', emoji: '📋' },
  { key: 'venueRating' as const, label: 'Venue', emoji: '🏟️' },
  { key: 'crowdRating' as const, label: 'Crowd', emoji: '🔥' },
  { key: 'soundRating' as const, label: 'Sound', emoji: '🔊' },
  { key: 'valueRating' as const, label: 'Value', emoji: '💰' },
];

export const OVERALL_VIBE_LABELS: Record<number, string> = {
  1: 'Rough night',
  2: 'Disappointing',
  3: 'Meh',
  4: 'Okay',
  5: 'Solid',
  6: 'Good show',
  7: 'Great time',
  8: 'Loved it',
  9: 'Unforgettable',
  10: 'Best night ever',
};
