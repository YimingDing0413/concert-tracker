/** Spotify recommendation tunables (env-overridable). */

export function getRecommendationWindowDays(): number {
  const raw = Number(process.env.SPOTIFY_RECOMMENDATION_WINDOW_DAYS ?? 365);
  return Number.isFinite(raw) && raw > 0 ? Math.min(730, Math.round(raw)) : 365;
}

export function getTargetedArtistSearchLimit(): number {
  const raw = Number(process.env.SPOTIFY_TARGETED_ARTIST_SEARCH_LIMIT ?? 75);
  return Number.isFinite(raw) && raw > 0 ? Math.min(150, Math.round(raw)) : 75;
}

export function getEventsPerArtistLimit(): number {
  const raw = Number(process.env.SPOTIFY_EVENTS_PER_ARTIST_LIMIT ?? 50);
  return Number.isFinite(raw) && raw > 0 ? Math.min(100, Math.round(raw)) : 50;
}

export const MAX_CANDIDATE_POOL = 500;
export const ARTIST_SEARCH_CONCURRENCY = 5;

/** @deprecated use getRecommendationWindowDays() */
export const RECOMMENDATION_HORIZON_DAYS = 365;
