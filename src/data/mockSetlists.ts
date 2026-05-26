import type { Setlist, SetlistSong } from '@/types';

export const mockSetlists: Setlist[] = [
  {
    id: 'setlist-1',
    concertId: 'concert-4',
    source: 'actual',
    updatedAt: '2025-09-19T00:00:00Z',
    songs: [
      { position: 1, name: 'Intro (instrumental)' },
      { position: 2, name: 'Track Two' },
      { position: 3, name: 'Track Three' },
      { position: 4, name: 'Track Four' },
      { position: 5, name: 'Track Five' },
      { position: 6, name: 'Track Six' },
      { position: 7, name: 'Encore song A', encore: true },
      { position: 8, name: 'Encore song B', encore: true },
    ],
  },
  {
    id: 'setlist-2',
    concertId: 'concert-5',
    source: 'actual',
    updatedAt: '2025-11-03T00:00:00Z',
    songs: [
      { position: 1, name: 'First song' },
      { position: 2, name: 'Second song' },
      { position: 3, name: 'Third song' },
      { position: 4, name: 'Fourth song' },
      { position: 5, name: 'Fifth song' },
      { position: 6, name: 'Sixth song' },
      { position: 7, name: 'Seventh song' },
      { position: 8, name: 'Encore track', encore: true },
      { position: 9, name: 'Closing track', encore: true },
    ],
  },
  {
    id: 'setlist-3',
    concertId: 'concert-6',
    source: 'actual',
    updatedAt: '2025-10-06T00:00:00Z',
    songs: [
      { position: 1, name: 'Album opener' },
      { position: 2, name: 'Mid-tempo track' },
      { position: 3, name: 'Ballad' },
      { position: 4, name: 'Up-tempo' },
      { position: 5, name: 'Singalong' },
      { position: 6, name: 'Finale', encore: true },
    ],
  },
];

/** Predicted setlists keyed by mock artist id for upcoming shows */
export const mockPredictedSetlists: Record<string, SetlistSong[]> = {
  'artist-1': [
    { position: 1, name: 'Predicted track 1' },
    { position: 2, name: 'Predicted track 2' },
    { position: 3, name: 'Predicted track 3' },
    { position: 4, name: 'Predicted track 4' },
    { position: 5, name: 'Predicted track 5' },
    { position: 6, name: 'Predicted track 6' },
    { position: 7, name: 'Predicted encore', encore: true },
  ],
  'artist-2': [
    { position: 1, name: 'Predicted track 1' },
    { position: 2, name: 'Predicted track 2' },
    { position: 3, name: 'Predicted track 3' },
    { position: 4, name: 'Predicted track 4' },
    { position: 5, name: 'Predicted track 5' },
    { position: 6, name: 'Predicted encore', encore: true },
  ],
  'artist-3': [
    { position: 1, name: 'Predicted track 1' },
    { position: 2, name: 'Predicted track 2' },
    { position: 3, name: 'Predicted track 3' },
    { position: 4, name: 'Predicted track 4' },
    { position: 5, name: 'Predicted track 5' },
    { position: 6, name: 'Predicted encore', encore: true },
  ],
};
