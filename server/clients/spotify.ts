import { env, hasSpotify } from '../env.js';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

export const SPOTIFY_MVP_SCOPES = [
  'user-top-read',
  'user-read-email',
  'user-read-private',
  'user-read-recently-played',
] as const;

export function spotifyConfigured(): boolean {
  return hasSpotify();
}

export function buildSpotifyAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.spotifyClientId,
    scope: SPOTIFY_MVP_SCOPES.join(' '),
    redirect_uri: env.spotifyRedirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.spotifyRedirectUri,
  });
  const auth = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify token exchange failed: ${text.slice(0, 200) || res.statusText}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  }>;
}

export async function refreshSpotifyToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
}> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const auth = Buffer.from(`${env.spotifyClientId}:${env.spotifyClientSecret}`).toString('base64');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify token refresh failed: ${text.slice(0, 200) || res.statusText}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
    token_type: string;
  }>;
}

async function spotifyGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Spotify API ${path} failed: ${text.slice(0, 200) || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface SpotifyApiArtist {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  images?: { url: string }[];
}

export interface SpotifyApiTrack {
  id: string;
  name: string;
  album?: { images?: { url: string }[] };
  artists?: { id: string; name: string }[];
}

export async function fetchSpotifyProfile(accessToken: string): Promise<{
  id: string;
  display_name?: string;
  email?: string;
}> {
  return spotifyGet(accessToken, '/me');
}

export async function fetchTopArtists(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term',
  limit = 50
): Promise<SpotifyApiArtist[]> {
  const params = new URLSearchParams({ time_range: timeRange, limit: String(limit) });
  const data = await spotifyGet<{ items?: SpotifyApiArtist[] }>(
    accessToken,
    `/me/top/artists?${params}`
  );
  return data.items ?? [];
}

export async function fetchTopTracks(
  accessToken: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term',
  limit = 50
): Promise<SpotifyApiTrack[]> {
  const params = new URLSearchParams({ time_range: timeRange, limit: String(limit) });
  const data = await spotifyGet<{ items?: SpotifyApiTrack[] }>(
    accessToken,
    `/me/top/tracks?${params}`
  );
  return data.items ?? [];
}

export interface SpotifyRecentlyPlayedItem {
  played_at: string;
  track: SpotifyApiTrack;
}

export async function fetchRecentlyPlayed(
  accessToken: string,
  limit = 50
): Promise<SpotifyRecentlyPlayedItem[]> {
  const params = new URLSearchParams({ limit: String(Math.min(50, Math.max(1, limit))) });
  const data = await spotifyGet<{ items?: SpotifyRecentlyPlayedItem[] }>(
    accessToken,
    `/me/player/recently-played?${params}`
  );
  return data.items ?? [];
}
