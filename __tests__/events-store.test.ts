import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EventItem } from '@/lib/types';

vi.mock('@/lib/storage', async () => (await import('./helpers/session-mock')).storageMock);
vi.mock('@/lib/api', () => ({ fetchEvents: vi.fn(), toggleEventInterest: vi.fn() }));

import * as api from '@/lib/api';
import { DISTANCE_FILTER_MAX_KM, GROUP_SIZE_FILTER_MAX, PRICE_FILTER_MAX_CAD } from '@/lib/filter-utils';
import {
  selectVisibleCategoryCounts,
  selectVisibleEvents,
  selectVisibleMapEvents,
  useEventsStore,
} from '@/stores/events-store';

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'e1',
    kind: 'event',
    title: 'Sunset yoga',
    description: '',
    venue: 'Trinity Bellwoods',
    neighborhood: 'Queen West',
    category: 'social',
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

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const state = () => useEventsStore.getState();

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  useEventsStore.setState({ events: [], interestById: {}, isLoading: false, hasLoaded: false, loadError: null });
  state().resetFilters();
});

describe('loadEvents', () => {
  it('stores fetched events', async () => {
    vi.mocked(api.fetchEvents).mockResolvedValue([makeEvent()]);
    await state().loadEvents();

    expect(state()).toMatchObject({ hasLoaded: true, isLoading: false, loadError: null });
    expect(state().events).toHaveLength(1);
  });

  it('records an error when the fetch fails', async () => {
    vi.mocked(api.fetchEvents).mockRejectedValue(new Error('x'));
    await state().loadEvents();

    expect(state().loadError).toMatch(/unavailable/);
    expect(state().hasLoaded).toBe(true);
  });

  it('ignores overlapping loads', async () => {
    useEventsStore.setState({ isLoading: true });
    await state().loadEvents();

    expect(api.fetchEvents).not.toHaveBeenCalled();
  });
});

describe('filters', () => {
  it('starts with no active filters', () => {
    expect(state().hasActiveFilters()).toBe(false);
  });

  it.each([
    ['category', () => state().setActiveCategory('social')],
    ['scope', () => state().setActivityScope('groups')],
    ['day', () => state().setSelectedDayKey('2026-01-01')],
    ['distance', () => state().setMaxDistanceKm(DISTANCE_FILTER_MAX_KM - 1)],
    ['price', () => state().setMaxPriceCad(PRICE_FILTER_MAX_CAD - 1)],
    ['group size', () => state().setMaxGroupSize(GROUP_SIZE_FILTER_MAX - 1)],
    ['happening now', () => state().toggleHappeningNowOnly()],
  ])('flags an active %s filter and resets cleanly', (_name, apply) => {
    apply();
    expect(state().hasActiveFilters()).toBe(true);

    state().resetFilters();
    expect(state().hasActiveFilters()).toBe(false);
  });

  it('setQuery does not count as an active filter but resetFilters clears it', () => {
    state().setQuery('yoga');
    expect(state().hasActiveFilters()).toBe(false);

    state().resetFilters();
    expect(state().query).toBe('');
  });
});

describe('selectors', () => {
  const yoga = makeEvent({ id: 'yoga', category: 'social', going: 5 });
  const gig = makeEvent({ id: 'gig', category: 'music-nightlife', kind: 'group', going: 30, price: '$50', capacity: 200 });
  const talk = makeEvent({ id: 'talk', category: 'music-nightlife', going: 1 });

  beforeEach(() => useEventsStore.setState({ events: [yoga, gig, talk] }));

  it('sorts by popularity in the popular scope', () => {
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual(['gig', 'yoga', 'talk']);
  });

  it('filters by category and scope', () => {
    state().setActiveCategory('music-nightlife');
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual(['gig', 'talk']);

    state().setActivityScope('groups');
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual(['gig']);

    state().setActivityScope('events');
    expect(selectVisibleEvents(state()).map((e) => e.id)).toEqual(['talk']);
  });

  it('filters by price and group size', () => {
    state().setMaxPriceCad(10);
    expect(selectVisibleEvents(state()).map((e) => e.id)).not.toContain('gig');

    state().resetFilters();
    state().setMaxGroupSize(50);
    expect(selectVisibleEvents(state()).map((e) => e.id)).not.toContain('gig');
  });

  it('map selector ignores the category chip', () => {
    state().setActiveCategory('social');

    expect(selectVisibleEvents(state())).toHaveLength(1);
    expect(selectVisibleMapEvents(state())).toHaveLength(3);
  });

  it('counts categories, optionally limited to on-screen ids', () => {
    expect(selectVisibleCategoryCounts(state())).toEqual({ social: 1, 'music-nightlife': 2 });
    expect(selectVisibleCategoryCounts(state(), new Set(['gig']))).toEqual({ 'music-nightlife': 1 });
  });
});

describe('addEvent', () => {
  it('prepends the event', () => {
    useEventsStore.setState({ events: [makeEvent({ id: 'old' })] });
    state().addEvent(makeEvent({ id: 'new' }));

    expect(state().events.map((e) => e.id)).toEqual(['new', 'old']);
  });
});

describe('toggleInterest', () => {
  const event = makeEvent({ id: 'e1', going: 10 });

  it('applies an optimistic update then the server view', async () => {
    vi.mocked(api.toggleEventInterest).mockResolvedValue({ going: 12, isInterested: true });
    state().toggleInterest(event);

    expect(state().interestById.e1).toMatchObject({ going: 11, isInterested: true, isPending: true });

    await flush();
    expect(state().interestById.e1).toEqual({ going: 12, isInterested: true, isPending: false });
  });

  it('rolls back when the request fails', async () => {
    vi.mocked(api.toggleEventInterest).mockRejectedValue(new Error('x'));
    state().toggleInterest(event);
    await flush();

    expect(state().interestById.e1).toMatchObject({ going: 10, isInterested: false, isPending: false });
  });

  it('ignores taps while a request is pending', () => {
    vi.mocked(api.toggleEventInterest).mockReturnValue(new Promise(() => {}));
    state().toggleInterest(event);
    state().toggleInterest(event);

    expect(api.toggleEventInterest).toHaveBeenCalledTimes(1);
  });

  it('clearInterests wipes state', () => {
    useEventsStore.setState({ interestById: { e1: { going: 1, isInterested: true, isPending: false } } });
    state().clearInterests();

    expect(state().interestById).toEqual({});
  });
});
