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
  reset: () => void;
};

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

      reset: () => set({ notifications: [], hasLoaded: false }),
    }),
    {
      name: 'intouch-notifications',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({ notifications: state.notifications, hasLoaded: state.hasLoaded }),
    },
  ),
);

export function selectUnreadNotificationCount(state: NotificationsState) {
  return state.notifications.reduce((total, item) => total + (item.unread ? 1 : 0), 0);
}
