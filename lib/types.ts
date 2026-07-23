import type { ImageSource } from 'expo-image';

import type { IconlyIconName } from '@/components/icons/iconly-types';

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

export type ChatMessageReaction = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type ChatMessage = {
  id: string;
  author: string;
  authorId?: string | null;
  authorImage: string | null;
  fromSelf: boolean;
  text: string;
  image?: string | null;
  sentAt: string;
  kind?: 'text' | 'system';
  reactions?: ChatMessageReaction[];
};

export type ChatParticipant = {
  id: string;
  name: string;
  image: string | null;
};

export type StatusUpdate = {
  id: string;
  name: string;
  image?: string | null;
  postedAt: string;
  isSelf?: boolean;
};

export type ChatFilterTag = 'favorites' | 'work' | 'community';

export type ChatThread = {
  id: string;
  kind: 'event' | 'direct';
  title: string;
  subtitle: string;
  accent: string;
  initials: string;
  icon?: string;
  avatarImage?: ImageSource | string | number | null;
  unreadCount: number;
  pinned?: boolean;
  tags?: ChatFilterTag[];
  eventId?: string;
  participants: ChatParticipant[];
  participantCount: number;
  messages: ChatMessage[];
};

export type Gender = 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  age?: number | null;
  gender?: Gender | null;
  languagesSpoken: string[];
  image?: string | null;
  photos: string[];
  homeNeighborhood?: string | null;
  homeCoordinates?: [number, number] | null;
  eventInterests: HostableCategory[];
  eventGoals: string[];
  memberSince: string;
  onboardingCompletedAt?: string | null;
};

export type NotificationKind = 'comment' | 'generated' | 'invite' | 'like';

export type NotificationInviteStatus = 'pending' | 'accepted' | 'declined';

export type NotificationItem = {
  id: string;
  actor: string;
  actorImage?: string | null;
  time: string;
  title: string;
  detail?: string;
  unread: boolean;
  kind: NotificationKind;
  eventId?: string;
  icon: IconlyIconName;
  iconColor: string;
  iconBackground: string;
  inviteStatus?: NotificationInviteStatus;
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
