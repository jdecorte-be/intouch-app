import { describe, expect, it } from 'vitest';

import {
  addCalendarDays,
  formatDayLabel,
  getCalendarMonthGrid,
  parseLocalDateKey,
  startOfCalendarWeek,
  toLocalDateKey,
} from '@/lib/date-utils';

describe('date keys', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('round-trips through parseLocalDateKey', () => {
    const date = new Date(2026, 10, 23);

    expect(toLocalDateKey(parseLocalDateKey(toLocalDateKey(date))!)).toBe('2026-11-23');
  });

  it('returns null for malformed keys', () => {
    expect(parseLocalDateKey('')).toBeNull();
    expect(parseLocalDateKey('not-a-date')).toBeNull();
  });
});

describe('calendar helpers', () => {
  it('adds days across a month boundary without mutating the input', () => {
    const start = new Date(2026, 0, 31);
    const next = addCalendarDays(start, 1);

    expect(toLocalDateKey(next)).toBe('2026-02-01');
    expect(toLocalDateKey(start)).toBe('2026-01-31');
  });

  it('starts weeks on Sunday', () => {
    // 2026-09-24 is a Thursday
    expect(toLocalDateKey(startOfCalendarWeek(new Date(2026, 8, 24)))).toBe('2026-09-20');
  });

  it('builds a 6-week month grid that contains the whole month', () => {
    const grid = getCalendarMonthGrid(new Date(2026, 1, 10));
    const keys = grid.map(toLocalDateKey);

    expect(grid).toHaveLength(42);
    expect(grid[0].getDay()).toBe(0);
    expect(keys).toContain('2026-02-01');
    expect(keys).toContain('2026-02-28');
  });

  it('labels today and tomorrow specially', () => {
    const date = new Date(2026, 8, 24);

    expect(formatDayLabel(date, 0)).toBe('Today');
    expect(formatDayLabel(date, 1)).toBe('Tomorrow');
    expect(formatDayLabel(date, 2)).toBe('Thu');
  });
});
