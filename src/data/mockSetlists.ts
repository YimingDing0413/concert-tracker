import type { Setlist, SetlistSong } from '@/types';

export const mockSetlists: Setlist[] = [
  {
    id: 'setlist-1',
    concertId: 'concert-4',
    source: 'actual',
    setlistFmUrl: 'https://www.setlist.fm/setlist/example-khruangbin',
    updatedAt: '2025-09-19T00:00:00Z',
    songs: [
      { position: 1, name: 'Time (You and I)' },
      { position: 2, name: 'People Everywhere (Still Alive)' },
      { position: 3, name: 'So We Won\'t Forget' },
      { position: 4, name: 'August 10' },
      { position: 5, name: 'Maria También' },
      { position: 6, name: 'Evan Finds the Third Room' },
      { position: 7, name: 'Texas Sun', encore: true },
      { position: 8, name: 'Con Todo el Mundo', encore: true },
    ],
  },
  {
    id: 'setlist-2',
    concertId: 'concert-5',
    source: 'actual',
    setlistFmUrl: 'https://www.setlist.fm/setlist/example-boygenius',
    updatedAt: '2025-11-03T00:00:00Z',
    songs: [
      { position: 1, name: 'Without You Without Them' },
      { position: 2, name: '$20' },
      { position: 3, name: 'True Blue' },
      { position: 4, name: 'Cool About It' },
      { position: 5, name: 'Not Strong Enough' },
      { position: 6, name: 'Satanist' },
      { position: 7, name: 'Letter to an Old Poet' },
      { position: 8, name: 'Anti-Curse', encore: true },
      { position: 9, name: 'The Parting Glass', encore: true },
    ],
  },
  {
    id: 'setlist-3',
    concertId: 'concert-6',
    source: 'actual',
    updatedAt: '2025-10-06T00:00:00Z',
    songs: [
      { position: 1, name: 'Motion Sickness' },
      { position: 2, name: 'Kyoto' },
      { position: 3, name: 'Waiting Room' },
      { position: 4, name: 'Garden Song' },
      { position: 5, name: 'ICU' },
      { position: 6, name: 'I Know the End', encore: true },
    ],
  },
];

/** Predicted setlists keyed by artist for upcoming shows */
export const mockPredictedSetlists: Record<string, SetlistSong[]> = {
  'artist-1': [
    { position: 1, name: 'Motion Sickness' },
    { position: 2, name: 'Kyoto' },
    { position: 3, name: 'Garden Song' },
    { position: 4, name: 'Savior Complex' },
    { position: 5, name: 'ICU' },
    { position: 6, name: 'Graceland Too' },
    { position: 7, name: 'I Know the End', encore: true },
  ],
  'artist-2': [
    { position: 1, name: 'Miss Americana & the Heartbreak Prince' },
    { position: 2, name: 'Cruel Summer' },
    { position: 3, name: 'Blank Space' },
    { position: 4, name: 'Anti-Hero' },
    { position: 5, name: 'Shake It Off' },
    { position: 6, name: 'All Too Well (10 Minute Version)', encore: true },
  ],
  'artist-3': [
    { position: 1, name: '15 Step' },
    { position: 2, name: 'My Iron Lung' },
    { position: 3, name: 'Weird Fishes/Arpeggi' },
    { position: 4, name: 'Idioteque' },
    { position: 5, name: 'Karma Police' },
    { position: 6, name: 'Paranoid Android', encore: true },
  ],
};
