import {
  buildSpotifyAuthorizeUrl,
  exchangeSpotifyCode,
  fetchRecentlyPlayed,
  fetchSpotifyProfile,
  fetchTopArtists,
  fetchTopTracks,
  refreshSpotifyToken,
  SPOTIFY_MVP_SCOPES,
  spotifyConfigured,
  type SpotifyApiArtist,
  type SpotifyApiTrack,
} from '../clients/spotify.js';
import { decryptToken, encryptToken } from '../lib/tokenCrypto.js';
import {
  createSpotifyOAuthState,
  verifySpotifyOAuthState,
} from '../lib/spotifyOAuthState.js';
import {
  disconnectSpotify,
  getSpotifyConnection,
  getSpotifyConnectionStatus,
  getSpotifyTasteProfile,
  saveSpotifyConnection,
  saveSpotifyTasteProfile,
} from '../../src/lib/db/spotifyRepository.js';
import { normalizeArtistName } from '../../src/lib/recommendations/artistMatching.js';
import type {
  SpotifyConnection,
  SpotifyConnectionStatus,
  SpotifyRecentlyPlayedArtist,
  SpotifyTasteArtist,
  SpotifyTasteProfile,
  SpotifyTasteTrack,
  SpotifyTimeRange,
} from '../../shared/types/spotify.js';
import { env, envValue } from '../env.js';

const TIME_RANGES: SpotifyTimeRange[] = ['short_term', 'medium_term', 'long_term'];

function appPublicUrl(): string {
  const explicit = envValue('APP_PUBLIC_URL');
  if (explicit) return explicit.replace(/\/$/, '');
  const redirect = env.spotifyRedirectUri;
  if (redirect) {
    try {
      const u = new URL(redirect);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return 'http://localhost:5173';
      }
      return `${u.protocol}//${u.host}`;
    } catch {
      /* fall through */
    }
  }
  return 'http://localhost:5173';
}

export function getSpotifyConnectUrl(userId: string): string {
  const state = createSpotifyOAuthState(userId);
  return buildSpotifyAuthorizeUrl(state);
}

export function getAppPublicUrl(): string {
  return appPublicUrl();
}

export async function handleSpotifyCallback(
  code: string,
  state: string
): Promise<{ userId: string; redirectUrl: string }> {
  const userId = verifySpotifyOAuthState(state);
  if (!userId) throw new Error('Invalid or expired Spotify OAuth state.');

  const tokenRes = await exchangeSpotifyCode(code);
  const profile = await fetchSpotifyProfile(tokenRes.access_token);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + tokenRes.expires_in * 1000).toISOString();

  const connection: SpotifyConnection = {
    userId,
    spotifyUserId: profile.id,
    spotifyDisplayName: profile.display_name,
    scopes: tokenRes.scope?.split(' ').filter(Boolean) ?? [...SPOTIFY_MVP_SCOPES],
    encryptedAccessToken: encryptToken(tokenRes.access_token),
    encryptedRefreshToken: tokenRes.refresh_token
      ? encryptToken(tokenRes.refresh_token)
      : undefined,
    accessTokenExpiresAt: expiresAt,
    connectedAt: now,
    updatedAt: now,
  };

  await saveSpotifyConnection(connection);

  return {
    userId,
    redirectUrl: `${appPublicUrl()}/profile?spotify=connected`,
  };
}

