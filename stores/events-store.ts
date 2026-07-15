import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import {
  eventMatchesSelectedDay,
  getEventInterestState,
  isHappeningNow,
  sortByPopularity,
} from '@/lib/event-utils';
import {
  DISTANCE_FILTER_MAX_KM,
  GROUP_SIZE_FILTER_MAX,
  PRICE_FILTER_MAX_CAD,
  getDistanceKm,
  getEventPriceValueCad,
  mapCenterCoordinates,
} from '@/lib/filter-utils';
import { mockEvents } from '@/lib/mock-data';
import { zustandStorage } from '@/lib/storage';
import type { ActivityScope, EventCategory, EventInterestState, EventItem } from '@/lib/types';

type EventsState = {
  events: EventItem[];
  isLoading: boolean;
  hasLoaded: boolean;
  loadError: string | null;
  isUsingFallbackEvents: boolean;
  interestById: Record<string, EventInterestState>;

  activityScope: ActivityScope;
  activeCategory: EventCategory;
  selectedDayKey: string | null;
  maxDistanceKm: number;
  maxPriceCad: number;
  maxGroupSize: number;
  happeningNowOnly: boolean;
  query: string;

  loadEvents: () => Promise<void>;
  setActivityScope: (scope: ActivityScope) => void;
  setActiveCategory: (category: EventCategory) => void;
  setSelectedDayKey: (dayKey: string | null) => void;
  setMaxDistanceKm: (value: number) => void;
  setMaxPriceCad: (value: number) => void;
  setMaxGroupSize: (value: number) => void;
  toggleHappeningNowOnly: () => void;
  setQuery: (query: string) => void;
  resetFilters: () => void;
  hasActiveFilters: () => boolean;
  toggleInterest: (event: EventItem) => void;
  addEvent: (event: EventItem) => void;
};

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],
      isLoading: false,
      hasLoaded: false,
      loadError: null,
      isUsingFallbackEvents: false,
      interestById: {},

      activityScope: 'popular',
      activeCategory: 'featured',
      selectedDayKey: null,
      maxDistanceKm: DISTANCE_FILTER_MAX_KM,
      maxPriceCad: PRICE_FILTER_MAX_CAD,
      maxGroupSize: GROUP_SIZE_FILTER_MAX,
      happeningNowOnly: false,
      query: '',

      loadEvents: async () => {
        if (get().isLoading) {
          return;
        }

        set({ isLoading: true });

        try {
          const events = await api.fetchEvents();
          set({
            events,
            isLoading: false,
            hasLoaded: true,
            loadError: null,
            isUsingFallbackEvents: false,
          });
        } catch {
          const hasExistingEvents = get().events.length > 0;

          set({
            events: hasExistingEvents ? get().events : mockEvents,
            isLoading: false,
            hasLoaded: true,
            loadError: 'Live events are unavailable right now.',
            isUsingFallbackEvents: !hasExistingEvents,
          });
        }
      },

      setActivityScope: (activityScope) => set({ activityScope }),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      setSelectedDayKey: (selectedDayKey) => set({ selectedDayKey }),
      setMaxDistanceKm: (maxDistanceKm) => set({ maxDistanceKm }),
      setMaxPriceCad: (maxPriceCad) => set({ maxPriceCad }),
      setMaxGroupSize: (maxGroupSize) => set({ maxGroupSize }),
      toggleHappeningNowOnly: () =>
        set((state) => ({ happeningNowOnly: !state.happeningNowOnly })),
      setQuery: (query) => set({ query }),

      resetFilters: () =>
        set({
          activityScope: 'popular',
          activeCategory: 'featured',
          selectedDayKey: null,
          maxDistanceKm: DISTANCE_FILTER_MAX_KM,
          maxPriceCad: PRICE_FILTER_MAX_CAD,
          maxGroupSize: GROUP_SIZE_FILTER_MAX,
          happeningNowOnly: false,
          query: '',
        }),

      hasActiveFilters: () => {
        const state = get();

        return (
          state.activeCategory !== 'featured' ||
          state.activityScope !== 'popular' ||
          state.selectedDayKey !== null ||
          state.maxDistanceKm < DISTANCE_FILTER_MAX_KM ||
          state.maxPriceCad < PRICE_FILTER_MAX_CAD ||
          state.maxGroupSize < GROUP_SIZE_FILTER_MAX ||
          state.happeningNowOnly
        );
      },

      addEvent: (event) => set((state) => ({ events: [event, ...state.events] })),

      toggleInterest: (event) => {
        const previous = getEventInterestState(event, get().interestById[event.id]);

        if (previous.isPending) {
          return;
        }

        const optimistic: EventInterestState = {
          going: Math.max(0, previous.going + (previous.isInterested ? -1 : 1)),
          isInterested: !previous.isInterested,
          isPending: true,
        };

        set((state) => ({ interestById: { ...state.interestById, [event.id]: optimistic } }));

        api
          .toggleEventInterest(event.id, {
            going: optimistic.going,
            isInterested: optimistic.isInterested,
          })
          .then((view) =>
            set((state) => ({
              interestById: {
                ...state.interestById,
                [event.id]: { ...view, isPending: false },
              },
            })),
          )
          .catch(() =>
            set((state) => ({
              interestById: {
                ...state.interestById,
                [event.id]: { ...previous, isPending: false },
              },
            })),
          );
      },
    }),
    {
      name: 'retalk-events',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ interestById: state.interestById }),
    },
  ),
);

export function selectVisibleEvents(state: EventsState): EventItem[] {
  const scopedEvents = state.events.filter((event) => {
    const matchesScope =
      state.activityScope === 'popular'
        ? true
        : state.activityScope === 'groups'
          ? event.kind === 'group'
          : event.kind === 'event';
    const matchesCategory =
      state.activeCategory === 'featured' || event.category === state.activeCategory;
    const matchesDay = eventMatchesSelectedDay(event, state.selectedDayKey);
    const matchesDistance =
      state.maxDistanceKm >= DISTANCE_FILTER_MAX_KM ||
      getDistanceKm(mapCenterCoordinates, event.coordinates) <= state.maxDistanceKm;
    const matchesPrice =
      state.maxPriceCad >= PRICE_FILTER_MAX_CAD ||
      getEventPriceValueCad(event.price) <= state.maxPriceCad;
    const matchesGroupSize =
      state.maxGroupSize >= GROUP_SIZE_FILTER_MAX || event.capacity <= state.maxGroupSize;
    const matchesHappeningNow = !state.happeningNowOnly || isHappeningNow(event);

    return (
      matchesScope &&
      matchesCategory &&
      matchesDay &&
      matchesDistance &&
      matchesPrice &&
      matchesGroupSize &&
      matchesHappeningNow
    );
  });

  if (state.activityScope === 'popular') {
    return [...scopedEvents].sort(sortByPopularity);
  }

  return scopedEvents;
}
