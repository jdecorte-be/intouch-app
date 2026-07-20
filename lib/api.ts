import { formatChatTimestamp } from './date-utils';
import { mockChatThreads, mockNotifications } from './mock-data';
import type { ChatMessage, ChatThread, EventItem, HostableCategory, NotificationItem, SessionUser } from './types';

// Single seam between the UI and the data source. Events/groups and auth come
// from the retalk.live Next.js backend; everything else still serves mock
// data until its own endpoint lands, and the stores/screens stay untouched
// either way.

const NETWORK_DELAY_MS = 250;
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://retalk.live';
export const GOOGLE_SIGN_IN_URL = `${API_BASE_URL}/api/mobile/auth/google`;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), NETWORK_DELAY_MS));
}

export async function fetchEvents(): Promise<EventItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/events`);

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.status}`);
  }

  return response.json();
}

type SerializedSessionUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  homeNeighborhood: string | null;
  eventInterests: string[];
  eventGoals: string[];
  memberSince: string;
};

function toSessionUser(user: SerializedSessionUser): SessionUser {
  return {
    id: user.id,
    name: user.name?.trim() || user.email.split('@')[0] || 'ReTalk Member',
    email: user.email,
    image: user.image,
    homeNeighborhood: user.homeNeighborhood,
    eventInterests: user.eventInterests as HostableCategory[],
    eventGoals: user.eventGoals,
    memberSince: user.memberSince,
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
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return parseAuthResponse(response);
}

export async function registerWithCredentials(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  return parseAuthResponse(response);
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

  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/session`, {
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

export type MobileMe = {
  hostedEvents: EventItem[];
  hostedGroups: EventItem[];
  interestedEvents: EventItem[];
  interestedGroups: EventItem[];
};

// Bundles the signed-in user's own hosted events/groups and the ones
// they've marked interest in, for the profile screen.
export async function fetchMe(token: string): Promise<MobileMe> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/me`, {
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
  await fetch(`${API_BASE_URL}/api/mobile/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

export async function fetchChatThreads(): Promise<ChatThread[]> {
  return delay(mockChatThreads);
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  return delay(mockNotifications);
}

export async function toggleEventInterest(
  _eventId: string,
  next: { going: number; isInterested: boolean },
): Promise<{ going: number; isInterested: boolean }> {
  return delay(next);
}

export async function joinEventChat(event: EventItem): Promise<ChatThread> {
  return delay({
    id: `event-chat-${event.id}`,
    kind: 'event' as const,
    title: event.title,
    subtitle: `${event.going} members · ${event.neighborhood}`,
    accent: event.accent,
    initials: event.title
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
    unreadCount: 0,
    messages: [],
  });
}

export async function startDirectChat(
  memberName: string,
  memberUserId: string,
): Promise<ChatThread> {
  return delay({
    id: `direct-${memberUserId}`,
    kind: 'direct' as const,
    title: memberName,
    subtitle: 'Direct message',
    accent: '#5b6b82',
    initials: memberName
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? '')
      .join(''),
    unreadCount: 0,
    messages: [],
  });
}

export async function sendChatMessage(
  chatId: string,
  text: string,
  author: string,
): Promise<ChatMessage> {
  return delay({
    id: `${chatId}-${Date.now()}`,
    author,
    authorImage: null,
    fromSelf: true,
    text,
    sentAt: formatChatTimestamp(new Date()),
  });
}
