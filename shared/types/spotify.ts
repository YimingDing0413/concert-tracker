/** Spotify OAuth + taste profile types (server-owned tokens, never sent to browser). */

export type SpotifyTimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyTasteArtist {
  spotifyArtistId: string;
  name: string;
  imageUrl?: string;
  rank: number;
  timeRange: SpotifyTimeRange;
  genres?: string[];
  popularity?: number;
}

export interface SpotifyTasteTrack {
  spotifyTrackId: string;
  name: string;
  artistNames: string[];
  albumImageUrl?: string;
  rank: number;
  timeRange: SpotifyTimeRange;
}

export interface SpotifyRecentlyPlayedArtist {
  spotifyArtistId: string;
  name: string;
  playCount: number;
  lastPlayedAt?: string;
}

export interface SpotifyTasteProfile {
  userId: string;
  topArtists: SpotifyTasteArtist[];
  topTracks: SpotifyTasteTrack[];
  artistWeights: Record<string, number>;
  genreWeights?: Record<string, number>;
  recentlyPlayedArtists?: SpotifyRecentlyPlayedArtist[];
  recentlyPlayedArtistWeights?: Record<string, number>;
  lastSyncedAt: string;
}

export interface SpotifyConnection {
  userId: string;
  spotifyUserId?: string;
  spotifyDisplayName?: string;
  scopes: string[];
  encryptedAccessToken: string;
  encryptedRefreshToken?: string;
  accessTokenExpiresAt: string;
  connectedAt: string;
  updatedAt: string;
}

export interface SpotifyConnectionStatus {
  connected: boolean;
  spotifyDisplayName?: string;
  spotifyUserId?: string;
  scopes?: string[];
  connectedAt?: string;
  lastSyncedAt?: string;
  hasTasteProfile: boolean;
}

export interface SpotifyConcertRecommendation {
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
  ticketUrl?: string;
  imageUrl?: string;
  genreName?: string;
  subGenreName?: string;
  segmentName?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  spotifyScore: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  matchedSpotifyArtists: string[];
  alreadySaved?: boolean;
  alreadyGoing?: boolean;
  /** Present only when API called with debug=true */
  scoreBreakdown?: SpotifyRecommendationScoreBreakdown;
}

export interface SpotifyRecommendationScoreBreakdown {
  listeningWeight?: number;
  recentlyPlayedWeight?: number;
  exactTopArtist?: number;
  topTrackArtist?: number;
  attractionMatch?: number;
  fuzzyArtist?: number;
  artistWeight?: number;
  genre?: number;
  subgenre?: number;
  encoreHistory?: number;
  attendedArtist?: number;
  image?: number;
  dateUrgency?: number;
  distance?: number;
}

export interface ArtistRecommendationDebug {
  spotifyArtistName: string;
  normalizedName: string;
  artistWeight: number;
  recentlyPlayedWeight?: number;
  sourceSignals: {
    shortTermTopArtist?: boolean;
    mediumTermTopArtist?: boolean;
    longTermTopArtist?: boolean;
    topTrackArtist?: boolean;
    recentlyPlayedArtist?: boolean;
  };
  wasInTargetedSearchPool: boolean;
  ticketmasterAttractionFound?: boolean;
  ticketmasterAttractionId?: string;
  ticketmasterEventsFound?: number;
  nearbyEventsFound?: number;
  finalRecommendationsForArtist?: number;
  excludedReasons?: string[];
}

export interface SpotifyRecommendationsDebugMeta {
  spotifyTopArtistsCount: number;
  spotifyTopTracksCount: number;
  uniqueSpotifyArtistPoolCount: number;
  targetedArtistSearchCount: number;
  candidateCountBeforeFilters: number;
  candidateCountAfterFilters: number;
  finalRecommendationCount: number;
  totalAvailableRecommendationCount: number;
  hiddenCandidatesCount: number;
  excludedCountsByReason: Record<string, number>;
  /** @deprecated use candidateCountBeforeFilters */
  candidateCount?: number;
  nearbyCandidateCount?: number;
  artistSearchCandidateCount?: number;
  excludedAlreadyAttendedCount?: number;
  excludedSavedGoingCount?: number;
  excludedNoListeningCount?: number;
  excludedOutsideWindowCount?: number;
  excludedLowQualityCount?: number;
  topScore?: number;
  artistDebug?: ArtistRecommendationDebug[];
  tracedArtist?: ArtistRecommendationDebug;
}
