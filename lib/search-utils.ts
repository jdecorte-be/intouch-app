import { sortByPopularity } from './event-utils';
import type { EventAttendee, EventItem, SearchSuggestion } from './types';

export function normalizeSearchValue(value: string) {
  return value.trim().toLowerCase();
}

export function includesSearchValue(values: string[], query: string) {
  if (!query) {
    return true;
  }

  return values.join(' ').toLowerCase().includes(query);
}

export function getUniqueTopics(topics: string[]) {
  const seenTopics = new Set<string>();

  return topics.reduce<string[]>((uniqueTopics, topic) => {
    const trimmedTopic = topic.trim();
    const topicKey = trimmedTopic.toLowerCase();

    if (!trimmedTopic || seenTopics.has(topicKey)) {
      return uniqueTopics;
    }

    seenTopics.add(topicKey);

    return [...uniqueTopics, trimmedTopic];
  }, []);
}

export function getAttendeeKey(attendee: EventAttendee, index: number) {
  return attendee.userId ?? `${attendee.name}-${attendee.role}-${index}`;
}

export function getSearchSuggestions(events: EventItem[], query: string): SearchSuggestion[] {
  const normalizedQuery = normalizeSearchValue(query);
  const sortedEvents = [...events].sort(sortByPopularity);
  const eventSuggestions = sortedEvents
    .filter((event) =>
      includesSearchValue(
        [
          event.title,
          event.venue,
          event.neighborhood,
          event.category,
          event.kind,
          event.startsAt,
          ...event.tags,
        ],
        normalizedQuery,
      ),
    )
    .slice(0, 4)
    .map((event): SearchSuggestion => ({ type: 'event', event }));

  const seenUsers = new Set<string>();
  const userSuggestions: SearchSuggestion[] = [];

  for (const event of sortedEvents) {
    for (const attendee of event.attendees) {
      const name = attendee.name.trim();

      if (!name) {
        continue;
      }

      const key = attendee.userId ?? `${name.toLowerCase()}-${event.id}`;

      if (seenUsers.has(key)) {
        continue;
      }

      if (
        !includesSearchValue(
          [name, attendee.role, event.title, event.venue, event.neighborhood],
          normalizedQuery,
        )
      ) {
        continue;
      }

      seenUsers.add(key);
      userSuggestions.push({
        type: 'user',
        id: key,
        name,
        role: attendee.role,
        image: attendee.image,
        event,
        attendee,
      });

      if (userSuggestions.length >= 4) {
        break;
      }
    }

    if (userSuggestions.length >= 4) {
      break;
    }
  }

  return [...userSuggestions, ...eventSuggestions];
}

export type FeaturedAttendee = {
  key: string;
  name: string;
  image?: string | null;
  eventId: string;
};

export function getFeaturedAttendees(events: EventItem[], limit = 10): FeaturedAttendee[] {
  const sortedEvents = [...events].sort(sortByPopularity);
  const seenAttendees = new Set<string>();
  const featured: FeaturedAttendee[] = [];

  for (const event of sortedEvents) {
    for (const attendee of event.attendees) {
      const name = attendee.name.trim();

      if (!name) {
        continue;
      }

      const key = attendee.userId ?? name.toLowerCase();

      if (seenAttendees.has(key)) {
        continue;
      }

      seenAttendees.add(key);
      featured.push({ key, name, image: attendee.image, eventId: event.id });

      if (featured.length >= limit) {
        return featured;
      }
    }
  }

  return featured;
}
