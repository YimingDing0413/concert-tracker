import type { ConcertApiClient } from '@/api/client';
import {
  mockArtists,
  mockConcerts,
  mockPredictedSetlists,
  mockSetlists,
  mockVenues,
} from '@/data';
import type {
  ArtistDetail,
  AuthCredentials,
  ConcertDetail,
  ConcertRating,
  SearchResult,
  Setlist,
  ShowReportInput,
  ShowTimingResponse,
  SignUpInput,
  User,
  UserConcert,
  UserShowReport,
  VenueDetail,
} from '@/types';
import { aggregateShowReports, normalizeTime, parseOpenerNames } from '@shared/showReports';
import { delay } from './delay';
import {
  addUser,
  findUserByEmail,
  getDemoUser,
  getRatings,
  getStoredUserId,
  getUserConcerts,
  getUsers,
  removeUserConcertById,
  setStoredUserId,
  upsertRating,
  upsertUserConcert,
} from './storage';

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

const mockShowReports: UserShowReport[] = [];

function buildShowTiming(eventId: string, userId?: string): ShowTimingResponse {
  const reports = mockShowReports.filter((r) => r.eventId === eventId);
  return {
    reports,
    aggregated: aggregateShowReports(eventId, reports),
    userReport: userId
      ? [...reports].reverse().find((r) => r.userId === userId) ?? null
      : null,
  };
}

function buildPredictedSetlist(concertId: string, artistId: string): Setlist | undefined {
  const songs = mockPredictedSetlists[artistId];
  if (!songs?.length) return undefined;
  return {
    id: `predicted-${concertId}`,
    concertId,
    source: 'predicted',
    songs,
    updatedAt: new Date().toISOString(),
  };
}

