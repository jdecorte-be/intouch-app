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
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.retalk.live';

// SuperTokens' default REST contract (supertokens-node, apiBasePath "/auth").
// Session tokens are attached to every fetch() call automatically by the
// global fetch patch installed in lib/supertokens.ts — nothing here passes
// a bearer token by hand.

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
    name: user.name?.trim() || user.email.split('@')[0] || 'InTouch Member',
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

// Status codes come straight off SuperTokens' emailpassword/thirdparty/session
// recipe responses (see https://supertokens.com/docs custom UI guides).
const authErrorMessages: Record<string, string> = {
  WRONG_CREDENTIALS_ERROR: 'That email and password combination is incorrect.',
  FIELD_ERROR: 'Check the highlighted field and try again.',
  SIGN_IN_UP_NOT_ALLOWED: 'This account cannot sign in right now. Please contact support.',
  RESET_PASSWORD_INVALID_TOKEN_ERROR: 'This reset link is invalid or has expired.',
  NO_EMAIL_GIVEN_BY_PROVIDER_ERROR: 'Google did not share an email address for that account.',
  NoSession: 'Sign-in did not complete. Please try again.',
  OAuthNotConfigured: 'Google sign-in is not available right now.',
  Unknown: 'Something went wrong. Please try again.',
};

export class AuthApiError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? authErrorMessages[code] ?? authErrorMessages.Unknown);
    this.code = code;
  }
}

type FormField = { id: string; value: string };
type SuperTokensUser = { id: string; emails?: string[] };

// POSTs to SuperTokens' emailpassword /signup or /signin routes. On success
// the backend's response sets the session tokens, which the global fetch
// patch (lib/supertokens.ts) picks up automatically — the caller still has
// to follow up with fetchSession() to get the app's enriched profile, since
// the SuperTokens user object only carries id/emails.
async function submitEmailPasswordForm(
  path: 'signup' | 'signin',
  formFields: FormField[],
): Promise<SuperTokensUser> {
  const response = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formFields }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body) {
    throw new AuthApiError('Unknown');
  }

  if (body.status === 'FIELD_ERROR') {
    throw new AuthApiError('FIELD_ERROR', body.formFields?.[0]?.error);
  }

  if (body.status !== 'OK') {
    throw new AuthApiError(body.status ?? 'Unknown');
  }

  return body.user;
}

export async function signInWithCredentials(email: string, password: string): Promise<SessionUser> {
  await submitEmailPasswordForm('signin', [
    { id: 'email', value: email },
    { id: 'password', value: password },
  ]);

  const user = await fetchSession();

  if (!user) {
    throw new AuthApiError('NoSession');
  }

  return user;
}

export async function registerWithCredentials(
  name: string,
  email: string,
  password: string,
): Promise<SessionUser> {
  await submitEmailPasswordForm('signup', [
    { id: 'name', value: name },
    { id: 'email', value: email },
    { id: 'password', value: password },
  ]);

  const user = await fetchSession();

  if (!user) {
    throw new AuthApiError('NoSession');
  }

  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/user/password/reset/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formFields: [{ id: 'email', value: email }] }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body) {
    throw new AuthApiError('Unknown');
  }

  if (body.status === 'FIELD_ERROR') {
    throw new AuthApiError('FIELD_ERROR', body.formFields?.[0]?.error);
  }
}

export type GoogleAuthorisationUrl = {
  url: string;
  // Google's authorisation URL SuperTokens builds includes a PKCE
  // code_challenge, so the code_verifier below must be sent back
  // unchanged to /auth/signinup or Google's token exchange fails with
  // "Missing code verifier".
  pkceCodeVerifier?: string;
};

// Kicks off SuperTokens' thirdparty flow: asks the backend for the Google
// authorisation URL (it holds the client id/secret) so the app never sees
// them, then the caller opens it in a WebBrowser auth session.
export async function getGoogleAuthorisationUrl(
  redirectURIOnProviderDashboard: string,
): Promise<GoogleAuthorisationUrl> {
  const response = await fetch(
    `${API_BASE_URL}/auth/authorisationurl?thirdPartyId=google&redirectURIOnProviderDashboard=${encodeURIComponent(redirectURIOnProviderDashboard)}`,
  );

  const body = await response.json().catch(() => null);

  if (!response.ok || body?.status !== 'OK' || !body.urlWithQueryParams) {
    throw new AuthApiError('OAuthNotConfigured');
  }

  return {
    url: body.urlWithQueryParams as string,
    pkceCodeVerifier: body.pkceCodeVerifier as string | undefined,
  };
}

