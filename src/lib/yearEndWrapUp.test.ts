import { describe, expect, it } from 'vitest';
import type { UserConcert } from '@/types';
import type { ConcertReview } from '@/types/concertReview';
import { getYearEndStats, getYearEntries, getYearsWithEntries } from './yearEndWrapUp';

function uc(
  partial: Partial<UserConcert> & Pick<UserConcert, 'id' | 'concertId' | 'status'>
): UserConcert {
  return {
    userId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

function review(
  partial: Partial<ConcertReview> & Pick<ConcertReview, 'id' | 'eventId' | 'artistName'>
): ConcertReview {
  return {
    userId: 'u1',
    overallRating: 0,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...partial,
  };
}

describe('getYearEntries', () => {
  it('includes attended-only shows with no reviews', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: { artistName: 'A', date: '2026-03-01', venueName: 'V1', city: 'Toronto' },
      }),
      uc({
        id: '2',
        concertId: 'e2',
        status: 'attended',
        concertSnapshot: { artistName: 'B', date: '2026-04-01' },
      }),
      uc({
        id: '3',
        concertId: 'e3',
        status: 'going',
        concertSnapshot: { artistName: 'C', date: '2026-05-01' },
      }),
    ];
    const entries = getYearEntries(concerts, [], 2026);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.concertId)).toEqual(['e1', 'e2']);
  });

  it('includes review-only legacy shows', () => {
    const entries = getYearEntries(
      [],
      [
        review({
          id: 'r1',
          eventId: 'legacy-1',
          artistName: 'Legacy',
          eventDate: '2025-08-12',
          overallRating: 8,
        }),
      ],
      2025
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].artistName).toBe('Legacy');
    expect(entries[0].review?.overallRating).toBe(8);
  });

  it('dedupes when both attended and review exist', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: { artistName: 'A', date: '2026-03-01' },
      }),
    ];
    const reviews = [
      review({
        id: 'r1',
        eventId: 'e1',
        artistName: 'A',
        eventDate: '2026-03-01',
        overallRating: 9,
        favoriteSong: 'Hit',
      }),
    ];
    const entries = getYearEntries(concerts, reviews, 2026);
    expect(entries).toHaveLength(1);
    expect(entries[0].review?.favoriteSong).toBe('Hit');
  });

  it('respects year boundaries via YYYY-MM-DD', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: { artistName: 'A', date: '2025-12-31' },
      }),
      uc({
        id: '2',
        concertId: 'e2',
        status: 'attended',
        concertSnapshot: { artistName: 'B', date: '2026-01-01' },
      }),
    ];
    expect(getYearEntries(concerts, [], 2025)).toHaveLength(1);
    expect(getYearEntries(concerts, [], 2026)).toHaveLength(1);
  });

  it('falls back to createdAt when show date is missing', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        createdAt: '2024-07-04T12:00:00.000Z',
        concertSnapshot: { artistName: 'A' },
      }),
    ];
    expect(getYearEntries(concerts, [], 2024)).toHaveLength(1);
  });

  it('dedupes two attended rows with the same concertId', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: { artistName: 'A', date: '2026-03-01' },
      }),
      uc({
        id: '2',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: {
          artistName: 'A',
          date: '2026-03-01',
          imageUrl: 'https://s1.ticketm.net/dam/a.jpg',
        },
      }),
    ];
    const entries = getYearEntries(concerts, [], 2026);
    expect(entries).toHaveLength(1);
    expect(entries[0].concertId).toBe('e1');
    expect(entries[0].imageUrl).toContain('ticketm.net');
  });

  it('collapses the same show under a catalog id and a manual id', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'tm-event-1',
        status: 'attended',
        concertSnapshot: { artistName: 'The Weeknd', date: '2026-06-15' },
      }),
      uc({
        id: '2',
        concertId: 'manual-abc',
        status: 'attended',
        isManual: true,
        concertSnapshot: { artistName: 'the weeknd', date: '2026-06-15' },
        manualConcert: { artistName: 'the weeknd', date: '2026-06-15' },
      }),
    ];
    const reviews = [
      review({
        id: 'r1',
        eventId: 'manual-abc',
        artistName: 'the weeknd',
        eventDate: '2026-06-15',
        overallRating: 9,
      }),
    ];
    const entries = getYearEntries(concerts, reviews, 2026);
    expect(entries).toHaveLength(1);
    expect(entries[0].review?.overallRating).toBe(9);
  });
});

