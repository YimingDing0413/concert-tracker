import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lastWeekendISO, localDateISO, statusFromDate } from './logConcert';

describe('logConcert dates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('localDateISO uses local calendar parts after 8pm (Toronto evening case)', () => {
    // 20:30 local on Nov 2 — UTC YYYY-MM-DD can already be the next day in Americas
    const evening = new Date(2026, 10, 2, 20, 30, 0);
    vi.setSystemTime(evening);
    expect(localDateISO()).toBe('2026-11-02');
    expect(localDateISO(-1)).toBe('2026-11-01');
    expect(localDateISO(0, evening)).toBe('2026-11-02');
    // Avoid the classic UTC pitfall: toISOString day may differ from local calendar day
    const utcPitfall = evening.toISOString().slice(0, 10);
    if (utcPitfall !== '2026-11-02') {
      expect(localDateISO()).not.toBe(utcPitfall);
    }
  });

  it('statusFromDate: past → attended, today/future → going', () => {
    vi.setSystemTime(new Date(2026, 10, 2, 20, 30, 0));
    expect(statusFromDate('2026-11-01')).toBe('attended');
    expect(statusFromDate('2026-11-02')).toBe('going');
    expect(statusFromDate('2026-11-03')).toBe('going');
    expect(statusFromDate('2026-11-01T23:00:00.000Z')).toBe('attended');
  });

  it('lastWeekendISO returns most recent Saturday (today if Saturday)', () => {
    vi.setSystemTime(new Date(2026, 10, 7, 12, 0, 0)); // Sat Nov 7
    expect(lastWeekendISO()).toBe('2026-11-07');

    vi.setSystemTime(new Date(2026, 10, 8, 21, 0, 0)); // Sun Nov 8 evening
    expect(lastWeekendISO()).toBe('2026-11-07');

    vi.setSystemTime(new Date(2026, 10, 9, 9, 0, 0)); // Mon Nov 9
    expect(lastWeekendISO()).toBe('2026-11-07');

    vi.setSystemTime(new Date(2026, 10, 6, 18, 0, 0)); // Fri Nov 6
    expect(lastWeekendISO()).toBe('2026-10-31');
  });
});
