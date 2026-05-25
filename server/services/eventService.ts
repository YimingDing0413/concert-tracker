import * as bit from '../clients/bandsintown.js';
import * as tm from '../clients/ticketmaster.js';
import { hasBandsintown, hasTicketmaster } from '../env.js';
import { mockEvents } from '../mock/fallbackData.js';
import { normalizeBitEvents } from '../normalize/bandsintown.js';
import {
  normalizeTmEvent,
  normalizeTmEventsResponse,
} from '../normalize/ticketmaster.js';
import { withFallback } from '../lib/withFallback.js';
import type { ConcertEvent } from '../../shared/types/index.js';
import { buildPredictedSetlist } from '../normalize/setlistfm.js';
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

  const predictedRes = await getPredictedSetlist(name, eventId);
  return { data: predictedRes.data, meta: predictedRes.meta };
}

export async function getPredictedSetlist(artistName: string, concertId?: string) {
  const setlistsRes = await getSetlistsForArtist(artistName);
  const recent = setlistsRes.data.filter((s) => s.source === 'actual');
  if (!recent.length) {
    return {
      data: buildPredictedSetlist(artistName, [], concertId ?? 'predicted'),
      meta: setlistsRes.meta,
    };
  }
  return {
    data: buildPredictedSetlist(artistName, recent, concertId ?? 'predicted'),
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