async function signInUpWithGoogle(body: Record<string, unknown>): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/signinup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thirdPartyId: 'google', ...body }),
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok || responseBody?.status !== 'OK') {
    throw new AuthApiError(responseBody?.status ?? 'Unknown');
  }

  const user = await fetchSession();

  if (!user) {
    throw new AuthApiError('NoSession');
  }

  return user;
}

// Finishes the thirdparty flow by handing the provider's callback query
// params (code, state, ...) to SuperTokens' /signinup route.
export async function completeGoogleSignIn(
  redirectURIOnProviderDashboard: string,
  redirectURIQueryParams: Record<string, string>,
  pkceCodeVerifier?: string,
): Promise<SessionUser> {
  return signInUpWithGoogle({
    redirectURIInfo: {
      redirectURIOnProviderDashboard,
      redirectURIQueryParams,
      ...(pkceCodeVerifier ? { pkceCodeVerifier } : {}),
    },
  });
}

// Finishes native Google Sign-In (see lib/google-signin.ts) by handing the
// ID token straight to SuperTokens' /signinup route — no authorisation URL
// or redirect dance needed since the token comes from the on-device SDK.
export async function completeGoogleSignInWithIdToken(idToken: string): Promise<SessionUser> {
  return signInUpWithGoogle({ oAuthTokens: { id_token: idToken } });
}

// Resolves the current user from the app's own session endpoint. Returns
// null only when the backend explicitly says there's no session (401);
// network failures throw so callers can keep the locally cached session
// instead of signing the user out while offline.
export async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch(`${API_BASE_URL}/auth/session`);

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
export async function completeOnboarding(changes: OnboardingProfileChanges): Promise<SessionUser> {
  const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
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
export async function fetchMe(): Promise<MobileMe> {
  const response = await fetch(`${API_BASE_URL}/me`);

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

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const response = await fetch(`${API_BASE_URL}/notifications`);

  if (!response.ok) {
    throw new Error(`Failed to fetch notifications: ${response.status}`);
  }

  const body = await response.json();
  const notifications = body.notifications ?? body;

  return (notifications as any[]).map(toNotification);
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: jsonHeaders(),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'POST',
    headers: jsonHeaders(),
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

function jsonHeaders() {
  return { 'Content-Type': 'application/json' };
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

export async function fetchChatThreads(): Promise<ChatThread[]> {
  const response = await fetch(`${API_BASE_URL}/chats`);

  if (!response.ok) {
    throw new Error(`Failed to fetch chats: ${response.status}`);
  }

  const body = await response.json();
  const threads = body.chats ?? body.threads ?? body;

  return (threads as any[]).map(toChatThread);
}

export async function fetchChatThread(threadId: string): Promise<ChatThread> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch chat: ${response.status}`);
  }

  const body = await response.json();
  const thread = body.chat ?? body.thread ?? body;
  const messages = body.messages ?? thread.messages ?? [];

  return toChatThread({ ...thread, messages });
}

export async function joinEventChat(event: EventItem): Promise<ChatThread> {
  const response = await fetch(`${API_BASE_URL}/chats/join`, {
    method: 'POST',
    headers: jsonHeaders(),
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
  eventId?: string,
): Promise<ChatThread> {
  // retalk-api's StartDirectChatDto requires eventId (direct chats are
  // always scoped to the event that introduced the two members).
  if (!eventId) {
    throw new Error('Starting a direct message requires an event to message about.');
  }

  const response = await fetch(`${API_BASE_URL}/chats/direct`, {
    method: 'POST',
    headers: jsonHeaders(),
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
  image?: string | null,
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
    method: 'POST',
    headers: jsonHeaders(),
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

export async function markChatThreadRead(threadId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/read`, {
    method: 'POST',
    headers: jsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark chat read: ${response.status}`);
  }
}

export async function toggleChatMessageReaction(
  threadId: string,
  messageId: string,
  emoji: string,
): Promise<ChatMessage> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/messages/${messageId}/reactions`, {
    method: 'POST',
    headers: jsonHeaders(),
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

export async function leaveChatThread(threadId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chats/${threadId}/leave`, {
    method: 'POST',
    headers: jsonHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to leave chat: ${response.status}`);
  }
}
