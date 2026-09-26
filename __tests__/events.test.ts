import { describe, expect, it } from 'vitest';

import {
  categories,
  categoryAccents,
  categoryAccentsLight,
  eventImageUrl,
  formatCanadianPrice,
  hostableCategories,
} from '@/lib/event-data';
import {
  eventMatchesSelectedDay,
  getCategoryControlLabel,
  getEventInterestState,
  getPopularityScore,
  isHappeningNow,
  sortByPopularity,
  splitStartsAt,
} from '@/lib/event-utils';
import { hasCompletedOnboarding } from '@/lib/onboarding';
import type { EventItem, HostableCategory } from '@/lib/types';

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'e1',
    kind: 'event',
    title: 'Sunset yoga',
    description: '',
    venue: 'Trinity Bellwoods',
    neighborhood: 'Queen West',
    category: 'wellness',
    icon: 'sparkles',
    startsAt: 'Tonight, 7:00 PM',
    price: 'Free',
    going: 10,
    capacity: 20,
    hosts: [],
    attendees: [],
    tags: [],
    coordinates: [-79.41, 43.65],
    accent: '#86efac',
    ...overrides,
  };
}

describe('category tables', () => {
  const hostable = hostableCategories.map((category) => category.id) as HostableCategory[];

  it('excludes "featured" from the hostable list', () => {
    expect(hostable).not.toContain('featured');
    expect(hostable).toHaveLength(categories.length - 1);
  });

  it('has an accent and a lighter accent for every hostable category', () => {
    for (const id of hostable) {
      expect(categoryAccents[id], id).toMatch(/^#[0-9a-f]{6}$/i);
      expect(categoryAccentsLight[id], id).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('resolves a cover image for every hostable category', () => {
    for (const id of hostable) {
      expect(eventImageUrl({ id: 'abc', category: id, bannerUrl: null }), id).toMatch(/^https:\/\//);
    }
  });
});

describe('eventImageUrl', () => {
  it('prefers the uploaded banner', () => {
    expect(eventImageUrl({ id: '1', category: 'games', bannerUrl: 'https://cdn/x.jpg' })).toBe('https://cdn/x.jpg');
  });

  it('is stable for the same event id', () => {
    const first = eventImageUrl({ id: 'same', category: 'games' });

    expect(eventImageUrl({ id: 'same', category: 'games' })).toBe(first);
  });
});

describe('formatCanadianPrice', () => {
  it.each([
    ['', 'Free'],
    ['Free', 'Free'],
    ['$20', 'CA$20'],
    ['CA$20', 'CA$20'],
    ['15 per person', 'CA$15 per person'],
    ['Pay what you can', 'Pay what you can'],
  ])('formats %j as %j', (input, expected) => {
    expect(formatCanadianPrice(input)).toBe(expected);
  });
});

describe('popularity', () => {
  it('ranks by attendance first, then fill rate', () => {
    const busy = makeEvent({ going: 50, capacity: 200 });
    const small = makeEvent({ going: 5, capacity: 5 });

    expect(getPopularityScore(busy)).toBeGreaterThan(getPopularityScore(small));
    expect([small, busy].sort(sortByPopularity)[0]).toBe(busy);
  });

  it('does not divide by zero capacity', () => {
    expect(getPopularityScore(makeEvent({ going: 3, capacity: 0 }))).toBe(300);
  });
});

describe('event helpers', () => {
  it('splits "Day, time" strings', () => {
    expect(splitStartsAt('Sat, 7:00 PM')).toEqual(['Sat', '7:00 PM']);
    expect(splitStartsAt('Sat')).toEqual(['Sat', null]);
  });

  it('detects events happening today or tonight', () => {
    expect(isHappeningNow(makeEvent({ startsAt: 'Tonight, 8 PM' }))).toBe(true);
    expect(isHappeningNow(makeEvent({ startsAt: 'Sat, 8 PM' }))).toBe(false);
  });

  it('matches everything when no day is selected', () => {
    expect(eventMatchesSelectedDay(makeEvent(), null)).toBe(true);
    expect(eventMatchesSelectedDay(makeEvent({ startsAtKey: '2026-09-24' }), '2026-09-25')).toBe(false);
  });

  it('falls back to event counts when there is no local interest state', () => {
    expect(getEventInterestState(makeEvent({ going: 7 }))).toEqual({ going: 7, isInterested: false, isPending: false });
  });

  it('labels the featured category as "All categories"', () => {
    expect(getCategoryControlLabel('featured')).toBe('All categories');
    expect(getCategoryControlLabel('games')).toBe('Games');
  });
});

describe('hasCompletedOnboarding', () => {
  it('is false without a user', () => {
    expect(hasCompletedOnboarding(null, ['u1'])).toBe(false);
  });

  it('accepts a server timestamp or the local fallback list', () => {
    expect(hasCompletedOnboarding({ id: 'u1', onboardingCompletedAt: '2026-09-01' }, [])).toBe(true);
    expect(hasCompletedOnboarding({ id: 'u1', onboardingCompletedAt: null }, ['u1'])).toBe(true);
    expect(hasCompletedOnboarding({ id: 'u1', onboardingCompletedAt: null }, ['u2'])).toBe(false);
  });
});
