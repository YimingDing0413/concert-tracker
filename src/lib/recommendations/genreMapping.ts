/**
 * Map Spotify microgenres and Ticketmaster genres to shared Encore buckets.
 */

export type EncoreGenreBucket =
  | 'pop'
  | 'hip-hop/rap'
  | 'r&b'
  | 'rock'
  | 'indie/alternative'
  | 'country'
  | 'latin'
  | 'dance/electronic'
  | 'jazz'
  | 'classical'
  | 'other';

const SPOTIFY_TO_BUCKET: Record<string, EncoreGenreBucket> = {
  pop: 'pop',
  'dance pop': 'pop',
  'canadian pop': 'pop',
  'alt z': 'pop',
  'indie pop': 'pop',
  'art pop': 'pop',
  'electropop': 'pop',
  'hip hop': 'hip-hop/rap',
  rap: 'hip-hop/rap',
  trap: 'hip-hop/rap',
  'toronto rap': 'hip-hop/rap',
  drill: 'hip-hop/rap',
  'conscious hip hop': 'hip-hop/rap',
  'r&b': 'r&b',
  'indie r&b': 'r&b',
  'alternative r&b': 'r&b',
  'neo soul': 'r&b',
  soul: 'r&b',
  rock: 'rock',
  'pop rock': 'rock',
  'indie rock': 'rock',
  'alt rock': 'rock',
  'alternative rock': 'rock',
  'classic rock': 'rock',
  'hard rock': 'rock',
  indie: 'indie/alternative',
  alternative: 'indie/alternative',
  house: 'dance/electronic',
  edm: 'dance/electronic',
  'electronic trap': 'dance/electronic',
  techno: 'dance/electronic',
  trance: 'dance/electronic',
  dubstep: 'dance/electronic',
  country: 'country',
  'country rock': 'country',
  latin: 'latin',
  reggaeton: 'latin',
  'latin pop': 'latin',
  jazz: 'jazz',
  classical: 'classical',
  orchestra: 'classical',
};

const TICKETMASTER_TO_BUCKET: Record<string, EncoreGenreBucket> = {
  pop: 'pop',
  rock: 'rock',
  'hip-hop/rap': 'hip-hop/rap',
  'r&b': 'r&b',
  country: 'country',
  latin: 'latin',
  dance: 'dance/electronic',
  electronic: 'dance/electronic',
  alternative: 'indie/alternative',
  jazz: 'jazz',
  classical: 'classical',
};

function normalizeGenreKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function mapSpotifyGenreToBucket(genre: string): EncoreGenreBucket {
  const key = normalizeGenreKey(genre);
  if (SPOTIFY_TO_BUCKET[key]) return SPOTIFY_TO_BUCKET[key];
  for (const [pattern, bucket] of Object.entries(SPOTIFY_TO_BUCKET)) {
    if (key.includes(pattern)) return bucket;
  }
  if (key.includes('rap') || key.includes('hip hop')) return 'hip-hop/rap';
  if (key.includes('r&b') || key.includes('soul')) return 'r&b';
  if (key.includes('electronic') || key.includes('house') || key.includes('edm')) {
    return 'dance/electronic';
  }
  if (key.includes('rock')) return 'rock';
  if (key.includes('pop')) return 'pop';
  return 'other';
}

export function mapTicketmasterGenreToBucket(genre?: string, subGenre?: string): EncoreGenreBucket | null {
  for (const raw of [subGenre, genre]) {
    if (!raw) continue;
    const key = normalizeGenreKey(raw);
    if (TICKETMASTER_TO_BUCKET[key]) return TICKETMASTER_TO_BUCKET[key];
    for (const [pattern, bucket] of Object.entries(TICKETMASTER_TO_BUCKET)) {
      if (key.includes(pattern)) return bucket;
    }
    if (key.includes('rap') || key.includes('hip hop')) return 'hip-hop/rap';
    if (key.includes('r&b') || key.includes('soul')) return 'r&b';
    if (key.includes('electronic') || key.includes('dance')) return 'dance/electronic';
    if (key.includes('rock')) return 'rock';
    if (key.includes('pop')) return 'pop';
  }
  return null;
}

/** Sum Spotify genre weights mapped to Encore buckets. */
export function buildSpotifyBucketWeights(
  genreWeights: Record<string, number> | undefined
): Map<EncoreGenreBucket, number> {
  const buckets = new Map<EncoreGenreBucket, number>();
  if (!genreWeights) return buckets;
  for (const [genre, weight] of Object.entries(genreWeights)) {
    const bucket = mapSpotifyGenreToBucket(genre);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + weight);
  }
  return buckets;
}

export function scoreGenreMatch(
  spotifyBucketWeights: Map<EncoreGenreBucket, number>,
  genreName?: string,
  subGenreName?: string
): { genreScore: number; subgenreScore: number; bucket?: EncoreGenreBucket } {
  const bucket = mapTicketmasterGenreToBucket(genreName, subGenreName);
  if (!bucket) return { genreScore: 0, subgenreScore: 0 };

  const weight = spotifyBucketWeights.get(bucket) ?? 0;
  if (weight <= 0) return { genreScore: 0, subgenreScore: 0, bucket };

  const genreScore = Math.min(20, Math.max(10, Math.round(weight / 12)));
  const subgenreScore =
    subGenreName && mapTicketmasterGenreToBucket(undefined, subGenreName) === bucket
      ? Math.min(25, Math.max(15, Math.round(weight / 10)))
      : 0;

  return { genreScore, subgenreScore, bucket };
}

export function bucketDisplayLabel(bucket: EncoreGenreBucket): string {
  switch (bucket) {
    case 'hip-hop/rap':
      return 'hip-hop';
    case 'indie/alternative':
      return 'indie';
    case 'dance/electronic':
      return 'electronic';
    default:
      return bucket;
  }
}
