import { describe, expect, it } from 'vitest';

import {
  getAttendeeKey,
  getFeaturedAttendees,
  getPersonKey,
  getPersonProfile,
  getSearchSuggestions,
  getUniqueTopics,
  includesSearchValue,
  normalizeSearchValue,
  searchPeople,
} from '@/lib/search-utils';
import type { EventAttendee, EventItem } from '@/lib/types';

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
    accent: '#fff',
    ...overrides,
  };
}

const alice: EventAttendee = { name: 'Alice', role: 'Host', userId: 'u-alice', isHost: true };
const bob: EventAttendee = { name: 'Bob', role: 'Guest' };

describe('search value helpers', () => {
  it('normalizes by trimming and lowercasing', () => {
    expect(normalizeSearchValue('  HeLLo ')).toBe('hello');
  });

  it('matches everything on an empty query', () => {
    expect(includesSearchValue(['a'], '')).toBe(true);
  });

  it('matches across joined values, case-insensitively', () => {
    expect(includesSearchValue(['Sunset', 'Yoga'], 'yoga')).toBe(true);
    expect(includesSearchValue(['Sunset', 'Yoga'], 'jazz')).toBe(false);
  });

  it('dedupes topics case-insensitively and drops blanks', () => {
    expect(getUniqueTopics([' Music ', 'music', '', '  ', 'Art', 'ART'])).toEqual(['Music', 'Art']);
  });
});

describe('person keys', () => {
  it('prefers the user id', () => {
    expect(getPersonKey(alice)).toBe('u-alice');
  });

  it('falls back to a normalized name', () => {
    expect(getPersonKey({ name: '  Bob Smith ' })).toBe('bob smith');
  });

  it('builds attendee keys from id or name/role/index', () => {
    expect(getAttendeeKey(alice, 0)).toBe('u-alice');
    expect(getAttendeeKey(bob, 3)).toBe('Bob-Guest-3');
  });
});

describe('getSearchSuggestions', () => {
  const popular = makeEvent({ id: 'pop', title: 'Big party', going: 50, attendees: [alice] });
  const quiet = makeEvent({ id: 'quiet', title: 'Book club', going: 3, attendees: [bob] });

  it('returns users before events, events ordered by popularity', () => {
    const results = getSearchSuggestions([quiet, popular], '');

    expect(results.map((r) => r.type)).toEqual(['user', 'user', 'event', 'event']);
    const events = results.filter((r) => r.type === 'event');
    expect(events.map((r) => r.event.id)).toEqual(['pop', 'quiet']);
  });

  it('filters events by query, including tags', () => {
    const tagged = makeEvent({ id: 't', title: 'Other', tags: ['Jazz'] });
    const results = getSearchSuggestions([popular, tagged], 'jazz');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: 'event', event: { id: 't' } });
  });

  it('caps events at 4 and users at 4', () => {
    const events = Array.from({ length: 6 }, (_, i) =>
      makeEvent({
        id: `e${i}`,
        going: i,
        attendees: [{ name: `Person ${i}`, role: 'Guest', userId: `u${i}` }],
      }),
    );
    const results = getSearchSuggestions(events, '');

    expect(results.filter((r) => r.type === 'user')).toHaveLength(4);
    expect(results.filter((r) => r.type === 'event')).toHaveLength(4);
  });

  it('dedupes the same person across events and skips blank names', () => {
    const other = makeEvent({ id: 'o', attendees: [alice, { name: '  ', role: 'Guest' }] });
    const users = getSearchSuggestions([popular, other], '').filter((r) => r.type === 'user');

    expect(users).toHaveLength(1);
  });
});

describe('getFeaturedAttendees', () => {
  it('dedupes people, skips blanks and respects the limit', () => {
    const events = [
      makeEvent({ id: 'a', going: 9, attendees: [alice, bob, { name: '', role: '' }] }),
      makeEvent({ id: 'b', going: 1, attendees: [alice, { name: 'Cy', role: 'Guest' }] }),
    ];

    expect(getFeaturedAttendees(events).map((f) => f.name)).toEqual(['Alice', 'Bob', 'Cy']);
    expect(getFeaturedAttendees(events, 2)).toHaveLength(2);
  });

  it('records the event the person was first seen in (most popular first)', () => {
    const events = [
      makeEvent({ id: 'small', going: 1, attendees: [alice] }),
      makeEvent({ id: 'big', going: 9, attendees: [alice] }),
    ];

    expect(getFeaturedAttendees(events)[0].eventId).toBe('big');
  });
});

describe('searchPeople', () => {
  const events = [
    makeEvent({ id: 'a', title: 'Yoga', attendees: [alice, bob] }),
    makeEvent({ id: 'b', title: 'Chess', attendees: [alice] }),
  ];

  it('matches by name and dedupes', () => {
    const results = searchPeople(events, 'ali');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ name: 'Alice', userId: 'u-alice', key: 'u-alice' });
  });

  it('matches by event title, and gives null userId for anonymous attendees', () => {
    const results = searchPeople(events, 'yoga');

    expect(results.map((r) => r.name)).toEqual(['Alice', 'Bob']);
    expect(results[1].userId).toBeNull();
  });

  it('honours the limit', () => {
    expect(searchPeople(events, '', 1)).toHaveLength(1);
  });
});

describe('getPersonProfile', () => {
  it('aggregates roles and hosted/attending events', () => {
    const events = [
      makeEvent({ id: 'a', attendees: [alice] }),
      makeEvent({ id: 'b', attendees: [{ ...alice, isHost: false, role: 'Guest' }] }),
    ];
    const profile = getPersonProfile(events, 'u-alice');

    expect(profile).toMatchObject({ name: 'Alice', userId: 'u-alice', roles: ['Host', 'Guest'] });
    expect(profile?.hostedEvents.map((e) => e.id)).toEqual(['a']);
    expect(profile?.attendingEvents.map((e) => e.id)).toEqual(['b']);
  });

  it('finds name-keyed people and returns null for unknown keys', () => {
    const events = [makeEvent({ attendees: [bob] })];

    expect(getPersonProfile(events, 'bob')).toMatchObject({ name: 'Bob', userId: null });
    expect(getPersonProfile(events, 'nobody')).toBeNull();
  });
});
