import type { ConcertApiClient } from './client';
import { apiFetchData } from './http';
import {
  mergeUserConcerts,
  readLocalUserConcerts,
  removeLocalUserConcert,
  upsertLocalUserConcert,
  writeLocalUserConcerts,
} from '@/lib/userConcertsLocal';
import { concertEventToConcert } from '@shared/mappers';
import type {
  ArtistDetail,
  ConcertDetail,
  ConcertEvent,
  ConcertRating,
  SearchResult,
  ShowTimingResponse,
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
    const local = readLocalUserConcerts(userId);
    let server: UserConcert[] = [];
    try {
      server = await apiFetchData<UserConcert[]>(
        `/api/user/concerts?userId=${encodeURIComponent(userId)}`
      );
    } catch {
      /* use local only if API unavailable */
    }
    const merged = mergeUserConcerts(server, local);
    writeLocalUserConcerts(userId, merged);
    return merged;
  },

  async setConcertStatus(userId, concertId, status) {
    const now = new Date().toISOString();
    const existing = readLocalUserConcerts(userId).find(
      (uc) => uc.userId === userId && uc.concertId === concertId
    );
    const optimistic: UserConcert = existing
      ? { ...existing, status, updatedAt: now }
      : {
          id: `uc-local-${crypto.randomUUID().slice(0, 8)}`,
          userId,
          concertId,
          status,
          createdAt: now,
          updatedAt: now,
        };
    upsertLocalUserConcert(optimistic);

    try {
      const saved = await apiFetchData<UserConcert>('/api/user/concerts/status', {
        method: 'POST',
        body: JSON.stringify({ userId, concertId, status }),
      });
      upsertLocalUserConcert(saved);
      return saved;
    } catch {
      return optimistic;
    }
  },

  async removeUserConcert(userId, userConcertId) {
    removeLocalUserConcert(userId, userConcertId);
    try {
      await apiFetchData<null>(
        `/api/user/concerts/${encodeURIComponent(userConcertId)}?userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      );
    } catch {
      /* removed locally */
    }
  },

  async addManualConcert(userId, input) {
    try {
      const saved = await apiFetchData<UserConcert>('/api/user/concerts/manual', {
        method: 'POST',
        body: JSON.stringify({ userId, ...input }),
      });
      upsertLocalUserConcert(saved);
      return saved;
    } catch {
      const now = new Date().toISOString();
      const manualId = `manual-${crypto.randomUUID().slice(0, 8)}`;
      const uc: UserConcert = {
        id: `uc-local-${crypto.randomUUID().slice(0, 8)}`,
        userId,
        concertId: manualId,
        status: input.status,
        isManual: true,
        manualConcert: {
          artistName: input.artistName,
          venueName: input.venueName,
          city: input.city,
          state: input.state,
          country: input.country ?? 'USA',
          date: input.date,
          startTime: input.startTime,
          openers: input.openers ? [input.openers] : undefined,
        },
        concertSnapshot: {
          artistName: input.artistName,
          venueName: input.venueName,
          city: input.city,
          state: input.state,
          country: input.country ?? 'USA',
          date: input.date,
        },
        notes: input.notes,
        createdAt: now,
        updatedAt: now,
      };
      upsertLocalUserConcert(uc);
      return uc;
    }
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

  async getShowTiming(eventId, userId) {
    const encoded = encodeURIComponent(eventId);
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    return apiFetchData<ShowTimingResponse>(`/api/events/${encoded}/show-timing${q}`);
  },

  async submitShowReport(eventId, userId, input) {
    const encoded = encodeURIComponent(eventId);
    const res = await apiFetchData<{
      report: import('@/types').UserShowReport;
    } & ShowTimingResponse>(`/api/events/${encoded}/show-reports`, {
      method: 'POST',
      body: JSON.stringify({ userId, ...input }),
    });
    return {
      reports: res.reports,
      aggregated: res.aggregated,
      userReport: res.userReport,
    };
  },
};
