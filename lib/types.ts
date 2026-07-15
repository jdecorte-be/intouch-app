export type EventCategory =
  | 'featured'
  | 'art'
  | 'sport'
  | 'games'
  | 'social'
  | 'educational'
  | 'books'
  | 'workshops'
  | 'party'
  | 'comedy';

export type HostableCategory = Exclude<EventCategory, 'featured'>;

export type EventAttendee = {
  name: string;
  role: string;
  image?: string | null;
  isHost?: boolean;
  userId?: string;
};

export type EventItem = {
  id: string;
  kind: 'event' | 'group';
  title: string;
  description: string;
  venue: string;
  neighborhood: string;
  category: HostableCategory;
  icon: string;
  startsAt: string;
  startsAtKey?: string;
  price: string;
  going: number;
  capacity: number;
  hosts: string[];
  attendees: EventAttendee[];
  tags: string[];
  coordinates: [number, number];
  accent: string;
  bannerUrl?: string | null;
};

export type ActivityScope = 'popular' | 'groups' | 'events';

export type EventInterestState = {
  going: number;
  isInterested: boolean;
  isPending: boolean;
};

export type ChatMessage = {
  id: string;
  author: string;
  authorImage: string | null;
  fromSelf: boolean;
  text: string;
  sentAt: string;
};

export type ChatThread = {
  id: string;
  kind: 'event' | 'direct';
  title: string;
  subtitle: string;
  accent: string;
  initials: string;
  unreadCount: number;
  messages: ChatMessage[];
};

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  homeNeighborhood?: string | null;
  eventInterests: HostableCategory[];
  eventGoals: string[];
  memberSince: string;
};

export type SearchSuggestion =
  | { type: 'event'; event: EventItem }
  | {
      type: 'user';
      id: string;
      name: string;
      role: string;
      image?: string | null;
      event: EventItem;
      attendee: EventAttendee;
    };
