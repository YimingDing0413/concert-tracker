/** Shared normalized types used by server and frontend */

export type DataSource = 'ticketmaster' | 'bandsintown' | 'setlistfm' | 'manual' | 'mock';

export type SearchResultType = 'artist' | 'venue' | 'event';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  imageUrl?: string;
  source?: DataSource;
}

export interface Artist {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  genres?: string[];
  thumbUrl?: string;
  trackerCount?: number;
  upcomingEventCount?: number;
  externalIds?: {
    ticketmaster?: string;
    bandsintown?: string;
    setlistFm?: string;
  };
  source?: DataSource;
}

export interface Venue {
  id: string;
  name: string;
  slug: string;
  address?: string;
  city: string;
  region?: string;
  state?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  imageUrl?: string;
  externalIds?: {
    ticketmaster?: string;
  };
  source?: DataSource;
}

export interface SetlistSong {
  position: number;
  name: string;
  encore?: boolean;
  info?: string;
}

export interface Setlist {
  id: string;
  concertId: string;
  source: 'actual' | 'predicted';
  songs: SetlistSong[];
  setlistFmUrl?: string;
  eventDate?: string;
  venueName?: string;
  city?: string;
  updatedAt: string;
}

/** Primary normalized event type from external APIs */
export interface ConcertEvent {
  id: string;
  source: 'ticketmaster' | 'bandsintown' | 'setlistfm' | 'manual' | 'mock';
  title: string;
  artistName: string;
  artistId?: string;
  venueName: string;
  venueId?: string;
  city: string;
  region?: string;
  state?: string;
  country?: string;
  date: string;
  time?: string;
  doorsOpenTime?: string;
  openerStartTime?: string;
  headlinerStartTime?: string;
  endTime?: string;
  ticketUrl?: string;
  imageUrl?: string;
  openers?: string[];
  rawSourceUrl?: string;
  status?: 'upcoming' | 'past';
  lineup?: string[];
}

export interface ConcertTiming {
  doorsOpen?: string;
  openerStart?: string;
  headlinerStart?: string;
  endTime?: string;
}

/** Frontend-compatible concert (extends event with relations) */
export interface Concert {
  id: string;
  artistId: string;
  artistName: string;
  venueId: string;
  venueName: string;
  city: string;
  state?: string;
  country: string;
  date: string;
  startTime?: string;
  status: 'upcoming' | 'past';
  openers?: string[];
  ticketUrl?: string;
  timing?: ConcertTiming;
  setlistId?: string;
  imageUrl?: string;
  source?: ConcertEvent['source'];
  externalIds?: {
    ticketmaster?: string;
    bandsintown?: string;
  };
}

export type UserConcertStatus = 'going' | 'attended' | 'saved';

export interface UserConcert {
  id: string;
  userId: string;
  concertId: string;
  status: UserConcertStatus;
  isManual?: boolean;
  manualConcert?: Partial<Concert>;
  /** Cached show info so My Shows works without re-fetching every catalog event */
  concertSnapshot?: Partial<Concert>;
  notes?: string;
  ratingId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RatingReview {
  id: string;
  userId: string;
  concertId: string;
  userConcertId: string;
  overall: number;
  venue: number;
  crowd: number;
  sound: number;
  setlist: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConcertRating = RatingReview;

export interface RatingInput {
  overall: number;
  venue: number;
  crowd: number;
  sound: number;
  setlist: number;
  review?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface SignUpInput extends AuthCredentials {
  displayName: string;
  username: string;
}

export interface ManualConcertInput {
  artistName: string;
  venueName: string;
  city: string;
  state?: string;
  country?: string;
  date: string;
  startTime?: string;
  openers?: string;
  notes?: string;
  status: UserConcertStatus;
}

export interface ArtistDetail extends Artist {
  upcomingConcerts: Concert[];
  pastConcerts: Concert[];
  recentSetlists?: Setlist[];
  predictedSetlist?: Setlist;
}

export interface VenueDetail extends Venue {
  upcomingEvents: Concert[];
}

export interface ConcertDetail extends Concert {
  artist?: Artist;
  venue?: Venue;
  setlist?: Setlist;
  predictedSetlist?: Setlist;
}

export interface ApiMeta {
  source: 'live' | 'mock' | 'partial';
  message?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}
