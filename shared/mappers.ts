import type { Concert, ConcertEvent, ConcertTiming } from './types/index.js';

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function eventStatus(date: string): 'upcoming' | 'past' {
  const today = new Date().toISOString().slice(0, 10);
  return date >= today ? 'upcoming' : 'past';
}

export function concertEventToConcert(event: ConcertEvent): Concert {
  const timing: ConcertTiming | undefined =
    event.doorsOpenTime ||
    event.openerStartTime ||
    event.headlinerStartTime ||
    event.endTime
      ? {
          doorsOpen: event.doorsOpenTime,
          openerStart: event.openerStartTime,
          headlinerStart: event.headlinerStartTime,
          endTime: event.endTime,
        }
      : undefined;

  return {
    id: event.id,
    artistId: event.artistId ?? event.id,
    artistName: event.artistName,
    venueId: event.venueId ?? `venue-${slugify(event.venueName)}`,
    venueName: event.venueName,
    city: event.city,
    state: event.state ?? event.region,
    country: event.country ?? 'USA',
    date: event.date,
    startTime: event.time,
    status: event.status ?? eventStatus(event.date),
    openers: event.openers,
    tourName: event.tourName,
    ticketUrl: event.ticketUrl,
    timing,
    imageUrl: event.imageUrl,
    source: event.source,
    externalIds: {
      ticketmaster: event.source === 'ticketmaster' ? event.id.replace('tm:event:', '') : undefined,
      bandsintown: event.source === 'bandsintown' ? event.id.replace('bit:', '') : undefined,
    },
  };
}
