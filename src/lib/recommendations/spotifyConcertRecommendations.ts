import type { Concert, UserConcert } from '../../../shared/types/index.js';
import type {
  SpotifyConcertRecommendation,
  SpotifyTasteProfile,
} from '../../../shared/types/spotify.js';

/** Normalize artist names for fuzzy matching. */
export function normalizeArtistName(name: string): string {
  let s = name.trim().toLowerCase();
  s = s.replace(/\s*\(feat\.?[^)]*\)/gi, '');
  s = s.replace(/\s*feat\.?\s+.*/gi, '');
  s = s.replace(/\s*featuring\s+.*/gi, '');
  s = s.replace(/[^\w\s&]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

function fuzzyArtistMatch(concertArtist: string, spotifyArtist: string): boolean {
  const a = normalizeArtistName(concertArtist);
  const b = normalizeArtistName(spotifyArtist);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  const aWords = a.split(' ');
  const bWords = b.split(' ');
  if (aWords.length >= 2 && bWords.length >= 2 && aWords[0] === bWords[0]) {
    return aWords.slice(0, 2).join(' ') === bWords.slice(0, 2).join(' ');
  }
  return false;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export type UserConcertHistory = {
  attendedConcertIds: Set<string>;
  savedConcertIds: Set<string>;
  goingConcertIds: Set<string>;
  attendedArtistKeys: Set<string>;
};

export function buildUserConcertHistory(userConcerts: UserConcert[]): UserConcertHistory {
  const attendedConcertIds = new Set<string>();
  const savedConcertIds = new Set<string>();
  const goingConcertIds = new Set<string>();
  const attendedArtistKeys = new Set<string>();

  for (const uc of userConcerts) {
    if (uc.status === 'attended') {
      attendedConcertIds.add(uc.concertId);
      const artist = uc.concertSnapshot?.artistName ?? uc.manualConcert?.artistName;
      if (artist) attendedArtistKeys.add(normalizeArtistName(artist));
    } else if (uc.status === 'saved') {
      savedConcertIds.add(uc.concertId);
    } else if (uc.status === 'going') {
      goingConcertIds.add(uc.concertId);
    }
  }

  return { attendedConcertIds, savedConcertIds, goingConcertIds, attendedArtistKeys };
}

function topArtistNames(profile: SpotifyTasteProfile): Map<string, string> {
  const map = new Map<string, string>();
  for (const artist of profile.topArtists) {
    const key = normalizeArtistName(artist.name);
    if (key && !map.has(key)) map.set(key, artist.name);
  }
  return map;
}

function trackArtistNames(profile: SpotifyTasteProfile): Map<string, string> {
  const map = new Map<string, string>();
  for (const track of profile.topTracks) {
    for (const name of track.artistNames) {
      const key = normalizeArtistName(name);
      if (key && !map.has(key)) map.set(key, name);
    }
  }
  return map;
}

export function getSpotifyConcertRecommendations(
  candidates: Concert[],
  spotifyTasteProfile: SpotifyTasteProfile,
  userConcertHistory: UserConcertHistory,
  limit = 6
): SpotifyConcertRecommendation[] {
  const topArtists = topArtistNames(spotifyTasteProfile);
  const trackArtists = trackArtistNames(spotifyTasteProfile);
  const artistWeights = spotifyTasteProfile.artistWeights ?? {};
  const genreWeights = spotifyTasteProfile.genreWeights ?? {};

  const scored: SpotifyConcertRecommendation[] = [];

  for (const concert of candidates) {
    if (concert.status === 'past') continue;
    if (userConcertHistory.attendedConcertIds.has(concert.id)) continue;

    const normArtist = normalizeArtistName(concert.artistName ?? '');
    let score = 0;
    const reasons: string[] = [];
    const matchedSpotifyArtists: string[] = [];

    const weight = artistWeights[normArtist] ?? 0;

    if (topArtists.has(normArtist)) {
      score += 100;
      const name = topArtists.get(normArtist)!;
      matchedSpotifyArtists.push(name);
      reasons.push('One of your top Spotify artists');
      reasons.push(`Because you listen to ${name}`);
    } else if (trackArtists.has(normArtist)) {
      score += 60;
      const name = trackArtists.get(normArtist)!;
      matchedSpotifyArtists.push(name);
      reasons.push(`You've been playing ${name} recently`);
      reasons.push('Matches your recent listening');
    } else {
      for (const [, displayName] of topArtists) {
        if (fuzzyArtistMatch(concert.artistName ?? '', displayName)) {
          score += 40;
          matchedSpotifyArtists.push(displayName);
          reasons.push(`Because you listen to ${displayName}`);
          break;
        }
      }
      if (score < 40) {
        for (const [, displayName] of trackArtists) {
          if (fuzzyArtistMatch(concert.artistName ?? '', displayName)) {
            score += 40;
            matchedSpotifyArtists.push(displayName);
            reasons.push('Matches your recent listening');
            break;
          }
        }
      }
    }

    if (weight > 0) {
      score += Math.min(30, Math.round(weight / 10));
    }

    const genreKey = normalizeArtistName(concert.genreName ?? '');
    if (genreKey && genreWeights[genreKey]) {
      score += 20;
      if (concert.genreName) reasons.push(`More ${concert.genreName} near you`);
    }

    const subGenreKey = normalizeArtistName(concert.subGenreName ?? '');
    if (subGenreKey && genreWeights[subGenreKey]) {
      score += 25;
    }

    if (userConcertHistory.attendedArtistKeys.has(normArtist)) {
      score += 10;
    }

    if (concert.imageUrl) score += 3;

    const days = daysUntil(concert.date);
    if (days >= 0 && days <= 60) score += 5;

    if (score <= 0) continue;

    const uniqueReasons = [...new Set(reasons)].slice(0, 3);

    scored.push({
      id: concert.id,
      artistId: concert.artistId,
      artistName: concert.artistName,
      venueId: concert.venueId,
      venueName: concert.venueName,
      city: concert.city,
      state: concert.state,
      country: concert.country,
      date: concert.date,
      startTime: concert.startTime,
      status: concert.status,
      ticketUrl: concert.ticketUrl,
      imageUrl: concert.imageUrl,
      genreName: concert.genreName,
      subGenreName: concert.subGenreName,
      segmentName: concert.segmentName,
      venueLatitude: concert.venueLatitude,
      venueLongitude: concert.venueLongitude,
      spotifyScore: score,
      reasons: uniqueReasons.length > 0 ? uniqueReasons : ['Based on your Spotify taste'],
      matchedSpotifyArtists,
      alreadySaved: userConcertHistory.savedConcertIds.has(concert.id),
      alreadyGoing: userConcertHistory.goingConcertIds.has(concert.id),
    });
  }

  return scored
    .sort((a, b) => b.spotifyScore - a.spotifyScore || a.date.localeCompare(b.date))
    .slice(0, limit);
}
