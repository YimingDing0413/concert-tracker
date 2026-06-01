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
  state?: string;
  country?: string;
  tourName?: string;
  /** How an upcoming predicted setlist was derived */
  predictionBasis?: 'same-tour' | 'recent-frequency';
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
  tourName?: string;
  /** Venue coordinates when available (e.g. map pins). */
  venueLatitude?: number;
  venueLongitude?: number;
  /** Street line from venue provider (e.g. Ticketmaster). */
  venueAddress?: string;
}

/** Map API: one upcoming show at a venue (Ticketmaster-sourced). */
export interface MapConcertEvent {
  id: string;
  title: string;
  artistName?: string;
  /** Headliner TM attraction id when available (`tm:attraction:…`). */
  artistId?: string;
  date: string;
  time?: string;
  ticketUrl?: string;
  imageUrl?: string;
  source: 'ticketmaster' | 'mock';
}

/** Map API: venue cluster with upcoming music events. */
export interface MapVenue {
  id: string;
  name: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude: number;
  longitude: number;
  upcomingEvents: MapConcertEvent[];
}

/** GET /api/map/events */
export interface MapEventsPayload {
  venues: MapVenue[];
  /** Geocoded center for the search query (city/place), when `q` is provided. */
  searchCenter?: { latitude: number; longitude: number };
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
  tourName?: string;
  ticketUrl?: string;
  timing?: ConcertTiming;
  setlistId?: string;
  imageUrl?: string;
  source?: ConcertEvent['source'];
  /** Populated when loaded from geo search — used for Discover map. */
  venueLatitude?: number;
  venueLongitude?: number;
  /** Venue street line when provider returns it (e.g. Ticketmaster). */
  venueAddress?: string;
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

/** Social profile — stored in DynamoDB under USER#{userId}/PROFILE. */
export interface UserProfile {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

/** "Who I follow" relationship row (denormalized for cheap list rendering). */
export interface FollowItem {
  userId: string;
  targetUserId: string;
  targetUsername?: string;
  targetDisplayName?: string;
  targetAvatarUrl?: string;
  createdAt: string;
}

/** "Who follows me" relationship row. */
export interface FollowerItem {
  userId: string;
  followerUserId: string;
  followerUsername?: string;
  followerDisplayName?: string;
  followerAvatarUrl?: string;
  createdAt: string;
}

export interface FollowCounts {
  followersCount: number;
  followingCount: number;
}

/** Member search hit — a profile annotated for the current viewer. */
export interface MemberSearchResult extends UserProfile {
  followersCount?: number;
  isFollowing?: boolean;
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

/** Venue cluster for the Discover map (shows at one venue). */
export interface MapNearbyVenueGroup {
  venueId: string;
  venueName: string;
  /** Street address when available from the event/venue payload. */
  address?: string;
  city: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
  upcomingShows: Concert[];
}

/** Geo search payload for Discover. */
export interface MapNearbyPayload {
  center: { latitude: number; longitude: number };
  radiusKm: number;
  venueGroups: MapNearbyVenueGroup[];
  /** All upcoming geo-matched concerts, newest first within window */
  concerts: Concert[];
}

export interface ConcertDetail extends Concert {
  artist?: Artist;
  venue?: Venue;
  setlist?: Setlist;
  predictedSetlist?: Setlist;
}

export type ShowReportSourceType =
  | 'was_there'
  | 'venue_email'
  | 'artist_post'
  | 'venue_post'
  | 'ticket_email'
  | 'other';

export type ShowReportConfidence = 'low' | 'medium' | 'high';

export interface UserShowReport {
  id: string;
  eventId: string;
  userId: string;
  doorsOpenTime?: string;
  openerNames?: string[];
  openerStartTime?: string;
  headlinerStartTime?: string;
  endTime?: string;
  notes?: string;
  sourceType?: ShowReportSourceType;
  sourceUrl?: string;
  confidence?: ShowReportConfidence;
  createdAt: string;
  updatedAt: string;
}

export interface ShowReportInput {
  doorsOpenTime?: string;
  /** Comma-separated opener names from the form */
  openerNames?: string;
  openerStartTime?: string;
  headlinerStartTime?: string;
  endTime?: string;
  notes?: string;
  sourceType?: ShowReportSourceType;
  sourceUrl?: string;
  confidence?: ShowReportConfidence;
}

export interface SourceBreakdown {
  was_there: number;
  venue_email: number;
  artist_post: number;
  venue_post: number;
  ticket_email: number;
  other: number;
}

export type AggregatedConfidenceLabel = 'high' | 'medium' | 'low';

export interface AggregatedField {
  value: string | string[];
  reportCount: number;
  totalReports: number;
  confidenceScore: number;
  confidenceLabel: AggregatedConfidenceLabel;
  sourceBreakdown: SourceBreakdown;
  lastUpdated: string;
}

export interface AggregatedShowTiming {
  eventId: string;
  doorsOpenTime?: AggregatedField;
  openerNames?: AggregatedField;
  openerStartTime?: AggregatedField;
  headlinerStartTime?: AggregatedField;
  endTime?: AggregatedField;
}

export interface ShowTimingResponse {
  reports: UserShowReport[];
  aggregated: AggregatedShowTiming;
  userReport?: UserShowReport | null;
}

export interface ApiMeta {
  source: 'live' | 'mock' | 'partial';
  message?: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}
