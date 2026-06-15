import { getMapEventsVenues } from './mapService.js';
import { getAllUserConcerts } from '../../src/lib/db/concertRepository.js';
import {
  buildUserConcertHistory,
  getSpotifyConcertRecommendations,
} from '../../src/lib/recommendations/spotifyConcertRecommendations.js';
import { getSpotifyTasteProfile } from '../../src/lib/db/spotifyRepository.js';
import type { Concert, MapConcertEvent, MapVenue } from '../../shared/types/index.js';
import type { SpotifyConcertRecommendation } from '../../shared/types/spotify.js';

function mapEventToConcert(venue: MapVenue, e: MapConcertEvent): Concert {
  return {
    id: e.id,
    artistId: e.artistId ?? e.id,
    artistName: e.artistName ?? e.title,
    venueId: venue.id,
    venueName: venue.name,
    city: venue.city ?? '',
    state: venue.region,
    country: venue.country ?? 'USA',
    date: e.date,
    startTime: e.time,
    status: 'upcoming',
    ticketUrl: e.ticketUrl,
    imageUrl: e.imageUrl,
    source: e.source === 'ticketmaster' ? 'ticketmaster' : 'mock',
    venueLatitude: venue.latitude,
    venueLongitude: venue.longitude,
    venueAddress: venue.address,
    segmentName: e.segmentName,
    genreName: e.genreName,
    subGenreName: e.subGenreName,
  };
}

function concertsFromMapVenues(venues: MapVenue[]): Concert[] {
  const list: Concert[] = [];
  for (const venue of venues) {
    for (const event of venue.upcomingEvents) {
      list.push(mapEventToConcert(venue, event));
    }
  }
  return list;
}

export async function getSpotifyConcertRecommendationsForUser(payload: {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm?: number;
  limit?: number;
}): Promise<{
  recommendations: SpotifyConcertRecommendation[];
  nearbyCount: number;
  hasTasteProfile: boolean;
}> {
  const { userId, latitude, longitude } = payload;
  const radiusKm = Math.min(100, Math.max(10, payload.radiusKm ?? 50));
  const limit = payload.limit ?? 6;

  const taste = await getSpotifyTasteProfile(userId);
  if (!taste || taste.topArtists.length === 0) {
    return { recommendations: [], nearbyCount: 0, hasTasteProfile: false };
  }

  const [mapResult, userConcerts] = await Promise.all([
    getMapEventsVenues({ latitude, longitude, radiusKm }),
    getAllUserConcerts(userId),
  ]);

  const candidates = concertsFromMapVenues(mapResult.venues);
  const history = buildUserConcertHistory(userConcerts);
  const recommendations = getSpotifyConcertRecommendations(
    candidates,
    taste,
    history,
    limit
  );

  return {
    recommendations,
    nearbyCount: candidates.length,
    hasTasteProfile: true,
  };
}
