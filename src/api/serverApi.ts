import type { ConcertApiClient } from './client';
import { apiFetchData } from './http';
import { setAuthToken } from '@/lib/auth/session';
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
  Concert,
  ConcertDetail,
  ConcertEvent,
  ConcertRating,
  ConcertSaveResult,
  ManualConcertInput,
  SearchResult,
  ShowTimingResponse,
  AuthSession,
  User,
  UserConcert,
  VenueDetail,
} from '@/types';

function persistSession(session: AuthSession): User {
  setAuthToken(session.token);
  return session.user;
}

function eventSnapshotBody(eventSnapshot?: Partial<Concert>) {
  if (!eventSnapshot) return {};
  return { event: { ...eventSnapshot, id: eventSnapshot.id } };
}

async function persistConcertStatus(
  userId: string,
  concertId: string,
  status: UserConcert['status'],
  eventSnapshot?: Partial<Concert>
): Promise<ConcertSaveResult> {
  const now = new Date().toISOString();
  const existing = readLocalUserConcerts(userId).find(
    (uc) => uc.userId === userId && uc.concertId === concertId
  );
  const optimistic: UserConcert = existing
    ? {
        ...existing,
        status,
        concertSnapshot: eventSnapshot ?? existing.concertSnapshot,
        updatedAt: now,
        pendingSync: true,
      }
    : {
        id: `uc-local-${crypto.randomUUID().slice(0, 8)}`,
        userId,
        concertId,
        status,
        concertSnapshot: eventSnapshot,
        createdAt: now,
        updatedAt: now,
        pendingSync: true,
      };
  upsertLocalUserConcert(optimistic);

  const snapshotPayload = eventSnapshotBody(eventSnapshot);
  const body = {
    userId,
    eventId: concertId,
    status,
    ...snapshotPayload,
  };

  try {
    if (status === 'attended') {
      const saved = await apiFetchData<UserConcert>('/api/user/concerts/attended', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const synced = { ...saved, pendingSync: false };
      upsertLocalUserConcert(synced);
      return { userConcert: synced, synced: true };
    }

    const saved = await apiFetchData<UserConcert>('/api/user/concerts/save', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const synced = { ...saved, pendingSync: false };
    upsertLocalUserConcert(synced);
    return { userConcert: synced, synced: true };
  } catch {
    try {
      const saved = await apiFetchData<UserConcert>('/api/user/concerts/status', {
        method: 'POST',
        body: JSON.stringify({ userId, concertId, status, event: body.event }),
      });
      const synced = { ...saved, pendingSync: false };
      upsertLocalUserConcert(synced);
      return { userConcert: synced, synced: true };
    } catch {
      return { userConcert: optimistic, synced: false };
    }
  }
}

async function persistManualConcert(
  userId: string,
  input: ManualConcertInput
): Promise<ConcertSaveResult> {
  try {
    const saved = await apiFetchData<UserConcert>('/api/user/concerts/manual', {
      method: 'POST',
      body: JSON.stringify({ userId, ...input }),
    });
    const synced = { ...saved, pendingSync: false };
    upsertLocalUserConcert(synced);
    return { userConcert: synced, synced: true };
  } catch {
    const now = new Date().toISOString();
    const manualId = `manual-${crypto.randomUUID().slice(0, 8)}`;
    const uc: UserConcert = {
      id: `uc-local-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      concertId: manualId,
      status: input.status,
      isManual: true,
      pendingSync: true,
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
    return { userConcert: uc, synced: false };
  }
}

async function flushPendingConcertSyncs(userId: string): Promise<void> {
  const pending = readLocalUserConcerts(userId).filter((uc) => uc.pendingSync);
  for (const uc of pending) {
    try {
      if (uc.isManual) {
        const snap = uc.manualConcert ?? uc.concertSnapshot;
        if (!snap?.artistName || !snap.date) continue;
        const saved = await apiFetchData<UserConcert>('/api/user/concerts/manual', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            artistName: snap.artistName,
            venueName: snap.venueName,
            city: snap.city,
            state: snap.state,
            country: snap.country,
            date: snap.date,
            startTime: snap.startTime,
            openers: Array.isArray(snap.openers) ? snap.openers.join(', ') : undefined,
            notes: uc.notes,
            status: uc.status,
          }),
        });
        removeLocalUserConcert(userId, uc.id);
        upsertLocalUserConcert({ ...saved, pendingSync: false });
      } else {
        const result = await persistConcertStatus(
          userId,
          uc.concertId,
          uc.status,
          uc.concertSnapshot
        );
        if (!result.synced) {
          /* still offline — leave pendingSync */
        }
      }
    } catch {
      /* keep pending for a later pass */
    }
  }
}

/** Frontend client — calls internal backend only (never third-party APIs) */
export const serverApi: ConcertApiClient = {
  async login(credentials) {
    const session = await apiFetchData<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    return persistSession(session);
  },

  async signUp(input) {
    const session = await apiFetchData<AuthSession>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return persistSession(session);
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
    await flushPendingConcertSyncs(userId);
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

  async setConcertStatus(userId, concertId, status, eventSnapshot) {
    return persistConcertStatus(userId, concertId, status, eventSnapshot);
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
    return persistManualConcert(userId, input);
  },

  async updateUserConcertNotes() {
    throw new Error('Not implemented');
  },

  async getRating(userId, concertId) {
    const encoded = encodeURIComponent(concertId);
    try {
      return await apiFetchData<ConcertRating | null>(
        `/api/concerts/${encoded}/ratings?userId=${encodeURIComponent(userId)}`
      );
    } catch {
      return apiFetchData<ConcertRating | null>(
        `/api/user/ratings?userId=${encodeURIComponent(userId)}&concertId=${encodeURIComponent(concertId)}`
      );
    }
  },

  async saveRating(userId, userConcertId, concertId, input) {
    const encoded = encodeURIComponent(concertId);
    try {
      return await apiFetchData<ConcertRating>(`/api/concerts/${encoded}/ratings`, {
        method: 'POST',
        body: JSON.stringify({ userId, userConcertId, ...input }),
      });
    } catch {
      return apiFetchData<ConcertRating>('/api/user/ratings', {
        method: 'POST',
        body: JSON.stringify({ userId, userConcertId, concertId, ...input }),
      });
    }
  },

  async getShowTiming(eventId, userId) {
    const encoded = encodeURIComponent(eventId);
    const q = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    try {
      return apiFetchData<ShowTimingResponse>(`/api/concerts/${encoded}/show-timing${q}`);
    } catch {
      return apiFetchData<ShowTimingResponse>(`/api/events/${encoded}/show-timing${q}`);
    }
  },

  async submitShowReport(eventId, userId, input) {
    const encoded = encodeURIComponent(eventId);
    try {
      const res = await apiFetchData<{
        report: import('@/types').UserShowReport;
      } & ShowTimingResponse>(`/api/concerts/${encoded}/show-reports`, {
        method: 'POST',
        body: JSON.stringify({ userId, ...input }),
      });
      return {
        reports: res.reports,
        aggregated: res.aggregated,
        userReport: res.userReport,
      };
    } catch {
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
    }
  },
};
