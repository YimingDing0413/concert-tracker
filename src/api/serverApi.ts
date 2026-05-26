import type { ConcertApiClient } from './client';
import { apiFetchData } from './http';
import { concertEventToConcert } from '@shared/mappers';
import type {
  ArtistDetail,
  ConcertDetail,
  ConcertEvent,
  ConcertRating,
  SearchResult,
  User,
  UserConcert,
  VenueDetail,
} from '@/types';

/** Frontend client — calls internal backend only (never third-party APIs) */
export const serverApi: ConcertApiClient = {
  async login(credentials) {
    return apiFetchData<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async signUp(input) {
    return apiFetchData<User>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getCurrentUser() {
    return apiFetchData<User | null>('/api/auth/me');
  },

  async logout() {
    await apiFetchData<null>('/api/auth/logout', { method: 'POST' });
  },

  async search(query) {
    const q = encodeURIComponent(query.trim());
    return apiFetchData<SearchResult[]>(`/api/search?query=${q}`);
  },

  async getArtist(id) {
    const encoded = encodeURIComponent(id);
    return apiFetchData<ArtistDetail | null>(`/api/artists/${encoded}`);
  },

  async getVenue(id) {
    const encoded = encodeURIComponent(id);
    return apiFetchData<VenueDetail | null>(`/api/venues/${encoded}`);
  },

  async getConcert(id) {
    const encoded = encodeURIComponent(id);
    return apiFetchData<ConcertDetail | null>(`/api/events/${encoded}`);
  },

  async getArtists() {
    return apiFetchData<import('@/types').Artist[]>('/api/artists');
  },

  async getVenues() {
    return apiFetchData<import('@/types').Venue[]>('/api/venues');
  },

  async getConcerts() {
    const events = await apiFetchData<ConcertEvent[]>('/api/events');
    return events.map(concertEventToConcert);
  },

  async getUserConcerts(userId) {
    return apiFetchData<UserConcert[]>(`/api/user/concerts?userId=${encodeURIComponent(userId)}`);
  },

  async setConcertStatus(userId, concertId, status) {
    return apiFetchData<UserConcert>('/api/user/concerts/status', {
      method: 'POST',
      body: JSON.stringify({ userId, concertId, status }),
    });
  },

  async removeUserConcert() {
    /* not implemented on server yet */
  },

  async addManualConcert(userId, input) {
    return apiFetchData<UserConcert>('/api/user/concerts/manual', {
      method: 'POST',
      body: JSON.stringify({ userId, ...input }),
    });
  },

  async updateUserConcertNotes() {
    throw new Error('Not implemented');
  },

  async getRating(userId, concertId) {
    return apiFetchData<ConcertRating | null>(
      `/api/user/ratings?userId=${encodeURIComponent(userId)}&concertId=${encodeURIComponent(concertId)}`
    );
  },

  async saveRating(userId, userConcertId, concertId, input) {
    return apiFetchData<ConcertRating>('/api/user/ratings', {
      method: 'POST',
      body: JSON.stringify({ userId, userConcertId, concertId, ...input }),
    });
  },
};
