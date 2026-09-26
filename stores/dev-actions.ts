// Helpers behind the in-app testing menu. Nothing here is imported by
// production code: app/_layout.tsx loads the menu only when __DEV__ is true,
// so Metro leaves this file out of release bundles.
import SuperTokens from 'supertokens-react-native';

import { palette } from '@/lib/palette';
import type {
  ChatMessage,
  ChatParticipant,
  ChatThread,
  NotificationItem,
  NotificationKind,
  SessionUser,
} from '@/lib/types';
import { useChatStore } from '@/stores/chat-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useSessionStore } from '@/stores/session-store';

// ---- Test account -------------------------------------------------------

const testUser: SessionUser = {
  id: 'test-user-local',
  name: 'Test User',
  email: 'test@intouch.local',
  age: 27,
  gender: 'prefer-not-to-say',
  languagesSpoken: ['English'],
  image: null,
  photos: [],
  homeNeighborhood: 'Queen West',
  homeCoordinates: null,
  eventInterests: ['social', 'music-nightlife', 'arts-culture'],
  eventGoals: ['meet-new-people', 'go-out-tonight'],
  memberSince: 'July 2026',
};

const emptyActivity = {
  hostedEvents: [],
  hostedGroups: [],
  interestedEvents: [],
  interestedGroups: [],
};

// Signs in as the local, token-less test user with onboarding already done.
export function testSignIn() {
  const { completedOnboardingUserIds, profileOverrides } = useSessionStore.getState();

  useSessionStore.setState({
    hasSession: false,
    user: { ...testUser, ...profileOverrides[testUser.id] },
    completedOnboardingUserIds: completedOnboardingUserIds.includes(testUser.id)
      ? completedOnboardingUserIds
      : [...completedOnboardingUserIds, testUser.id],
    ...emptyActivity,
  });
}

// Drops back to the pre-login welcome flow.
export function testStartWelcomeOnboarding() {
  const hadSession = useSessionStore.getState().hasSession;

  useSessionStore.setState({
    user: null,
    hasSession: false,
    hasSeenWelcome: false,
    ...emptyActivity,
  });

  if (hadSession) {
    void SuperTokens.signOut().catch(() => {});
  }
}

// Resets the test user to a blank, incomplete profile so the onboarding flow
// can be replayed on demand instead of only once per new account.
export function testSignInForOnboarding() {
  const { profileOverrides, completedOnboardingUserIds } = useSessionStore.getState();
  const { [testUser.id]: _removedOverride, ...remainingOverrides } = profileOverrides;

  useSessionStore.setState({
    hasSession: false,
    user: {
      ...testUser,
      name: '',
      age: null,
      gender: null,
      languagesSpoken: [],
      image: null,
      photos: [],
      homeNeighborhood: null,
      homeCoordinates: null,
      eventInterests: [],
      onboardingCompletedAt: null,
    },
    profileOverrides: remainingOverrides,
    completedOnboardingUserIds: completedOnboardingUserIds.filter((id) => id !== testUser.id),
    ...emptyActivity,
  });
}

// ---- Chat ---------------------------------------------------------------

const randomJoinParticipants: ChatParticipant[] = [
  { id: 'test-join-maya-chen', name: 'Maya Chen', image: null },
  { id: 'test-join-jordan-patel', name: 'Jordan Patel', image: null },
  { id: 'test-join-sam-rivera', name: 'Sam Rivera', image: null },
  { id: 'test-join-aisha-khan', name: 'Aisha Khan', image: null },
  { id: 'test-join-noah-williams', name: 'Noah Williams', image: null },
  { id: 'test-join-zoe-martin', name: 'Zoe Martin', image: null },
  { id: 'test-join-leo-thompson', name: 'Leo Thompson', image: null },
  { id: 'test-join-priya-shah', name: 'Priya Shah', image: null },
];

function createOverflowParticipant(chatId: string, index: number): ChatParticipant {
  return {
    id: `test-join-${chatId}-${Date.now()}-${index}`,
    name: `Guest ${index + 1}`,
    image: null,
  };
}

// Adds a made-up member to a chat, with a system message announcing them.
export function addRandomParticipantToChat(chatId: string) {
  useChatStore.setState((state) => {
    const thread = state.threads.find((candidate) => candidate.id === chatId);

    if (!thread) {
      return state;
    }

    const existingIds = new Set(thread.participants.map((participant) => participant.id));
    const availableParticipants = randomJoinParticipants.filter(
      (participant) => !existingIds.has(participant.id),
    );
    const nextParticipant =
      availableParticipants[Math.floor(Math.random() * availableParticipants.length)] ??
      createOverflowParticipant(chatId, thread.participants.length);
    const nextParticipants = [...thread.participants, nextParticipant];
    const joinMessage: ChatMessage = {
      id: `${chatId}-join-${nextParticipant.id}-${Date.now()}`,
      author: nextParticipant.name,
      authorId: nextParticipant.id,
      authorImage: nextParticipant.image,
      fromSelf: false,
      text: `${nextParticipant.name} joined the chat.`,
      sentAt: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      kind: 'system',
      reactions: [],
    };
    const updatedThread: ChatThread = {
      ...thread,
      participants: nextParticipants,
      participantCount: Math.max(thread.participantCount + 1, nextParticipants.length),
      messages: [...thread.messages, joinMessage],
    };

    return {
      threads: state.threads.map((candidate) => (candidate.id === chatId ? updatedThread : candidate)),
    };
  });
}

// ---- Notifications ------------------------------------------------------

const testNotificationActors = ['Maya Chen', 'Jordan Patel', 'Sam Rivera', 'Aisha Khan', 'Noah Williams'];

const testNotificationStyleByKind: Record<
  NotificationKind,
  { icon: NotificationItem['icon']; iconColor: string; iconBackground: string }
> = {
  comment: { icon: 'MessageCircleDots', iconColor: palette.primary, iconBackground: palette.primarySoft },
  generated: { icon: 'Sparkles', iconColor: palette.warnText, iconBackground: palette.warnSoft },
  invite: { icon: 'UserPlus', iconColor: palette.green, iconBackground: palette.tealSoft },
  like: { icon: 'Heart', iconColor: palette.coral, iconBackground: palette.coralSoft },
};

function createTestNotification(kind: NotificationKind, eventId?: string): NotificationItem {
  const actor = testNotificationActors[Math.floor(Math.random() * testNotificationActors.length)]!;
  const style = testNotificationStyleByKind[kind];
  const id = `test-notification-${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const copyByKind: Record<NotificationKind, Pick<NotificationItem, 'title' | 'detail'>> = {
    comment: {
      title: 'commented on your event chat.',
      detail: 'New reply in the conversation.',
    },
    generated: {
      title: 'Your event summary is ready.',
      detail: 'Open notifications to review the generated update.',
    },
    invite: {
      title: 'invited you to join a plan.',
      detail: 'Respond to the invitation from notifications.',
    },
    like: {
      title: 'liked your event plan.',
      detail: 'Someone is interested in what you are hosting.',
    },
  };

  return {
    id,
    actor,
    time: 'Just now',
    unread: true,
    kind,
    eventId,
    inviteStatus: kind === 'invite' ? 'pending' : undefined,
    ...style,
    ...copyByKind[kind],
  };
}

export function sendTestNotification(kind: NotificationKind, eventId?: string) {
  useNotificationsStore.setState((state) => ({
    notifications: [createTestNotification(kind, eventId), ...state.notifications],
    hasLoaded: true,
  }));
}
