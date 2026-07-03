import type { Concert } from '../../../shared/types/index.js';

export type ArtistMatchKind = 'exact' | 'strong_token' | 'fuzzy' | 'none';

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

const GENERIC_TOKENS = new Set([
  'live',
  'her',
  'the',
  'band',
  'and',
  'dj',
  'party',
  'night',
  'tour',
  'presents',
  'experience',
  'show',
  'concert',
  'official',
]);

const NON_PERFORMANCE_PATTERNS = [
  /\bdance\s+party\b/i,
  /\bafter\s*party\b/i,
  /\bclub\s+night\b/i,
  /\btribute\b/i,
  /\bkaraoke\b/i,
  /\bcover\s+(band|night)\b/i,
  /\bdj\s+(set|night|party)\b/i,
  /\bsilent\s+disco\b/i,
  /\blisten(ing)?\s+party\b/i,
  /\btheme(d)?\s+night\b/i,
  /\bwatch\s+party\b/i,
  /\bcandlelight\b/i,
  /\bsymphony\b/i,
  /\borchestra\b/i,
  /\bvs\.?\s+/i,
  /\bbattle\b/i,
];

const TITLE_EXACT_MATCH_BLOCKERS = /\b(tribute|candlelight|orchestra|symphony|experience)\b/i;

export function isNonArtistPerformance(artistName: string, eventTitle?: string): boolean {
  const hay = `${artistName} ${eventTitle ?? ''}`.trim();
  if (!hay) return true;
  return NON_PERFORMANCE_PATTERNS.some((pattern) => pattern.test(hay));
}

function significantTokens(name: string): string[] {
  return normalizeArtistName(name)
    .split(' ')
    .filter((token) => token.length >= 2 && !GENERIC_TOKENS.has(token));
}

function hasTicketmasterAttraction(concert: Concert): boolean {
  return Boolean(concert.artistId?.startsWith('tm:attraction:'));
}

export function allowsExactArtistMatch(
  concert: Concert,
  spotifyArtistNormalized: string
): boolean {
  if (isNonArtistPerformance(concert.artistName ?? '', concert.title)) return false;

  const title = concert.title ?? '';
  const concertNorm = normalizeArtistName(concert.artistName ?? '');

  if (TITLE_EXACT_MATCH_BLOCKERS.test(`${title} ${concert.artistName ?? ''}`)) {
    if (concertNorm !== spotifyArtistNormalized) return false;
    if (/\b(tribute|candlelight|experience|symphony|orchestra)\b/i.test(title)) {
      return false;
    }
  }

  if (/\bnight\b/i.test(title) && !title.toLowerCase().includes('tour')) {
    if (concertNorm !== spotifyArtistNormalized) return false;
    if (!hasTicketmasterAttraction(concert)) return false;
  }

  return true;
}

function strongTokenMatch(concertArtist: string, spotifyArtist: string): boolean {
  const aTokens = significantTokens(concertArtist);
  const bTokens = significantTokens(spotifyArtist);
  if (aTokens.length === 0 || bTokens.length === 0) return false;

  const shorter = aTokens.length <= bTokens.length ? aTokens : bTokens;
  const longer = shorter === aTokens ? bTokens : aTokens;
  return shorter.every((token) => longer.some((lt) => lt === token));
}

/** True when the concert headliner exactly matches a listened Spotify artist name. */
export function isExactArtistNameMatch(
  concertArtistName: string,
  spotifyArtistName: string
): boolean {
  const concertNorm = normalizeArtistName(concertArtistName);
  const spotifyNorm = normalizeArtistName(spotifyArtistName);
  return Boolean(concertNorm && spotifyNorm && concertNorm === spotifyNorm);
}

function highConfidenceFuzzyMatch(concertArtist: string, spotifyArtist: string): boolean {
  const a = normalizeArtistName(concertArtist);
  const b = normalizeArtistName(spotifyArtist);
  if (!a || !b || a.length < 4 || b.length < 4) return false;
  if (a === b) return true;

  const shorter = a.length <= b.length ? a : b;
  const longer = shorter === a ? b : a;
  if (!longer.includes(shorter)) return false;
  if (shorter.length / longer.length < 0.55) return false;

  const aFirst = significantTokens(concertArtist)[0];
  const bFirst = significantTokens(spotifyArtist)[0];
  return Boolean(aFirst && bFirst && aFirst === bFirst);
}

export function matchSpotifyArtist(
  concert: Concert,
  spotifyArtistDisplay: string,
  spotifyArtistNormalized: string
): ArtistMatchKind {
  const concertNorm = normalizeArtistName(concert.artistName ?? '');
  if (!concertNorm || !spotifyArtistNormalized) return 'none';

  if (
    concertNorm === spotifyArtistNormalized &&
    allowsExactArtistMatch(concert, spotifyArtistNormalized)
  ) {
    return 'exact';
  }

  if (
    strongTokenMatch(concert.artistName ?? '', spotifyArtistDisplay) &&
    allowsExactArtistMatch(concert, spotifyArtistNormalized)
  ) {
    return 'strong_token';
  }

  if (
    highConfidenceFuzzyMatch(concert.artistName ?? '', spotifyArtistDisplay) &&
    allowsExactArtistMatch(concert, spotifyArtistNormalized)
  ) {
    return 'fuzzy';
  }

  return 'none';
}
