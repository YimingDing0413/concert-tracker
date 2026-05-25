import type { Artist, ConcertEvent } from '../../shared/types/index.js';
import { slugify } from '../../shared/mappers.js';
import type { BitArtist, BitEvent } from '../clients/bandsintown.js';

export function normalizeBitArtist(raw: BitArtist): Artist {
  return {
    id: `bit:artist:${raw.id}`,
    name: raw.name,
    slug: slugify(raw.name),
    imageUrl: raw.image_url,
    thumbUrl: raw.thumb_url,
    trackerCount: raw.tracker_count,
    upcomingEventCount: raw.upcoming_event_count,
    externalIds: { bandsintown: raw.id },
    source: 'bandsintown',
  };
}

export function normalizeBitEvent(raw: BitEvent, artistName: string): ConcertEvent {
  const date = raw.datetime.slice(0, 10);
  const time = raw.datetime.length > 10 ? raw.datetime.slice(11, 16) : undefined;
  const headliner = raw.lineup?.[0] ?? artistName;
  const openers = raw.lineup?.slice(1);

  return {
    id: `bit:${raw.id}`,
    source: 'bandsintown',
    title: raw.title ?? headliner,
    artistName: headliner,
    venueName: raw.venue.name,
    venueId: `bit:venue:${slugify(raw.venue.name)}-${slugify(raw.venue.city)}`,
    city: raw.venue.city,
    region: raw.venue.region,
    state: raw.venue.region,
    country: raw.venue.country,
    date,
    time,
    ticketUrl: raw.offers?.[0]?.url ?? raw.url,
    openers: openers?.length ? openers : undefined,
    lineup: raw.lineup,
    rawSourceUrl: raw.url,
    status: date >= new Date().toISOString().slice(0, 10) ? 'upcoming' : 'past',
  };
}

export function normalizeBitEvents(events: BitEvent[], artistName: string): ConcertEvent[] {
  return events.map((e) => normalizeBitEvent(e, artistName));
}
