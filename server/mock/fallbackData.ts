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
    title: 'Phoebe Bridgers',
    subtitle: 'indie · alternative',
    source: 'mock',
  },
  {
    id: 'tm:venue:venue-mock-1',
    type: 'venue',
    title: 'Madison Square Garden',
    subtitle: 'New York, NY',
    source: 'mock',
  },
  {
    id: 'tm:event:concert-mock-1',
    type: 'event',
    title: 'Taylor Swift @ Madison Square Garden',
    subtitle: 'Aug 22, 2026 · New York',
    source: 'mock',
  },
];

export const mockEvents: ConcertEvent[] = [
  {
    id: 'tm:event:concert-mock-1',
    source: 'mock',
    title: 'Taylor Swift',
    artistName: 'Taylor Swift',
    artistId: 'tm:attraction:artist-mock-2',
    venueName: 'Madison Square Garden',
    venueId: 'tm:venue:venue-mock-1',
    city: 'New York',
    region: 'NY',
    country: 'USA',
    date: '2026-08-22',
    time: '19:00',
    ticketUrl: 'https://www.ticketmaster.com/',
    openers: ['Sabrina Carpenter'],
    status: 'upcoming',
  },
  {
    id: 'tm:event:concert-mock-2',
    source: 'mock',
    title: 'Khruangbin',
    artistName: 'Khruangbin',
    venueName: 'The Greek Theatre',
    venueId: 'tm:venue:venue-mock-2',
    city: 'Los Angeles',
    region: 'CA',
    country: 'USA',
    date: '2025-09-18',
    time: '20:00',
    status: 'past',
    openers: ['Y La Bamba'],
  },
];

export const mockArtists: Artist[] = [
  {
    id: 'tm:attraction:artist-mock-1',
    name: 'Phoebe Bridgers',
    slug: 'phoebe-bridgers',
    genres: ['indie', 'alternative'],
    source: 'mock',
  },
];

export const mockVenues: Venue[] = [
  {
    id: 'tm:venue:venue-mock-1',
    name: 'Madison Square Garden',
    slug: 'madison-square-garden',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    address: '4 Pennsylvania Plaza',
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
    venueName: 'The Greek Theatre',
    city: 'Los Angeles',
    songs: [
      { position: 1, name: 'Time (You and I)' },
      { position: 2, name: 'Maria También' },
      { position: 3, name: 'Texas Sun', encore: true },
    ],
  },
];

export function filterMockSearch(query: string): SearchResult[] {
  const q = query.toLowerCase();
  return mockSearchResults.filter(
    (r) => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q)
  );
}
