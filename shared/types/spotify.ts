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

export interface SpotifyTasteProfile {
  userId: string;
  topArtists: SpotifyTasteArtist[];
  topTracks: SpotifyTasteTrack[];
  artistWeights: Record<string, number>;
  genreWeights?: Record<string, number>;
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
  reasons: string[];
  matchedSpotifyArtists: string[];
  alreadySaved?: boolean;
  alreadyGoing?: boolean;
}
