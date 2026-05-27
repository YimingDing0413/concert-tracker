import type { Concert, MapConcertEvent, MapNearbyVenueGroup, MapVenue } from '@/types';

/** Build `MapNearbyVenueGroup` for existing map UI + routing (`/venue`, `/concert`). */
export function mapVenueToNearbyGroup(v: MapVenue): MapNearbyVenueGroup {
  return {
    venueId: v.id,
    venueName: v.name,
    address: v.address,
    city: v.city ?? '',
    state: v.region,
    country: v.country,
    latitude: v.latitude,
    longitude: v.longitude,
    upcomingShows: v.upcomingEvents.map((e) => mapMapConcertEventToConcert(v, e)),
  };
}

function mapMapConcertEventToConcert(venue: MapVenue, e: MapConcertEvent): Concert {
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
    externalIds:
      e.source === 'ticketmaster'
        ? { ticketmaster: e.id.replace(/^tm:event:/, '') }
        : undefined,
  };
}