export const mockApi: ConcertApiClient = {
  async login({ email }: AuthCredentials): Promise<User> {
    await delay();
    const existing = findUserByEmail(email);
    const user = existing ?? getDemoUser();
    setStoredUserId(user.id);
    return user;
  },

  async signUp(input: SignUpInput): Promise<User> {
    await delay();
    if (findUserByEmail(input.email)) {
      throw new Error('An account with this email already exists.');
    }
    const user: User = {
      id: generateId('user'),
      email: input.email,
      displayName: input.displayName,
      username: input.username,
      createdAt: new Date().toISOString(),
    };
    addUser(user);
    setStoredUserId(user.id);
    return user;
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(120);
    const id = getStoredUserId();
    if (!id) return null;
    return getUsers().find((u) => u.id === id) ?? null;
  },

  async logout(): Promise<void> {
    await delay(80);
    setStoredUserId(null);
  },

  async search(query: string): Promise<SearchResult[]> {
    await delay();
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const artistResults: SearchResult[] = mockArtists
      .filter((a) => a.name.toLowerCase().includes(q))
      .map((a) => ({
        id: a.id,
        type: 'artist' as const,
        title: a.name,
        subtitle: a.genres?.join(' · ') ?? 'Artist',
        imageUrl: a.imageUrl,
      }));

    const venueResults: SearchResult[] = mockVenues
      .filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q)
      )
      .map((v) => ({
        id: v.id,
        type: 'venue' as const,
        title: v.name,
        subtitle: `${v.city}, ${v.state ?? v.country}`,
        imageUrl: v.imageUrl,
      }));

    const eventResults: SearchResult[] = mockConcerts
      .filter(
        (c) =>
          c.artistName.toLowerCase().includes(q) ||
          c.venueName.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q)
      )
      .map((c) => ({
        id: c.id,
        type: 'event' as const,
        title: `${c.artistName} @ ${c.venueName}`,
        subtitle: `${formatDate(c.date)} · ${c.city}`,
        imageUrl: c.imageUrl,
      }));

    return [...artistResults, ...venueResults, ...eventResults].slice(0, 12);
  },

  async getArtist(id: string): Promise<ArtistDetail | null> {
    await delay();
    const artist = mockArtists.find((a) => a.id === id);
    if (!artist) return null;
    const concerts = mockConcerts.filter((c) => c.artistId === id);
    return {
      ...artist,
      upcomingConcerts: concerts
        .filter((c) => c.status === 'upcoming')
        .sort((a, b) => a.date.localeCompare(b.date)),
      pastConcerts: concerts
        .filter((c) => c.status === 'past')
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  },

  async getVenue(id: string): Promise<VenueDetail | null> {
    await delay();
    const venue = mockVenues.find((v) => v.id === id);
    if (!venue) return null;
    const upcomingEvents = mockConcerts
      .filter((c) => c.venueId === id && c.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
    return { ...venue, upcomingEvents };
  },

  async getConcert(id: string): Promise<ConcertDetail | null> {
    await delay();
    const concert = mockConcerts.find((c) => c.id === id);
    if (!concert) return null;
    const artist = mockArtists.find((a) => a.id === concert.artistId);
    const venue = mockVenues.find((v) => v.id === concert.venueId);
    const setlist = concert.setlistId
      ? mockSetlists.find((s) => s.id === concert.setlistId)
      : undefined;
    const predictedSetlist =
      concert.status === 'upcoming'
        ? buildPredictedSetlist(concert.id, concert.artistId)
        : undefined;
    return { ...concert, artist, venue, setlist, predictedSetlist };
  },

  async getArtists() {
    await delay(100);
    return mockArtists;
  },

  async getVenues() {
    await delay(100);
    return mockVenues;
  },

  async getConcerts() {
    await delay(100);
    return mockConcerts;
  },

  async getUserConcerts(userId: string) {
    await delay();
    return getUserConcerts().filter((uc) => uc.userId === userId);
  },

  async setConcertStatus(userId, concertId, status) {
    await delay();
    const existing = getUserConcerts().find(
      (uc) => uc.userId === userId && uc.concertId === concertId
    );
    const now = new Date().toISOString();
    const uc: UserConcert = existing
      ? { ...existing, status, updatedAt: now }
      : {
          id: generateId('uc'),
          userId,
          concertId,
          status,
          createdAt: now,
          updatedAt: now,
        };
    upsertUserConcert(uc);
    return uc;
  },

  async removeUserConcert(_userId, userConcertId) {
    await delay();
    removeUserConcertById(userConcertId);
  },

  async addManualConcert(userId, input) {
    await delay();
    const now = new Date().toISOString();
    const manualId = generateId('manual');
    const uc: UserConcert = {
      id: generateId('uc'),
      userId,
      concertId: manualId,
      status: input.status,
      isManual: true,
      manualConcert: {
        id: manualId,
        artistName: input.artistName,
        venueName: input.venueName,
        city: input.city,
        state: input.state,
        country: input.country ?? 'USA',
        date: input.date,
        startTime: input.startTime,
        openers: input.openers ? [input.openers] : undefined,
        status: input.date >= new Date().toISOString().slice(0, 10) ? 'upcoming' : 'past',
      },
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    };
    upsertUserConcert(uc);
    return uc;
  },

  async updateUserConcertNotes(userId, userConcertId, notes) {
    await delay();
    const uc = getUserConcerts().find(
      (u) => u.id === userConcertId && u.userId === userId
    );
    if (!uc) throw new Error('Concert not found');
    const updated = { ...uc, notes, updatedAt: new Date().toISOString() };
    upsertUserConcert(updated);
    return updated;
  },

  async getRating(userId, concertId) {
    await delay(120);
    return getRatings().find((r) => r.userId === userId && r.concertId === concertId) ?? null;
  },

  async saveRating(userId, userConcertId, concertId, input) {
    await delay();
    const existing = getRatings().find(
      (r) => r.userId === userId && r.concertId === concertId
    );
    const now = new Date().toISOString();
    const rating: ConcertRating = existing
      ? { ...existing, ...input, updatedAt: now }
      : {
          id: generateId('rating'),
          userId,
          concertId,
          userConcertId,
          ...input,
          createdAt: now,
          updatedAt: now,
        };
    upsertRating(rating);
    const uc = getUserConcerts().find((u) => u.id === userConcertId);
    if (uc) upsertUserConcert({ ...uc, ratingId: rating.id, status: 'attended' });
    return rating;
  },

  async getShowTiming(eventId, userId) {
    await delay(120);
    return buildShowTiming(eventId, userId);
  },

  async submitShowReport(eventId, userId, input: ShowReportInput) {
    await delay();
    const now = new Date().toISOString();
    const openerNames = input.openerNames ? parseOpenerNames(input.openerNames) : undefined;
    const report: UserShowReport = {
      id: generateId('sr'),
      eventId,
      userId,
      doorsOpenTime: input.doorsOpenTime
        ? (normalizeTime(input.doorsOpenTime) ?? input.doorsOpenTime.trim())
        : undefined,
      openerNames: openerNames?.length ? openerNames : undefined,
      openerStartTime: input.openerStartTime
        ? (normalizeTime(input.openerStartTime) ?? input.openerStartTime.trim())
        : undefined,
      headlinerStartTime: input.headlinerStartTime
        ? (normalizeTime(input.headlinerStartTime) ?? input.headlinerStartTime.trim())
        : undefined,
      endTime: input.endTime
        ? (normalizeTime(input.endTime) ?? input.endTime.trim())
        : undefined,
      notes: input.notes?.trim() || undefined,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl?.trim() || undefined,
      confidence: input.confidence,
      createdAt: now,
      updatedAt: now,
    };
    mockShowReports.push(report);
    return buildShowTiming(eventId, userId);
  },
};

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
