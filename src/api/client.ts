/**
 * API client interface — swap `mockApi` for real implementations
 * (Ticketmaster, Bandsintown, Setlist.fm) without changing UI code.
 */
import type {
  Artist,
  ArtistDetail,
  AuthCredentials,
  Concert,
  ConcertDetail,
  ConcertRating,
  ManualConcertInput,
  RatingInput,
  SearchResult,
  ShowReportInput,
  ShowTimingResponse,
  SignUpInput,
  User,
  UserConcert,
  UserConcertStatus,
  Venue,
  VenueDetail,
} from '@/types';

export interface ConcertApiClient {
  // Auth
  login(credentials: AuthCredentials): Promise<User>;
  signUp(input: SignUpInput): Promise<User>;
  getCurrentUser(): Promise<User | null>;
  logout(): Promise<void>;

  // Search
  search(query: string): Promise<SearchResult[]>;

  // Catalog
  getArtist(id: string): Promise<ArtistDetail | null>;
  getVenue(id: string): Promise<VenueDetail | null>;
  getConcert(id: string): Promise<ConcertDetail | null>;
  getArtists(): Promise<Artist[]>;
  getVenues(): Promise<Venue[]>;
  getConcerts(): Promise<Concert[]>;

  // User concerts
  getUserConcerts(userId: string): Promise<UserConcert[]>;
  setConcertStatus(
    userId: string,
    concertId: string,
    status: UserConcertStatus
  ): Promise<UserConcert>;
  removeUserConcert(userId: string, userConcertId: string): Promise<void>;
  addManualConcert(userId: string, input: ManualConcertInput): Promise<UserConcert>;
  updateUserConcertNotes(
    userId: string,
    userConcertId: string,
    notes: string
  ): Promise<UserConcert>;

  // Ratings
  getRating(userId: string, concertId: string): Promise<ConcertRating | null>;
  saveRating(
    userId: string,
    userConcertId: string,
    concertId: string,
    input: RatingInput
  ): Promise<ConcertRating>;

  // Community show timing
  getShowTiming(eventId: string, userId?: string): Promise<ShowTimingResponse>;
  submitShowReport(
    eventId: string,
    userId: string,
    input: ShowReportInput
  ): Promise<ShowTimingResponse>;
}
