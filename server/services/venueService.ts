import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import { mockVenues, mockEvents } from '../mock/fallbackData.js';
import {
  normalizeTmVenue,
  normalizeTmVenuesSearch,
  normalizeTmEventsResponse,
} from '../normalize/ticketmaster.js';
import { withFallback } from '../lib/withFallback.js';
import { concertEventToConcert } from '../../shared/mappers.js';
import type { VenueDetail } from '../../shared/types/index.js';

export async function searchVenues(keyword: string) {
  return withFallback(
    async () => {
      const payload = await tm.tmSearchVenues({ keyword, size: 15 });
      return normalizeTmVenuesSearch(payload);
    },
    () => mockVenues.filter((v) => v.name.toLowerCase().includes(keyword.toLowerCase())),
    hasTicketmaster(),
    'Ticketmaster venues'
  );
}

export async function getVenueDetail(id: string) {
  return withFallback(
    async () => {
      const payload = await tm.tmGetVenue(id);
      const venue = normalizeTmVenue(payload);
      if (!venue) throw new Error('Venue not found');
      return venue;
    },
    () => mockVenues.find((v) => v.id === id) ?? mockVenues[0],
    hasTicketmaster(),
    'Ticketmaster venue'
  );
}

export async function getVenueEvents(venueId: string) {
  return withFallback(
    async () => {
      const payload = await tm.tmVenueEvents(venueId, 40);
      return normalizeTmEventsResponse(payload);
    },
    () => mockEvents,
    hasTicketmaster(),
    'Ticketmaster venue events'
  );
}

export async function getVenueDetailPage(id: string) {
  const [venueRes, eventsRes] = await Promise.all([
    getVenueDetail(id),
    getVenueEvents(id),
  ]);
  const upcoming = eventsRes.data
    .map(concertEventToConcert)
    .filter((c) => c.status === 'upcoming')
    .sort((a, b) => a.date.localeCompare(b.date));

  const detail: VenueDetail = {
    ...venueRes.data,
    upcomingEvents: upcoming,
  };

  return {
    data: detail,
    meta: venueRes.meta ?? eventsRes.meta,
  };
}
