import { normalizeArtistName } from './artistMatching.js';
import { getTargetedArtistSearchLimit } from './config.js';
import type { SpotifyTasteProfile } from '../../../shared/types/spotify.js';

export interface SpotifyArtistSourceSignals {
  shortTermTopArtist?: boolean;
  mediumTermTopArtist?: boolean;
  longTermTopArtist?: boolean;
  topTrackArtist?: boolean;
  recentlyPlayedArtist?: boolean;
}

export interface SpotifyArtistPoolEntry {
  spotifyArtistName: string;
  normalizedName: string;
  artistWeight: number;
  recentlyPlayedWeight: number;
  combinedWeight: number;
  sourceSignals: SpotifyArtistSourceSignals;
  poolPriority: number;
}

export function buildSpotifyArtistPool(taste: SpotifyTasteProfile): SpotifyArtistPoolEntry[] {
  const artistWeights = taste.artistWeights ?? {};
  const recentlyPlayedWeights = taste.recentlyPlayedArtistWeights ?? {};
  const byKey = new Map<
    string,
    {
      displayName: string;
      sourceSignals: SpotifyArtistSourceSignals;
      shortTermRank?: number;
      trackAppearances: number;
    }
  >();

  for (const artist of taste.topArtists) {
    const key = normalizeArtistName(artist.name);
    if (!key) continue;
    const existing = byKey.get(key) ?? {
      displayName: artist.name,
      sourceSignals: {},
      trackAppearances: 0,
    };
    existing.displayName = artist.name;
    if (artist.timeRange === 'short_term') {
      existing.sourceSignals.shortTermTopArtist = true;
      existing.shortTermRank = existing.shortTermRank ?? artist.rank;
    } else if (artist.timeRange === 'medium_term') {
      existing.sourceSignals.mediumTermTopArtist = true;
    } else {
      existing.sourceSignals.longTermTopArtist = true;
    }
    byKey.set(key, existing);
  }

  for (const track of taste.topTracks) {
    for (const name of track.artistNames) {
      const key = normalizeArtistName(name);
      if (!key) continue;
      const existing = byKey.get(key) ?? {
        displayName: name,
        sourceSignals: {},
        trackAppearances: 0,
      };
      existing.sourceSignals.topTrackArtist = true;
      existing.trackAppearances += 1;
      if (!byKey.has(key)) existing.displayName = name;
      byKey.set(key, existing);
    }
  }

  for (const artist of taste.recentlyPlayedArtists ?? []) {
    const key = normalizeArtistName(artist.name);
    if (!key) continue;
    const existing = byKey.get(key) ?? {
      displayName: artist.name,
      sourceSignals: {},
      trackAppearances: 0,
    };
    existing.sourceSignals.recentlyPlayedArtist = true;
    existing.displayName = artist.name;
    byKey.set(key, existing);
  }

  const entries: SpotifyArtistPoolEntry[] = [];

  for (const [normalizedName, meta] of byKey.entries()) {
    const artistWeight = artistWeights[normalizedName] ?? 0;
    const recentlyPlayedWeight = recentlyPlayedWeights[normalizedName] ?? 0;
    if (artistWeight <= 0 && recentlyPlayedWeight <= 0) continue;

    const poolPriority =
      (meta.sourceSignals.shortTermTopArtist ? meta.shortTermRank ?? 50 : 200) +
      (artistWeight > 0 ? 0 : 50) +
      (meta.sourceSignals.recentlyPlayedArtist ? -5 : 0) -
      Math.min(meta.trackAppearances, 10);

    entries.push({
      spotifyArtistName: meta.displayName,
      normalizedName,
      artistWeight,
      recentlyPlayedWeight,
      combinedWeight: artistWeight + recentlyPlayedWeight * 1.25,
      sourceSignals: meta.sourceSignals,
      poolPriority,
    });
  }

  return entries.sort(
    (a, b) =>
      a.poolPriority - b.poolPriority ||
      b.combinedWeight - a.combinedWeight ||
      a.spotifyArtistName.localeCompare(b.spotifyArtistName)
  );
}

export function targetedArtistPool(
  taste: SpotifyTasteProfile,
  limit = getTargetedArtistSearchLimit()
): SpotifyArtistPoolEntry[] {
  return buildSpotifyArtistPool(taste).slice(0, limit);
}
