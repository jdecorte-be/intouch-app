import { describe, expect, it } from 'vitest';

import {
  formatDistanceFilterLabel,
  formatGroupSizeFilterLabel,
  formatPriceFilterLabel,
  getDistanceKm,
  getEventPriceValueCad,
  isFreeEventPrice,
} from '@/lib/filter-utils';

describe('isFreeEventPrice', () => {
  it.each(['', '  ', 'Free', 'free admission', 'FREE'])('treats %j as free', (price) => {
    expect(isFreeEventPrice(price)).toBe(true);
  });

  it.each(['$10', 'CA$5', 'Free drinks with ticket'])('treats %j as paid', (price) => {
    expect(isFreeEventPrice(price)).toBe(false);
  });
});

describe('getEventPriceValueCad', () => {
  it('returns 0 for free events', () => {
    expect(getEventPriceValueCad('Free')).toBe(0);
  });

  it('uses the lowest amount in a range', () => {
    expect(getEventPriceValueCad('$15 - $40')).toBe(15);
  });

  it('understands decimals', () => {
    expect(getEventPriceValueCad('CA$12.50')).toBe(12.5);
  });

  it('returns 0 when there is no number', () => {
    expect(getEventPriceValueCad('Pay what you can')).toBe(0);
  });
});

describe('getDistanceKm', () => {
  it('is zero for identical points', () => {
    expect(getDistanceKm([-79.38, 43.65], [-79.38, 43.65])).toBeCloseTo(0);
  });

  it('matches a known distance (Toronto to Ottawa is about 350 km)', () => {
    const distance = getDistanceKm([-79.3832, 43.6532], [-75.6972, 45.4215]);

    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(360);
  });

  it('is symmetric', () => {
    const a: [number, number] = [-79.4, 43.6];
    const b: [number, number] = [-79.3, 43.7];

    expect(getDistanceKm(a, b)).toBeCloseTo(getDistanceKm(b, a));
  });
});

describe('filter labels', () => {
  it('uses the slider maximum as "no filter"', () => {
    expect(formatPriceFilterLabel(200)).toBe('Any price');
    expect(formatDistanceFilterLabel(25)).toBe('Any distance');
    expect(formatGroupSizeFilterLabel(300)).toBe('Any size');
  });

  it('describes active filters', () => {
    expect(formatPriceFilterLabel(0)).toBe('Free');
    expect(formatPriceFilterLabel(50)).toBe('Up to CA$50');
    expect(formatDistanceFilterLabel(5)).toBe('Within 5 km');
    expect(formatGroupSizeFilterLabel(40)).toBe('Up to 40 people');
  });
});
