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

// Identity key for a person across events: their account id when they have
// one, otherwise their name. Used to look up and link to their profile page.
export function getPersonKey(attendee: Pick<EventAttendee, 'userId' | 'name'>) {
  return attendee.userId ?? attendee.name.trim().toLowerCase();
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

      const key = getPersonKey(attendee);

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

      const key = getPersonKey(attendee);

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

export type PersonSearchResult = {
  key: string;
  userId: string | null;
  name: string;
  role: string;
  image?: string | null;
  event: EventItem;
};

// Finds people across all events matching a query, deduped by identity.
// There's no standalone users API, so attendees are the source of truth.
export function searchPeople(
  events: EventItem[],
  query: string,
  limit?: number,
): PersonSearchResult[] {
  const normalizedQuery = normalizeSearchValue(query);
  const seenUsers = new Set<string>();
  const results: PersonSearchResult[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      const name = attendee.name.trim();

      if (!name) {
        continue;
      }

      const key = getPersonKey(attendee);

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
      results.push({
        key,
        userId: attendee.userId ?? null,
        name,
        role: attendee.role,
        image: attendee.image,
        event,
      });

      if (limit && results.length >= limit) {
        return results;
      }
    }
  }

  return results;
}

export type PersonProfile = {
  key: string;
  userId: string | null;
  name: string;
  image: string | null;
  roles: string[];
  hostedEvents: EventItem[];
  attendingEvents: EventItem[];
};

// Aggregates every appearance of a person across events into a single
// profile, since there's no standalone users API to fetch this from.
export function getPersonProfile(events: EventItem[], key: string): PersonProfile | null {
  let name: string | null = null;
  let image: string | null = null;
  let userId: string | null = null;
  const roles = new Set<string>();
  const hostedEvents: EventItem[] = [];
  const attendingEvents: EventItem[] = [];

  for (const event of events) {
    for (const attendee of event.attendees) {
      if (getPersonKey(attendee) !== key) {
        continue;
      }

      name = name ?? attendee.name.trim();
      image = image ?? attendee.image ?? null;
      userId = userId ?? attendee.userId ?? null;

      if (attendee.role.trim()) {
        roles.add(attendee.role.trim());
      }

      if (attendee.isHost) {
        hostedEvents.push(event);
      } else {
        attendingEvents.push(event);
      }
    }
  }

  if (!name) {
    return null;
  }

  return { key, userId, name, image, roles: [...roles], hostedEvents, attendingEvents };
}
