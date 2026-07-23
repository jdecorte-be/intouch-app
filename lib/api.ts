import type { OnboardingProfileChanges } from './onboarding';
import { palette } from './palette';
import type {
  ChatMessage,
  ChatThread,
  EventItem,
  HostableCategory,
  NotificationItem,
  NotificationKind,
  SessionUser,
} from './types';

// Single seam between the UI and the data source: every read/write goes
// through the retalk-api NestJS backend. Routes live at the API root
// (no /api/mobile prefix) — see ../retalk-api/src/*/*.controller.ts.

const NETWORK_DELAY_MS = 250;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://retalk.live';
export const GOOGLE_SIGN_IN_URL = `${API_BASE_URL}/auth/google?client=mobile`;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS));
}

export async function fetchEvents(): Promise<EventItem[]> {
  const response = await fetch(`${API_BASE_URL}/events`);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  return response.json();
}

type SerializedSessionUser = {
  id: string;
  name: string | null;
  email: string;
  age?: number | null;
  gender?: string | null;
  languagesSpoken?: string[] | null;
  image: string | null;
  photos?: string[] | null;
  homeNeighborhood: string | null;
  homeCoordinates?: [number, number] | null;
  eventInterests: string[];
  eventGoals: string[];
  memberSince: string;
  onboardingCompletedAt?: string | null;
};

function toSessionUser(user: SerializedSessionUser): SessionUser {
  return {
    id: user.id,
    name: user.name?.trim() || user.email.split('@')[0] || 'ReTalk Member',
    email: user.email,
    age: user.age ?? null,
    gender: (user.gender as SessionUser['gender']) ?? null,
    languagesSpoken: user.languagesSpoken ?? [],
    image: user.image,
    photos: user.photos ?? [],
    homeNeighborhood: user.homeNeighborhood,
    homeCoordinates: user.homeCoordinates ?? null,
    eventInterests: user.eventInterests as HostableCategory[],
    eventGoals: user.eventGoals,
    memberSince: user.memberSince,
    onboardingCompletedAt: user.onboardingCompletedAt ?? null,
  };
}

const authErrorMessages: Record<string, string> = {
  CredentialsMissing: 'Enter your email and password to continue.',
  CredentialsInvalid: 'That email and password combination is incorrect.',
  PasswordTooShort: 'Use a password with at least 8 characters.',
  EmailAlreadyRegistered: 'An account with that email already exists.',
  NoSession: 'Sign-in did not complete. Please try again.',
  OAuthNotConfigured: 'Google sign-in is not available right now.',
};

export class AuthApiError extends Error {
  code: string;

  constructor(code: string) {
    super(authErrorMessages[code] ?? 'Something went wrong. Please try again.');
    this.code = code;
  }
}

async function parseAuthResponse(response: Response): Promise<{ token: string; user: SessionUser }> {
  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.token || !body?.user) {
    throw new AuthApiError(body?.error ?? 'Unknown');
  }

  return { token: body.token, user: toSessionUser(body.user) };
}

export async function signInWithCredentials(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return parseAuthResponse(response);
}

export async function registerWithCredentials(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  return parseAuthResponse(response);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new AuthApiError(body?.error ?? 'Unknown');
  }
}

export async function completeGoogleSignIn(token: string) {
  const user = await fetchSession(token);

  if (!user) {
    throw new AuthApiError('NoSession');
  }

  return { token, user };
}

// Resolves the current user for a stored bearer token. Returns null only
// when the backend explicitly rejects the token (expired/revoked); network
// failures throw so callers can keep the locally cached session instead of
// signing the user out while offline.
export async function fetchSession(token: string | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }

  const body = await response.json();

  return body.user ? toSessionUser(body.user) : null;
}

