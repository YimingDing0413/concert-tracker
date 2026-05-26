import * as bit from '../clients/bandsintown.js';
import * as sl from '../clients/setlistfm.js';
import * as tm from '../clients/ticketmaster.js';
import { hasBandsintown, hasSetlistFm, hasTicketmaster } from '../env.js';
import { mockEvents } from '../mock/fallbackData.js';
import { normalizeBitEvents } from '../normalize/bandsintown.js';
import {
  normalizeTmEvent,
  normalizeTmEventsResponse,
} from '../normalize/ticketmaster.js';
import { withFallback } from '../lib/withFallback.js';
import type { ConcertEvent } from '../../shared/types/index.js';
import {
  buildPredictedSetlist,
  normalizeSlSetlist,
  predictSetlistFromSameTour,
  setlistToPastEvent,
} from '../normalize/setlistfm.js';
import { getSetlistsForArtist } from './artistService.js';

export async function listEvents(params: {
  keyword?: string;
  city?: string;
  artist?: string;
}) {
  return withFallback(
    async () => {
      const payload = await tm.tmSearchEvents({
        keyword: params.keyword ?? params.artist,
        city: params.city,
        size: 30,
      });
      return normalizeTmEventsResponse(payload);
    },
    () => mockEvents,
    hasTicketmaster(),
    'Ticketmaster events'
  );
}

export async function getEventById(id: string) {
  if (id.startsWith('bit:')) {
    return withFallback(
      async () => {
        throw new Error('BIT single event fetch uses artist events list');
      },
      () => mockEvents.find((e) => e.id === id) ?? mockEvents[0],
      false,
      'Bandsintown event'
    );
  }

  if (id.startsWith('sl:event:')) {
    return withFallback(
      async () => {
        const setlistId = id.replace(/^sl:event:/, '');
        const raw = await sl.slGetSetlist(setlistId);
        const setlist = normalizeSlSetlist(raw, id);
        const base = setlistToPastEvent(setlist, raw.artist?.name ?? 'Artist');
        // Try to find the matching Ticketmaster event to enrich (openers, better location, etc.)
        const enriched = await enrichFromTicketmasterSearch(base);
        return enriched;
      },
      () => mockEvents.find((e) => e.id === id) ?? mockEvents[0],
      hasSetlistFm(),
      'Setlist.fm event'
    );
  }

  return withFallback(
    async () => {
      const payload = await tm.tmGetEvent(id);
      const event = normalizeTmEvent(payload);
      if (!event) throw new Error('Event not found');
      return event;
    },
    () => mockEvents.find((e) => e.id === id) ?? mockEvents[0],
    hasTicketmaster(),
    'Ticketmaster event'
  );
}

export async function getEventSetlist(eventId: string, artistName?: string) {
  if (eventId.startsWith('sl:event:')) {
    return withFallback(
      async () => {
        const setlistId = eventId.replace(/^sl:event:/, '');
        const raw = await sl.slGetSetlist(setlistId);
        return normalizeSlSetlist(raw, eventId);
      },
      () => null,
      hasSetlistFm(),
      'Setlist.fm'
    );
  }
  const eventRes = await getEventById(eventId);
  const event = eventRes.data;
  const name = artistName ?? event.artistName;
  const isPast = event.status === 'past' || event.date < new Date().toISOString().slice(0, 10);

  if (isPast) {
    const setlistsRes = await getSetlistsForArtist(name);
    const match =
      setlistsRes.data.find(
        (s) =>
          s.eventDate === event.date &&
          s.venueName?.toLowerCase() === event.venueName.toLowerCase()
      ) ?? setlistsRes.data[0];
    return { data: match ?? null, meta: setlistsRes.meta };
  }

  const predictedRes = await getPredictedSetlist(name, eventId, event.tourName);
  return { data: predictedRes.data, meta: predictedRes.meta };
}

async function enrichFromTicketmasterSearch(base: ConcertEvent): Promise<ConcertEvent> {
  if (!hasTicketmaster()) return base;
  if (!base.artistName || !base.date || !base.city) return base;

  const startDateTime = `${base.date}T00:00:00Z`;
  const endDateTime = `${base.date}T23:59:59Z`;
  const payload = await tm.tmSearchEvents({
    keyword: base.artistName,
    city: base.city,
    startDateTime,
    endDateTime,
    size: 20,
  });
  const candidates = normalizeTmEventsResponse(payload);
  const match = candidates.find((e) => sameVenueName(e.venueName, base.venueName));
  if (!match) return base;

  return {
    ...base,
    venueId: match.venueId ?? base.venueId,
    city: match.city || base.city,
    state: match.state ?? base.state,
    country: match.country ?? base.country,
    time: match.time ?? base.time,
    openers: match.openers ?? base.openers,
    imageUrl: match.imageUrl ?? base.imageUrl,
    ticketUrl: match.ticketUrl ?? base.ticketUrl,
  };
}

function sameVenueName(a: string, b: string): boolean {
  const na = normalizeVenueName(a);
  const nb = normalizeVenueName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

function normalizeVenueName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function getPredictedSetlist(
  artistName: string,
  concertId?: string,
  tourName?: string
) {
  const pages = tourName?.trim() ? 8 : 1;
  const setlistsRes = await getSetlistsForArtist(artistName, { pages });
  const recent = setlistsRes.data.filter((s) => s.source === 'actual');
  const id = concertId ?? 'predicted';

  if (tourName?.trim()) {
    const fromTour = predictSetlistFromSameTour(recent, tourName, artistName, id);
    if (fromTour) {
      return { data: fromTour, meta: setlistsRes.meta };
    }
  }

  if (!recent.length) {
    return {
      data: buildPredictedSetlist(artistName, [], id),
      meta: setlistsRes.meta,
    };
  }
  return {
    data: buildPredictedSetlist(artistName, recent, id),
    meta: setlistsRes.meta,
  };
}

export async function mergeEventDetail(
  event: ConcertEvent,
  artistName: string
): Promise<ConcertEvent> {
  if (hasBandsintown()) {
    try {
      const bitEvents = await bit.bitGetArtistEvents(artistName);
      const normalized = normalizeBitEvents(bitEvents, artistName);
      const match = normalized.find(
        (e) =>
          e.date === event.date &&
          e.venueName.toLowerCase().includes(event.venueName.toLowerCase().slice(0, 8))
      );
      if (match) {
        return {
          ...event,
          openers: match.openers ?? event.openers,
          ticketUrl: match.ticketUrl ?? event.ticketUrl,
          lineup: match.lineup,
        };
      }
    } catch {
      /* optional enrichment */
    }
  }
  return event;
}
