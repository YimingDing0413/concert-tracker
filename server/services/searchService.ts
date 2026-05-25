import * as tm from '../clients/ticketmaster.js';
import { hasTicketmaster } from '../env.js';
import {
  filterMockSearch,
  mockSearchResults,
} from '../mock/fallbackData.js';
import {
  normalizeTmAttractionsSearch,
  normalizeTmEventsResponse,
  normalizeTmSearchResults,
  normalizeTmVenuesSearch,
} from '../normalize/ticketmaster.js';
import { withFallback } from '../lib/withFallback.js';
import type { SearchResult } from '../../shared/types/index.js';

export async function searchAll(query: string) {
  return withFallback(
    async () => {
      const [attractions, venues, events] = await Promise.all([
        tm.tmSearchAttractions(query, 5),
        tm.tmSearchVenues(query, 5),
        tm.tmSearchEvents({ keyword: query, size: 8 }),
      ]);
      const artists = normalizeTmAttractionsSearch(attractions);
      const venueList = normalizeTmVenuesSearch(venues);
      const eventList = normalizeTmEventsResponse(events);
      return normalizeTmSearchResults(artists, venueList, eventList);
    },
    () => (query ? filterMockSearch(query) : mockSearchResults),
    hasTicketmaster(),
    'Ticketmaster search'
  );
}
