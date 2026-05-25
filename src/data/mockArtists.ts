import type { Artist } from '@/types';

export const mockArtists: Artist[] = [
  {
    id: 'artist-1',
    name: 'Phoebe Bridgers',
    slug: 'phoebe-bridgers',
    imageUrl: 'https://picsum.photos/seed/phoebe/400/400',
    genres: ['indie', 'alternative'],
    externalIds: { setlistFm: '6bd2b5f2' },
  },
  {
    id: 'artist-2',
    name: 'Taylor Swift',
    slug: 'taylor-swift',
    imageUrl: 'https://picsum.photos/seed/taylor/400/400',
    genres: ['pop', 'country'],
    externalIds: { ticketmaster: 'tm-swift', setlistFm: 'bd2fa6c' },
  },
  {
    id: 'artist-3',
    name: 'Radiohead',
    slug: 'radiohead',
    imageUrl: 'https://picsum.photos/seed/radiohead/400/400',
    genres: ['rock', 'alternative'],
    externalIds: { setlistFm: '3bd6c48c' },
  },
  {
    id: 'artist-4',
    name: 'Khruangbin',
    slug: 'khruangbin',
    imageUrl: 'https://picsum.photos/seed/khruangbin/400/400',
    genres: ['funk', 'psychedelic'],
  },
  {
    id: 'artist-5',
    name: 'Boygenius',
    slug: 'boygenius',
    imageUrl: 'https://picsum.photos/seed/boygenius/400/400',
    genres: ['indie', 'folk'],
  },
];