async function ensureValidAccessToken(connection: SpotifyConnection): Promise<{
  accessToken: string;
  connection: SpotifyConnection;
}> {
  const expiresAt = new Date(connection.accessTokenExpiresAt).getTime();
  if (Date.now() < expiresAt - 60_000) {
    return { accessToken: decryptToken(connection.encryptedAccessToken), connection };
  }

  if (!connection.encryptedRefreshToken) {
    throw new Error('Spotify session expired. Please reconnect Spotify.');
  }

  const refresh = decryptToken(connection.encryptedRefreshToken);
  const tokenRes = await refreshSpotifyToken(refresh);
  const updated: SpotifyConnection = {
    ...connection,
    encryptedAccessToken: encryptToken(tokenRes.access_token),
    encryptedRefreshToken: tokenRes.refresh_token
      ? encryptToken(tokenRes.refresh_token)
      : connection.encryptedRefreshToken,
    accessTokenExpiresAt: new Date(Date.now() + tokenRes.expires_in * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    scopes: tokenRes.scope?.split(' ').filter(Boolean) ?? connection.scopes,
  };
  await saveSpotifyConnection(updated);
  return { accessToken: tokenRes.access_token, connection: updated };
}

function artistWeightForRank(
  timeRange: SpotifyTimeRange,
  rank: number
): number {
  const base = timeRange === 'short_term' ? 100 : timeRange === 'medium_term' ? 70 : 50;
  return Math.max(1, base - rank);
}

function trackArtistWeight(rank: number): number {
  return Math.max(1, 20 - Math.floor(rank / 2));
}

function recentlyPlayedWeightForRank(rank: number): number {
  return Math.max(5, 85 - rank * 2);
}

function buildTasteProfile(
  userId: string,
  artistsByRange: Record<SpotifyTimeRange, SpotifyApiArtist[]>,
  tracksByRange: Record<SpotifyTimeRange, SpotifyApiTrack[]>,
  recentlyPlayedItems: Awaited<ReturnType<typeof fetchRecentlyPlayed>> = []
): SpotifyTasteProfile {
  const topArtists: SpotifyTasteArtist[] = [];
  const topTracks: SpotifyTasteTrack[] = [];
  const artistWeights: Record<string, number> = {};
  const genreWeights: Record<string, number> = {};
  const recentlyPlayedArtists: SpotifyRecentlyPlayedArtist[] = [];
  const recentlyPlayedArtistWeights: Record<string, number> = {};
  const recentArtistMeta = new Map<
    string,
    { spotifyArtistId: string; name: string; playCount: number; lastPlayedAt?: string }
  >();

  for (const range of TIME_RANGES) {
    artistsByRange[range].forEach((artist, index) => {
      const rank = index + 1;
      topArtists.push({
        spotifyArtistId: artist.id,
        name: artist.name,
        imageUrl: artist.images?.[0]?.url,
        rank,
        timeRange: range,
        genres: artist.genres,
        popularity: artist.popularity,
      });
      const key = normalizeArtistName(artist.name);
      if (key) {
        artistWeights[key] = (artistWeights[key] ?? 0) + artistWeightForRank(range, rank);
      }
      for (const genre of artist.genres ?? []) {
        const gKey = normalizeArtistName(genre);
        if (gKey) {
          genreWeights[gKey] = (genreWeights[gKey] ?? 0) + artistWeightForRank(range, rank) * 0.5;
        }
      }
    });

    tracksByRange[range].forEach((track, index) => {
      const rank = index + 1;
      const artistNames = (track.artists ?? []).map((a) => a.name);
      topTracks.push({
        spotifyTrackId: track.id,
        name: track.name,
        artistNames,
        albumImageUrl: track.album?.images?.[0]?.url,
        rank,
        timeRange: range,
      });
      for (const name of artistNames) {
        const key = normalizeArtistName(name);
        if (key) {
          artistWeights[key] = (artistWeights[key] ?? 0) + trackArtistWeight(rank);
        }
      }
    });
  }

  recentlyPlayedItems.forEach((item, index) => {
    const rank = index + 1;
    for (const artist of item.track.artists ?? []) {
      const key = normalizeArtistName(artist.name);
      if (!key) continue;
      recentlyPlayedArtistWeights[key] =
        (recentlyPlayedArtistWeights[key] ?? 0) + recentlyPlayedWeightForRank(rank);
      const existing = recentArtistMeta.get(key);
      if (existing) {
        existing.playCount += 1;
        if (!existing.lastPlayedAt || item.played_at > existing.lastPlayedAt) {
          existing.lastPlayedAt = item.played_at;
        }
      } else {
        recentArtistMeta.set(key, {
          spotifyArtistId: artist.id,
          name: artist.name,
          playCount: 1,
          lastPlayedAt: item.played_at,
        });
      }
    }
  });

  for (const [, meta] of recentArtistMeta) {
    recentlyPlayedArtists.push({
      spotifyArtistId: meta.spotifyArtistId,
      name: meta.name,
      playCount: meta.playCount,
      lastPlayedAt: meta.lastPlayedAt,
    });
  }

  return {
    userId,
    topArtists,
    topTracks,
    artistWeights,
    genreWeights,
    recentlyPlayedArtists,
    recentlyPlayedArtistWeights,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function syncSpotifyTaste(userId: string): Promise<SpotifyTasteProfile> {
  const connection = await getSpotifyConnection(userId);
  if (!connection) throw new Error('Spotify is not connected.');

  const { accessToken, connection: activeConnection } = await ensureValidAccessToken(connection);

  const artistsByRange = {} as Record<SpotifyTimeRange, SpotifyApiArtist[]>;
  const tracksByRange = {} as Record<SpotifyTimeRange, SpotifyApiTrack[]>;

  for (const range of TIME_RANGES) {
    const [artists, tracks] = await Promise.all([
      fetchTopArtists(accessToken, range, 50),
      fetchTopTracks(accessToken, range, 50),
    ]);
    artistsByRange[range] = artists;
    tracksByRange[range] = tracks;
  }

  let recentlyPlayedItems: Awaited<ReturnType<typeof fetchRecentlyPlayed>> = [];
  const hasRecentlyPlayedScope = activeConnection.scopes.includes('user-read-recently-played');
  if (hasRecentlyPlayedScope) {
    try {
      recentlyPlayedItems = await fetchRecentlyPlayed(accessToken, 50);
    } catch {
      recentlyPlayedItems = [];
    }
  }

  const profile = buildTasteProfile(userId, artistsByRange, tracksByRange, recentlyPlayedItems);
  await saveSpotifyTasteProfile(profile);
  return profile;
}

export async function getSpotifyStatus(userId: string): Promise<SpotifyConnectionStatus> {
  return getSpotifyConnectionStatus(userId);
}

export async function disconnectSpotifyAccount(userId: string): Promise<void> {
  await disconnectSpotify(userId);
}

export async function getSpotifyTasteForUser(userId: string): Promise<SpotifyTasteProfile | null> {
  return getSpotifyTasteProfile(userId);
}

export { spotifyConfigured };
