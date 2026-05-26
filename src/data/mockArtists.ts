import type { Artist } from '@/types';

/** Placeholder data for local / API-offline use only — not real acts. */
export const mockArtists: Artist[] = [
  {
    id: 'artist-1',
    name: 'Sample Artist Alpha',
    slug: 'sample-artist-alpha',
    imageUrl: 'https://picsum.photos/seed/encore-a/400/400',
    genres: ['indie', 'alternative'],
    externalIds: {},
  },
  {
    id: 'artist-2',
    name: 'Sample Artist Beta',
    slug: 'sample-artist-beta',
    imageUrl: 'https://picsum.photos/seed/encore-b/400/400',
    genres: ['pop', 'rock'],
    externalIds: {},
  },
  {
    id: 'artist-3',
    name: 'Sample Artist Gamma',
    slug: 'sample-artist-gamma',
    imageUrl: 'https://picsum.photos/seed/encore-c/400/400',
    genres: ['rock', 'alternative'],
    externalIds: {},
  },
  {
    id: 'artist-4',
    name: 'Sample Artist Delta',
    slug: 'sample-artist-delta',
    imageUrl: 'https://picsum.photos/seed/encore-d/400/400',
    genres: ['funk', 'soul'],
    externalIds: {},
  },
  {
    id: 'artist-5',
    name: 'Sample Artist Epsilon',
    slug: 'sample-artist-epsilon',
    imageUrl: 'https://picsum.photos/seed/encore-e/400/400',
    genres: ['indie', 'folk'],
    externalIds: {},
  },
];
