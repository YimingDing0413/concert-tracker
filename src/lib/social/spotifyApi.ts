import { apiFetchData } from '@/api/http';
import { apiUrl } from '@/lib/apiBase';
import { authHeaders } from '@/lib/auth/session';
import type {
  SpotifyConnectionStatus,
  SpotifyConcertRecommendation,
  SpotifyRecommendationsDebugMeta,
} from '@/types/spotify';

export async function getSpotifyStatus(): Promise<SpotifyConnectionStatus> {
  return apiFetchData<SpotifyConnectionStatus>('/api/spotify/status');
}

export async function startSpotifyConnect(): Promise<void> {
  const res = await fetch(apiUrl('/api/spotify/connect?format=json'), {
    headers: {
      ...authHeaders(),
      Accept: 'application/json',
    },
  });
  const body = (await res.json()) as { data?: { url?: string }; error?: string };
  if (!res.ok || !body.data?.url) {
    throw new Error(body.error ?? 'Could not start Spotify connect.');
  }
  window.location.assign(body.data.url);
}

export async function syncSpotifyTaste(): Promise<{ syncedAt: string }> {
  const res = await apiFetchData<{ profile: unknown; syncedAt: string }>('/api/spotify/sync', {
    method: 'POST',
  });
  return { syncedAt: res.syncedAt };
}

export async function disconnectSpotify(): Promise<void> {
  await apiFetchData<{ ok: boolean }>('/api/spotify/disconnect', { method: 'POST' });
}

export interface SpotifyRecommendationsResponse {
  connected: boolean;
  synced: boolean;
  recommendations: SpotifyConcertRecommendation[];
  nearbyCount: number;
  debug?: SpotifyRecommendationsDebugMeta;
}

export async function getSpotifyConcertRecommendations(payload: {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
  debug?: boolean;
}): Promise<SpotifyRecommendationsResponse> {
  const params = new URLSearchParams({
    lat: String(payload.lat),
    lng: String(payload.lng),
    radius: String(payload.radius ?? 50),
  });
  if (payload.limit != null) {
    params.set('limit', String(payload.limit));
  }
  if (payload.debug) {
    params.set('debug', 'true');
  }
  return apiFetchData<SpotifyRecommendationsResponse>(
    `/api/recommendations/spotify-concerts?${params}`
  );
}