describe('getYearsWithEntries', () => {
  it('unions attended and review years', () => {
    const concerts = [
      uc({
        id: '1',
        concertId: 'e1',
        status: 'attended',
        concertSnapshot: { artistName: 'A', date: '2026-02-01' },
      }),
    ];
    const reviews = [
      review({ id: 'r1', eventId: 'x', artistName: 'B', eventDate: '2024-01-01' }),
    ];
    expect(getYearsWithEntries(concerts, reviews)).toEqual([2026, 2024]);
  });
});

describe('getYearEndStats', () => {
  it('returns zeros for empty entries', () => {
    const stats = getYearEndStats([], 2026);
    expect(stats.totalShows).toBe(0);
    expect(stats.totalConcerts).toBe(0);
    expect(stats.uniqueArtists).toBe(0);
    expect(stats.topArtists).toEqual([]);
    expect(stats.averageRating).toBeUndefined();
  });

  it('aggregates one show without rankings noise', () => {
    const entries = getYearEntries(
      [
        uc({
          id: '1',
          concertId: 'e1',
          status: 'attended',
          concertSnapshot: {
            artistName: 'Solo',
            venueName: 'Hall',
            city: 'Toronto',
            date: '2026-05-10',
          },
        }),
      ],
      [],
      2026
    );
    const stats = getYearEndStats(entries, 2026);
    expect(stats.totalShows).toBe(1);
    expect(stats.uniqueArtists).toBe(1);
    expect(stats.uniqueVenues).toBe(1);
    expect(stats.uniqueCities).toBe(1);
    expect(stats.firstShow?.artistName).toBe('Solo');
    expect(stats.lastShow?.artistName).toBe('Solo');
    expect(stats.mostSeenArtist?.name).toBe('Solo');
    expect(stats.busiestMonth?.label).toBe('May');
  });

  it('ignores unrated (0) overallRating in average', () => {
    const entries = getYearEntries(
      [
        uc({
          id: '1',
          concertId: 'e1',
          status: 'attended',
          concertSnapshot: { artistName: 'A', date: '2026-03-01' },
        }),
        uc({
          id: '2',
          concertId: 'e2',
          status: 'attended',
          concertSnapshot: { artistName: 'B', date: '2026-04-01' },
        }),
      ],
      [
        review({
          id: 'r1',
          eventId: 'e1',
          artistName: 'A',
          eventDate: '2026-03-01',
          overallRating: 0,
        }),
        review({
          id: 'r2',
          eventId: 'e2',
          artistName: 'B',
          eventDate: '2026-04-01',
          overallRating: 8,
        }),
      ],
      2026
    );
    const stats = getYearEndStats(entries, 2026);
    expect(stats.totalShows).toBe(2);
    expect(stats.averageRating).toBe(8);
  });

  it('counts three attended shows with no reviews', () => {
    const concerts = [1, 2, 3].map((n) =>
      uc({
        id: String(n),
        concertId: `e${n}`,
        status: 'attended',
        concertSnapshot: { artistName: `Artist ${n}`, date: `2026-0${n}-15` },
      })
    );
    const stats = getYearEndStats(getYearEntries(concerts, [], 2026), 2026);
    expect(stats.totalShows).toBe(3);
    expect(stats.photos).toEqual([]);
  });

  it('groups Drake and drake as one top artist', () => {
    const entries = getYearEntries(
      [
        uc({
          id: '1',
          concertId: 'e1',
          status: 'attended',
          concertSnapshot: { artistName: 'Drake', date: '2026-01-10' },
        }),
        uc({
          id: '2',
          concertId: 'e2',
          status: 'attended',
          concertSnapshot: { artistName: 'drake', date: '2026-03-10' },
        }),
        uc({
          id: '3',
          concertId: 'e3',
          status: 'attended',
          concertSnapshot: { artistName: 'Drake', date: '2026-05-10' },
        }),
      ],
      [],
      2026
    );
    const stats = getYearEndStats(entries, 2026);
    expect(stats.uniqueArtists).toBe(1);
    expect(stats.topArtists).toEqual([{ name: 'Drake', count: 3 }]);
    expect(stats.mostSeenArtist).toEqual({ name: 'Drake', count: 3 });
  });
});
