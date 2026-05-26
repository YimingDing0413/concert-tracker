import type {
  Artist,
  ConcertEvent,
  SearchResult,
  Setlist,
  Venue,
} from '../../shared/types/index.js';

export const mockSearchResults: SearchResult[] = [
  {
    id: 'tm:attraction:artist-mock-1',
    type: 'artist',
    title: 'Sample Artist Alpha',
    subtitle: 'indie · alternative',
    source: 'mock',
  },
  {
    id: 'tm:venue:venue-mock-1',
    type: 'venue',
    title: 'Sample Arena One',
    subtitle: 'Sample City, NY',
    source: 'mock',
  },
  {
    id: 'tm:event:concert-mock-1',
    type: 'event',
    title: 'Sample Artist Beta @ Sample Arena One',
    subtitle: 'Aug 22, 2026 · Sample City',
    source: 'mock',
  },
];

export const mockEvents: ConcertEvent[] = [
  {
    id: 'tm:event:concert-mock-1',
    source: 'mock',
    title: 'Sample Artist Beta',
    artistName: 'Sample Artist Beta',
    artistId: 'tm:attraction:artist-mock-2',
    venueName: 'Sample Arena One',
    venueId: 'tm:venue:venue-mock-1',
    city: 'Sample City',
    region: 'NY',
    country: 'USA',
    date: '2026-08-22',
    time: '19:00',
    ticketUrl: 'https://example.com/tickets',
    openers: ['Support artist'],
    status: 'upcoming',
  },
  {
    id: 'tm:event:concert-mock-2',
    source: 'mock',
    title: 'Sample Artist Delta',
    artistName: 'Sample Artist Delta',
    venueName: 'Sample Theatre Three',
    venueId: 'tm:venue:venue-mock-2',
    city: 'Mockville',
    region: 'CA',
    country: 'USA',
    date: '2025-09-18',
    time: '20:00',
    status: 'past',
    openers: ['Opener'],
  },
];

export const mockArtists: Artist[] = [
  {
    id: 'tm:attraction:artist-mock-1',
    name: 'Sample Artist Alpha',
    slug: 'sample-artist-alpha',
    genres: ['indie', 'alternative'],
    source: 'mock',
  },
];

export const mockVenues: Venue[] = [
  {
    id: 'tm:venue:venue-mock-1',
    name: 'Sample Arena One',
    slug: 'sample-arena-one',
    city: 'Sample City',
    state: 'NY',
    country: 'USA',
    address: '100 Example Street',
    source: 'mock',
  },
];

export const mockSetlists: Setlist[] = [
  {
    id: 'setlist-mock-1',
    concertId: 'tm:event:concert-mock-2',
    source: 'actual',
    updatedAt: new Date().toISOString(),
    eventDate: '2025-09-18',
    venueName: 'Sample Theatre Three',
    city: 'Mockville',
    songs: [
      { position: 1, name: 'Track one' },
      { position: 2, name: 'Track two' },
      { position: 3, name: 'Encore', encore: true },
    ],
  },
];

export function filterMockSearch(query: string): SearchResult[] {
  const q = query.toLowerCase().trim();
  if (!q) return mockSearchResults;
  const matched = mockSearchResults.filter(
    (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
  );
  // Without Ticketmaster keys, real artist names won't match sample data — still show samples
  // so the UI isn't empty while developing locally.
  return matched.length ? matched : mockSearchResults;
}