// Persists onboarding answers to the user's account (retalk-api's
// PATCH /auth/onboarding) so completion is tracked server-side via
// onboardingCompletedAt, rather than only in local device storage — the
// same endpoint mobile's "edit profile" flow reuses to update these fields.
export async function completeOnboarding(
  token: string,
  changes: OnboardingProfileChanges,
): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      name: changes.name,
      age: changes.age ?? undefined,
      gender: changes.gender ?? undefined,
      languagesSpoken: changes.languagesSpoken,
      image: changes.image ?? undefined,
      photos: changes.photos,
      homeNeighborhood: changes.homeNeighborhood ?? undefined,
      homeLongitude: changes.homeCoordinates?.[0],
      homeLatitude: changes.homeCoordinates?.[1],
      eventInterests: changes.eventInterests,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save onboarding: ${response.status}`);
  }

  const body = await response.json();

  return toSessionUser(body.user);
}

export type MobileMe = {
  hostedEvents: EventItem[];
  hostedGroups: EventItem[];
  interestedEvents: EventItem[];
  interestedGroups: EventItem[];
};

// Bundles the signed-in user's own hosted events/groups and the ones
// they've marked interest in, for the profile screen.
export async function fetchMe(token: string): Promise<MobileMe> {
  const response = await fetch(`${API_BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch profile activity: ${response.status}`);
  }

  const body = await response.json();

  return {
    hostedEvents: body.hostedEvents ?? [],
    hostedGroups: body.hostedGroups ?? [],
    interestedEvents: body.interestedEvents ?? [],
    interestedGroups: body.interestedGroups ?? [],
  };
}

export async function signOutRemote(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

// The icon/color pairing for a notification is a presentation concern tied
// to its kind, not something the backend needs to own.
const notificationStyleByKind: Record<
  NotificationKind,
  { icon: NotificationItem['icon']; iconColor: string; iconBackground: string }
> = {
  comment: { icon: 'MessageCircleDots', iconColor: palette.primary, iconBackground: palette.primarySoft },
  generated: { icon: 'Sparkles', iconColor: palette.warnText, iconBackground: palette.warnSoft },
  invite: { icon: 'UserPlus', iconColor: palette.green, iconBackground: palette.tealSoft },
  like: { icon: 'Heart', iconColor: palette.coral, iconBackground: palette.coralSoft },
};

function toNotification(raw: any): NotificationItem {
  const style = notificationStyleByKind[raw.kind as NotificationKind];

  return {
    id: raw.id,
    actor: raw.actor,
    actorImage: raw.actorImage ?? null,
    time: raw.time,
    title: raw.title,
    detail: raw.detail ?? undefined,
    unread: Boolean(raw.unread),
    kind: raw.kind,
    eventId: raw.eventId ?? undefined,
    icon: style.icon,
    iconColor: style.iconColor,
    iconBackground: style.iconBackground,
    inviteStatus: raw.inviteStatus,
  };
}

export async function fetchNotifications(token: string): Promise<NotificationItem[]> {
  const response = await fetch(`${API_BASE_URL}/notifications`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const body = await response.json();
  const notifications = body.notifications ?? body;

  return (notifications as any[]).map(toNotification);
}

export async function markNotificationRead(token: string, id: string): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: authHeaders(token),
  });
}

export async function markAllNotificationsRead(token: string): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function toggleEventInterest(
  _eventId: string,
  next: { going: number; isInterested: boolean },
): Promise<{ going: number; isInterested: boolean }> {
  return delay(next);
}

function initialsFrom(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// The mobile chat endpoints return thread/message objects that are already
// shaped close to ChatThread/ChatMessage; these mappers just fill in
// client-only fallbacks (initials, accent) so the rest of the app never has
// to guard against missing fields.
function toChatMessage(raw: any): ChatMessage {
  return {
    id: raw.id,
    author: raw.author,
    authorId: raw.authorId ?? null,
    authorImage: raw.authorImage ?? null,
    fromSelf: Boolean(raw.fromSelf),
    text: raw.text,
    image: raw.image ?? null,
    sentAt: raw.sentAt,
    kind: raw.kind === 'system' ? 'system' : 'text',
    reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
  };
}

// retalk-api's ChatThreadView doesn't include eventId, but it mints event
// thread ids as `event-chat-${eventId}` (see ChatsService.joinEventChatForUser),
// so it can be recovered from the id for kind: 'event' threads.
function eventIdFromThreadId(raw: any): string | undefined {
  if (raw.eventId) {
    return raw.eventId;
  }

  if (raw.kind === 'event' && typeof raw.id === 'string' && raw.id.startsWith('event-chat-')) {
    return raw.id.slice('event-chat-'.length);
  }

  return undefined;
}

function toChatThread(raw: any): ChatThread {
  const title: string = raw.title;

  return {
    id: raw.id,
    kind: raw.kind,
    title,
    subtitle: raw.subtitle ?? '',
    accent: raw.accent ?? '#5b6b82',
    initials: raw.initials ?? initialsFrom(title),
    icon: raw.icon ?? undefined,
    avatarImage: raw.avatarImage ?? null,
    unreadCount: raw.unreadCount ?? 0,
    pinned: raw.pinned,
    tags: raw.tags,
    eventId: eventIdFromThreadId(raw),
    participants: Array.isArray(raw.participants)
      ? raw.participants.map((participant: any) => ({
          id: participant.id,
          name: participant.name,
          image: participant.image ?? null,
        }))
      : [],
    participantCount: raw.participantCount ?? raw.participants?.length ?? 0,
    messages: Array.isArray(raw.messages) ? raw.messages.map(toChatMessage) : [],
  };
}

export async function fetchChatThreads(token: string): Promise<ChatThread[]> {
  const response = await fetch(`${API_BASE_URL}/chats`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chats: ${response.status}`);
  }

  const body = await response.json();
  const threads = body.chats ?? body.threads ?? body;

  return (threads as any[]).map(toChatThread);
}

