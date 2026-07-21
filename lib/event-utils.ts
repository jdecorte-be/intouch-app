import { categories } from './event-data';
import type { ActivityScope, EventCategory, EventInterestState, EventItem } from './types';

export const activityScopeLabels: Record<ActivityScope, string> = {
  popular: 'Trendy',
  groups: 'Groups',
  events: 'Events',
};

export const activityScopes = ['popular', 'groups', 'events'] as const;

export const defaultTimeGreeting = 'Find something local today';

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning!';
  }

  if (hour < 18) {
    return 'Good afternoon!';
  }

  return 'Good evening!';
}

export function getPopularityScore(event: EventItem) {
  const fillRate = event.capacity > 0 ? event.going / event.capacity : 0;

  return event.going * 100 + fillRate;
}

export function sortByPopularity(firstEvent: EventItem, secondEvent: EventItem) {
  return getPopularityScore(secondEvent) - getPopularityScore(firstEvent);
}

export function getActivityScopeHeading(scope: ActivityScope) {
  if (scope === 'popular') {
    return 'Popular events & groups';
  }

  return activityScopeLabels[scope];
}

export function getActivityKindLabel(event: Pick<EventItem, 'kind'>) {
  return event.kind === 'group' ? 'Group' : 'Event';
}

export function getItemNoun(event: Pick<EventItem, 'kind'>) {
  return event.kind === 'group' ? 'group' : 'event';
}

export function getEventInterestState(
  event: EventItem,
  state?: EventInterestState,
): EventInterestState {
  return {
    going: state?.going ?? event.going,
    isInterested: state?.isInterested ?? false,
    isPending: state?.isPending ?? false,
  };
}

export function getEventHostAttendees(event: EventItem) {
  return event.attendees.filter((attendee) => attendee.isHost);
}

export function splitStartsAt(startsAt: string): [string, string | null] {
  const separatorIndex = startsAt.indexOf(', ');

  if (separatorIndex === -1) {
    return [startsAt, null];
  }

  return [startsAt.slice(0, separatorIndex), startsAt.slice(separatorIndex + 2)];
}

export function getCategoryLabel(categoryId: EventCategory) {
  return categories.find((category) => category.id === categoryId)?.label ?? 'Featured';
}

export function getCategoryControlLabel(categoryId: EventCategory) {
  return categoryId === 'featured' ? 'All categories' : getCategoryLabel(categoryId);
}

export function getMobileCategoryControlLabel(categoryId: EventCategory) {
  return categoryId === 'featured' ? 'All' : getCategoryLabel(categoryId);
}

export function isHappeningNow(event: EventItem) {
  return /today|tonight/i.test(event.startsAt);
}

export function eventMatchesSelectedDay(event: EventItem, selectedDayKey: string | null) {
  if (!selectedDayKey) {
    return true;
  }

  return event.startsAtKey === selectedDayKey;
}

