import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/lib/api';
import { palette } from '@/lib/palette';
import { zustandStorage } from '@/lib/storage';
import type { NotificationInviteStatus, NotificationItem, NotificationKind } from '@/lib/types';
import { useSessionStore } from '@/stores/session-store';

type NotificationsState = {
  notifications: NotificationItem[];
  hasLoaded: boolean;

  loadNotifications: () => Promise<void>;
  markRead: (id: string) => void;
  markAllRead: () => void;
  respondToInvite: (id: string, status: NotificationInviteStatus) => void;
  sendTestNotification: (kind: NotificationKind, eventId?: string) => void;
};

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

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      hasLoaded: false,

      loadNotifications: async () => {
        if (get().hasLoaded) {
          return;
        }

        const hasSession = useSessionStore.getState().hasSession;

        if (!hasSession) {
          set({ hasLoaded: true });
          return;
        }

        try {
          const notifications = await api.fetchNotifications();
          set({ notifications, hasLoaded: true });
        } catch {
          set({ hasLoaded: true });
        }
      },

      markRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id && item.unread ? { ...item, unread: false } : item,
          ),
        }));

        const hasSession = useSessionStore.getState().hasSession;

        if (hasSession) {
          api.markNotificationRead(id).catch(() => {});
        }
      },

      markAllRead: () => {
        set((state) => ({
          notifications: state.notifications.map((item) => (item.unread ? { ...item, unread: false } : item)),
        }));

        const hasSession = useSessionStore.getState().hasSession;

        if (hasSession) {
          api.markAllNotificationsRead().catch(() => {});
        }
      },

      respondToInvite: (id, status) =>
        set((state) => ({
          notifications: state.notifications.map((item) =>
            item.id === id ? { ...item, unread: false, inviteStatus: status } : item,
          ),
        })),

      sendTestNotification: (kind, eventId) =>
        set((state) => ({
          notifications: [createTestNotification(kind, eventId), ...state.notifications],
          hasLoaded: true,
        })),
    }),
    {
      name: 'retalk-notifications',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ notifications: state.notifications, hasLoaded: state.hasLoaded }),
    },
  ),
);

export function selectUnreadNotificationCount(state: NotificationsState) {
  return state.notifications.reduce((total, item) => total + (item.unread ? 1 : 0), 0);
}