export async function fetchChatThread(threadId: string, token: string): Promise<ChatThread> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}`, {
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat: ${response.status}`);
  }

  const body = await response.json();
  const thread = body.chat ?? body.thread ?? body;
  const messages = body.messages ?? thread.messages ?? [];

  return toChatThread({ ...thread, messages });
}

export async function joinEventChat(event: EventItem, token: string): Promise<ChatThread> {
  const response = await fetch(`${API_BASE_URL}/chats/join`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ eventId: event.id }),
  });

  if (!response.ok) {
    throw new Error(`Failed to join event chat: ${response.status}`);
  }

  const body = await response.json();
  const thread = body.chat ?? body.thread ?? body;

  return toChatThread({
    kind: 'event',
    title: event.title,
    subtitle: `${event.going} members · ${event.neighborhood}`,
    accent: event.accent,
    icon: event.icon,
    eventId: event.id,
    ...thread,
  });
}

export async function startDirectChat(
  memberName: string,
  memberUserId: string,
  token: string,
  eventId?: string,
): Promise<ChatThread> {
  // retalk-api's StartDirectChatDto requires eventId (direct chats are
  // always scoped to the event that introduced the two members).
  if (!eventId) {
    throw new Error('Starting a direct message requires an event to message about.');
  }

  const response = await fetch(`${API_BASE_URL}/chats/direct`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ member: memberName, memberUserId, eventId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to start chat: ${response.status}`);
  }

  const body = await response.json();
  const thread = body.chat ?? body.thread ?? body;

  return toChatThread({
    kind: 'direct',
    title: memberName,
    subtitle: 'Direct message',
    ...thread,
  });
}

export async function sendChatMessage(
  chatId: string,
  text: string,
  token: string,
  image?: string | null,
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, image: image ?? undefined }),
  });

  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status}`);
  }

  const body = await response.json();
  // retalk-api's send-message endpoint returns the whole updated thread
  // rather than the single new message, so pull the last message off it —
  // messages come back ordered oldest-first, and this request just added one.
  const thread = body.chat ?? body.thread ?? body;
  const messages = Array.isArray(thread.messages) ? thread.messages : [];

  return toChatMessage(messages[messages.length - 1]);
}

export async function markChatThreadRead(threadId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/read`, {
    method: 'POST',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark chat read: ${response.status}`);
  }
}

export async function toggleChatMessageReaction(
  threadId: string,
  messageId: string,
  emoji: string,
  token: string,
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/messages/${messageId}/reactions`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ emoji }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update reaction: ${response.status}`);
  }

  const body = await response.json();
  const thread = body.chat ?? body.thread ?? body;
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  const message = messages.find((candidate: any) => candidate.id === messageId);

  if (!message) {
    throw new Error('Failed to update reaction: message missing from response');
  }

  return toChatMessage(message);
}

export async function leaveChatThread(threadId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/leave`, {
    method: 'POST',
    headers: authHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to leave chat: ${response.status}`);
  }
}
